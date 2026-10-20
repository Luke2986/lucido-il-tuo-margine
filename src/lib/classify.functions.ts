// Classificazione AI dei costi. Gira solo sul server (funzione Vercel o server Node):
// la chiave AI_API_KEY non arriva mai al browser. Provider: qualsiasi API compatibile OpenAI.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AiClassification } from "./store";

const GEMINI_OPENAI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const BATCH_SIZE = 40;
const MAX_COSTS = 200;
const RATE_LIMIT = { requests: 10, windowMs: 60 * 60 * 1000 };

const inputSchema = z.object({
  company: z.object({ name: z.string().max(200), sector: z.string().max(200) }),
  clients: z
    .array(
      z.object({
        id: z.string().max(100),
        name: z.string().max(200),
        kind: z.enum(["cliente", "commessa"]),
      }),
    )
    .max(200),
  costs: z
    .array(
      z.object({
        id: z.string().max(100),
        date: z.string().max(10),
        description: z.string().max(500),
        counterparty: z.string().max(200),
        amount: z.number(),
        invoiceNumber: z.string().max(50).optional(),
      }),
    )
    .min(1)
    .max(MAX_COSTS),
});

const itemSchema = z.object({
  transaction_id: z.string(),
  cost_type: z.enum(["fisso", "variabile", "non_costo"]),
  client_id: z.string().nullable().optional(),
  confidence: z.coerce.number(),
  rationale: z.string().optional(),
});

// Limite semplice per IP, per istanza del server: basta a frenare gli abusi della demo pubblica.
const hits = new Map<string, number[]>();
function checkRateLimit(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.requests) {
    throw new Error("Troppe richieste di classificazione: riprova tra un'ora.");
  }
  recent.push(now);
  hits.set(key, recent);
}

function systemPrompt(company: { name: string; sector: string }) {
  const who = company.name
    ? ` ("${company.name}"${company.sector ? `, settore ${company.sector}` : ""})`
    : "";
  return `Sei un assistente di controllo di gestione per una piccola SRL italiana di servizi B2B${who}.

Devi classificare costi aziendali in italiano.

Definizioni:
- VARIABILE: costo che varia col volume/commessa (freelance su progetto, materiali, subappalti, trasferte legate a progetti).
- FISSO: costo di struttura (affitto, stipendi fissi, software ricorrenti, utenze, commercialista).
- NON_COSTO: IVA, imposte, giroconti, rimborsi finanziamenti, movimenti finanziari non economici.

Per ogni costo, se è chiaramente attribuibile a un cliente/commessa fornito (per nome del fornitore, descrizione, riferimenti), indica il suo client_id; altrimenti null (costo comune/non attribuibile).

Restituisci confidence in [0,1] e una rationale breve in italiano che spieghi "perché questo numero" (max 200 caratteri).`;
}

async function callAI(system: string, payload: unknown): Promise<unknown[]> {
  const key = process.env.AI_API_KEY;
  if (!key)
    throw new Error(
      "Classificazione AI non configurata: imposta la variabile AI_API_KEY sul server.",
    );
  const res = await fetch(process.env.AI_API_URL ?? GEMINI_OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            'Classifica i seguenti costi. Rispondi SOLO con un array JSON valido, senza testo introduttivo, senza markdown, senza backtick. Schema di ogni elemento: {"transaction_id":string,"cost_type":"fisso"|"variabile"|"non_costo","client_id":string|null,"confidence":number (0..1),"rationale":string}. Dati:\n' +
            JSON.stringify(payload),
        },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Limite del provider AI raggiunto, riprova tra poco.");
  if (!res.ok) throw new Error(`Provider AI: errore ${res.status}.`);
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < 0) throw new Error("Risposta AI non leggibile.");
  const arr = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("Risposta AI non valida.");
  return arr;
}

export const classifyCosts = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }): Promise<{ items: AiClassification[]; skipped: number }> => {
    const { getRequestIP } = await import("@tanstack/react-start/server");
    checkRateLimit(getRequestIP({ xForwardedFor: true }) ?? "sconosciuto");

    const system = systemPrompt(data.company);
    const clientIds = new Set(data.clients.map((c) => c.id));
    const items: AiClassification[] = [];
    let skipped = 0;

    for (let i = 0; i < data.costs.length; i += BATCH_SIZE) {
      const batch = data.costs.slice(i, i + BATCH_SIZE);
      const batchIds = new Set(batch.map((c) => c.id));
      const raw = await callAI(system, {
        clients: data.clients,
        costs: batch.map((c) => ({
          transaction_id: c.id,
          date: c.date,
          description: c.description,
          counterparty: c.counterparty,
          amount: c.amount,
          invoice_number: c.invoiceNumber ?? null,
        })),
      });
      for (const r of raw) {
        const parsed = itemSchema.safeParse(r);
        if (!parsed.success || !batchIds.has(parsed.data.transaction_id)) {
          skipped++;
          continue;
        }
        const it = parsed.data;
        items.push({
          id: it.transaction_id,
          costType: it.cost_type,
          clientId: it.client_id && clientIds.has(it.client_id) ? it.client_id : null,
          confidence: Math.max(0, Math.min(1, it.confidence || 0)),
          rationale: (it.rationale ?? "").slice(0, 500),
        });
      }
    }
    return { items, skipped };
  });
