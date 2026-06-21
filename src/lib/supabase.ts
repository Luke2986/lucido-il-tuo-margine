// Client Supabase per il progetto esterno dell'utente (NON Lovable Cloud).
// URL e chiave publishable sono valori pubblici, sicuri lato client.
// Tutto il codice dell'app deve importare da qui, non da @/integrations/supabase/client.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gkkpqgezafbbogtgzgdw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_hOMgIm-K26fIW5pGzdVj0A_HUupsb7X";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
