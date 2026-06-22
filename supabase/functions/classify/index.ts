// Edge function "classify" — classificazione costi via Anthropic (Claude)
// Chiamata diretta ad api.anthropic.com (NON usa il gateway Lovable AI).
// Input: POST { companyId: string }. Richiede JWT utente (membership su companyId).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const BATCH_SIZE = 40;

type CostType = "fisso" | "variabile" | "non_costo";

interface ClassifyItem {
  transaction_id: string;
  cost_type: CostType;
  client_id: string | null;
  confidence: number;
  rationale: string;
}

function band(c: number, hi: number, mid: number): "alta" | "media" | "bassa" {
  if (c >= hi) return "alta";
  if (c >= mid) return "media";
  return "bassa";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

async function callAnthropic(
  apiKey: string,
  system: string,
  userPayload: unknown,
): Promise<ClassifyItem[]> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [
        {
          role: "user",
          content:
            "Classifica i seguenti costi. Rispondi SOLO con un array JSON valido, senza testo introduttivo, senza markdown, senza backtick. Schema di ogni elemento: {\"transaction_id\":string,\"cost_type\":\"fisso\"|\"variabile\"|\"non_costo\",\"client_id\":string|null,\"confidence\":number (0..1),\"rationale\":string}. Dati:\n" +
            JSON.stringify(userPayload),
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t}`);
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end < 0) throw new Error("Risposta AI non parsabile");
  const arr = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("Risposta AI non è array");
  return arr as ClassifyItem[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return json(
        { error: "ANTHROPIC_API_KEY non configurata nei secret." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { companyId } = await req.json().catch(() => ({}));
    if (!companyId || typeof companyId !== "string") {
      return json({ error: "companyId richiesto" }, 400);
    }

    // Client per identificare l'utente dal JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // Service client per dati + scritture
    const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verifica membership
    const { data: mem, error: memErr } = await svc
      .from("memberships")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (memErr) return json({ error: memErr.message }, 500);
    if (!mem) return json({ error: "Forbidden" }, 403);

    // Carica company, settings, clients
    const [{ data: company }, { data: settings }, { data: clients }] =
      await Promise.all([
        svc.from("companies").select("name, sector").eq("id", companyId).maybeSingle(),
        svc.from("settings").select("threshold_high, threshold_medium").eq("company_id", companyId).maybeSingle(),
        svc.from("clients").select("id, name, kind").eq("company_id", companyId),
      ]);

    const hi = Number(settings?.threshold_high ?? 0.85);
    const mid = Number(settings?.threshold_medium ?? 0.6);

    // Carica costi della company
    const { data: costs, error: txErr } = await svc
      .from("transactions")
      .select("id, entry_date, description, counterparty, amount, invoice_number")
      .eq("company_id", companyId)
      .eq("direction", "costo");
    if (txErr) return json({ error: txErr.message }, 500);

    // Carica classifications esistenti per filtrare
    const ids = (costs ?? []).map((c) => c.id);
    let existing: { transaction_id: string; status: string }[] = [];
    if (ids.length > 0) {
      const { data: ex, error: exErr } = await svc
        .from("classifications")
        .select("transaction_id, status")
        .in("transaction_id", ids);
      if (exErr) return json({ error: exErr.message }, 500);
      existing = ex ?? [];
    }
    const statusMap = new Map(existing.map((e) => [e.transaction_id, e.status]));
    const toClassify = (costs ?? []).filter((c) => {
      const s = statusMap.get(c.id);
      return !s || s === "ai_proposta";
    });

    if (toClassify.length === 0) {
      return json({ ok: true, classified: 0, skipped: 0, errors: [] });
    }

    const clientList = (clients ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
    }));
    const validClientIds = new Set(clientList.map((c) => c.id));

    const system =
      `Sei un assistente di controllo di gestione per una piccola SRL italiana di servizi B2B` +
      (company?.name ? ` ("${company.name}"` : "") +
      (company?.sector ? `, settore ${company.sector})` : company?.name ? ")" : "") +
      `.\n\nDevi classificare costi aziendali in italiano.\n\nDefinizioni:\n- VARIABILE: costo che varia col volume/commessa (freelance su progetto, materiali, subappalti, trasferte legate a progetti).\n- FISSO: costo di struttura (affitto, stipendi fissi, software ricorrenti, utenze, commercialista).\n- NON_COSTO: IVA, imposte, giroconti, rimborsi finanziamenti, movimenti finanziari non economici.\n\nPer ogni costo, se è chiaramente attribuibile a un cliente/commessa fornito (per nome del fornitore, descrizione, riferimenti), indica il suo client_id; altrimenti null (costo comune/non attribuibile).\n\nRestituisci confidence in [0,1] e una rationale breve in italiano che spieghi "perché questo numero" (max 200 caratteri).`;

    const errors: { transaction_id?: string; error: string }[] = [];
    let classified = 0;
    let skipped = 0;

    for (let i = 0; i < toClassify.length; i += BATCH_SIZE) {
      const batch = toClassify.slice(i, i + BATCH_SIZE);
      const payload = {
        clients: clientList,
        costs: batch.map((c) => ({
          transaction_id: c.id,
          date: c.entry_date,
          description: c.description,
          counterparty: c.counterparty,
          amount: c.amount,
          invoice_number: c.invoice_number,
        })),
      };
      let items: ClassifyItem[] = [];
      try {
        items = await callAnthropic(ANTHROPIC_API_KEY, system, payload);
      } catch (e) {
        errors.push({ error: `Batch ${i}: ${(e as Error).message}` });
        skipped += batch.length;
        continue;
      }

      const batchIds = new Set(batch.map((b) => b.id));
      const rows = [];
      for (const it of items) {
        if (!it || !batchIds.has(it.transaction_id)) {
          skipped++;
          continue;
        }
        if (!["fisso", "variabile", "non_costo"].includes(it.cost_type)) {
          errors.push({ transaction_id: it.transaction_id, error: "cost_type non valido" });
          skipped++;
          continue;
        }
        const cid = it.client_id && validClientIds.has(it.client_id) ? it.client_id : null;
        const conf = Math.max(0, Math.min(1, Number(it.confidence) || 0));
        rows.push({
          transaction_id: it.transaction_id,
          cost_type: it.cost_type,
          client_id: cid,
          confidence: conf,
          confidence_band: band(conf, hi, mid),
          method: "ai",
          rationale: String(it.rationale ?? "").slice(0, 500),
          status: "ai_proposta",
          validated_by: "AI",
          validated_at: null,
        });
      }

      if (rows.length > 0) {
        const { error: upErr } = await svc
          .from("classifications")
          .upsert(rows, { onConflict: "transaction_id" });
        if (upErr) {
          errors.push({ error: `Upsert: ${upErr.message}` });
          skipped += rows.length;
        } else {
          classified += rows.length;
        }
      }
    }

    return json({ ok: true, classified, skipped, errors });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
