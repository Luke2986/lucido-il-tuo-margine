
-- =========================================================
-- DROP vecchio schema
-- =========================================================
DROP TABLE IF EXISTS public.entries CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

DROP TYPE IF EXISTS public.client_kind CASCADE;
DROP TYPE IF EXISTS public.entry_direction CASCADE;
DROP TYPE IF EXISTS public.cost_type CASCADE;
DROP TYPE IF EXISTS public.entry_source CASCADE;
DROP TYPE IF EXISTS public.confidence_band CASCADE;
DROP TYPE IF EXISTS public.validation_status CASCADE;
DROP TYPE IF EXISTS public.validator CASCADE;

-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('operator', 'owner');
CREATE TYPE public.client_kind AS ENUM ('cliente', 'commessa');
CREATE TYPE public.tx_direction AS ENUM ('ricavo', 'costo');
CREATE TYPE public.cost_type AS ENUM ('fisso', 'variabile', 'non_costo');
CREATE TYPE public.entry_source AS ENUM ('manuale', 'fattura', 'banca', 'excel');
CREATE TYPE public.confidence_band AS ENUM ('alta', 'media', 'bassa');
CREATE TYPE public.classification_status AS ENUM ('ai_proposta', 'validata', 'override');
CREATE TYPE public.classification_method AS ENUM ('manuale', 'ai', 'regola');
CREATE TYPE public.validator AS ENUM ('AI', 'Operatore');
CREATE TYPE public.company_status AS ENUM ('bozza', 'pubblicata');

-- =========================================================
-- Trigger updated_at (riusa funzione esistente touch_updated_at)
-- =========================================================

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profili: lettura propria" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profili: aggiornamento proprio" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- companies
-- =========================================================
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  vat_number text NOT NULL DEFAULT '',
  sector text NOT NULL DEFAULT '',
  period_label text NOT NULL DEFAULT '',
  status public.company_status NOT NULL DEFAULT 'bozza',
  published_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- policy create dopo le funzioni helper sotto.
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- memberships
-- =========================================================
CREATE TABLE public.memberships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'operator',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membership: lettura propria" ON public.memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "membership: aggiornamento ruolo proprio (test)" ON public.memberships
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER memberships_touch BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- Funzioni SECURITY DEFINER per evitare ricorsione RLS
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_company(_user_id uuid, _company_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND company_id = _company_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_published(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies WHERE id = _company_id AND status = 'pubblicata'
  );
$$;

-- =========================================================
-- companies: policies (dopo le helper)
-- =========================================================
-- Operatore vede sempre la propria azienda; titolare la vede solo se pubblicata.
CREATE POLICY "companies: select membri" ON public.companies
  FOR SELECT TO authenticated USING (
    public.has_role_in_company(auth.uid(), id, 'operator')
    OR (public.has_role_in_company(auth.uid(), id, 'owner') AND status = 'pubblicata')
  );
CREATE POLICY "companies: update operator" ON public.companies
  FOR UPDATE TO authenticated USING (public.has_role_in_company(auth.uid(), id, 'operator'))
  WITH CHECK (public.has_role_in_company(auth.uid(), id, 'operator'));
-- Niente INSERT/DELETE da app utente (azienda creata via seed/edge).

-- =========================================================
-- clients
-- =========================================================
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind public.client_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clients_company_idx ON public.clients(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients: select membri" ON public.clients
  FOR SELECT TO authenticated USING (
    public.has_role_in_company(auth.uid(), company_id, 'operator')
    OR (public.has_role_in_company(auth.uid(), company_id, 'owner') AND public.is_company_published(company_id))
  );
CREATE POLICY "clients: cud operator" ON public.clients
  FOR ALL TO authenticated USING (public.has_role_in_company(auth.uid(), company_id, 'operator'))
  WITH CHECK (public.has_role_in_company(auth.uid(), company_id, 'operator'));
CREATE TRIGGER clients_touch BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- transactions
-- =========================================================
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  direction public.tx_direction NOT NULL,
  entry_date date NOT NULL,
  description text NOT NULL,
  counterparty text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  source public.entry_source NOT NULL DEFAULT 'manuale',
  invoice_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_company_idx ON public.transactions(company_id);
CREATE INDEX transactions_client_idx ON public.transactions(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions: select membri" ON public.transactions
  FOR SELECT TO authenticated USING (
    public.has_role_in_company(auth.uid(), company_id, 'operator')
    OR (public.has_role_in_company(auth.uid(), company_id, 'owner') AND public.is_company_published(company_id))
  );
CREATE POLICY "transactions: cud operator" ON public.transactions
  FOR ALL TO authenticated USING (public.has_role_in_company(auth.uid(), company_id, 'operator'))
  WITH CHECK (public.has_role_in_company(auth.uid(), company_id, 'operator'));
CREATE TRIGGER transactions_touch BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- classifications (1:1 con transactions)
-- =========================================================
CREATE TABLE public.classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
  cost_type public.cost_type,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  confidence numeric(4,3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
  confidence_band public.confidence_band NOT NULL DEFAULT 'alta',
  method public.classification_method NOT NULL DEFAULT 'manuale',
  rationale text NOT NULL DEFAULT '',
  status public.classification_status NOT NULL DEFAULT 'validata',
  validated_by public.validator,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX classifications_tx_idx ON public.classifications(transaction_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classifications TO authenticated;
GRANT ALL ON public.classifications TO service_role;
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;
-- Le classifications ereditano l'accesso dalla transaction parent
CREATE POLICY "classifications: select via transaction" ON public.classifications
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = classifications.transaction_id
        AND public.has_role_in_company(auth.uid(), t.company_id, 'operator')
    )
  );
CREATE POLICY "classifications: cud operator" ON public.classifications
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = classifications.transaction_id
        AND public.has_role_in_company(auth.uid(), t.company_id, 'operator')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = classifications.transaction_id
        AND public.has_role_in_company(auth.uid(), t.company_id, 'operator')
    )
  );
CREATE TRIGGER classifications_touch BEFORE UPDATE ON public.classifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- settings (per azienda)
-- =========================================================
CREATE TABLE public.settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  threshold_high numeric(4,3) NOT NULL DEFAULT 0.850,
  threshold_medium numeric(4,3) NOT NULL DEFAULT 0.600,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings: select membri" ON public.settings
  FOR SELECT TO authenticated USING (public.is_member(auth.uid(), company_id));
CREATE POLICY "settings: cud operator" ON public.settings
  FOR ALL TO authenticated USING (public.has_role_in_company(auth.uid(), company_id, 'operator'))
  WITH CHECK (public.has_role_in_company(auth.uid(), company_id, 'operator'));
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- VISTA margin_by_client (calcolo primo margine)
-- Eredita RLS dalle tabelle sottostanti (SECURITY INVOKER di default).
-- =========================================================
CREATE OR REPLACE VIEW public.margin_by_client AS
WITH attributed AS (
  SELECT
    t.company_id,
    t.direction,
    t.amount,
    COALESCE(cl.client_id, t.client_id) AS client_id,
    cl.cost_type
  FROM public.transactions t
  LEFT JOIN public.classifications cl ON cl.transaction_id = t.id
)
SELECT
  c.id          AS client_id,
  c.company_id,
  c.name        AS client_name,
  c.kind        AS client_kind,
  COALESCE(SUM(CASE WHEN a.direction = 'ricavo' THEN a.amount END), 0)::numeric(14,2)
    AS revenues,
  COALESCE(SUM(CASE WHEN a.direction = 'costo' AND a.cost_type = 'variabile' THEN a.amount END), 0)::numeric(14,2)
    AS variable_costs,
  (COALESCE(SUM(CASE WHEN a.direction = 'ricavo' THEN a.amount END), 0)
   - COALESCE(SUM(CASE WHEN a.direction = 'costo' AND a.cost_type = 'variabile' THEN a.amount END), 0))::numeric(14,2)
    AS margin
FROM public.clients c
LEFT JOIN attributed a ON a.client_id = c.id AND a.company_id = c.company_id
GROUP BY c.id, c.company_id, c.name, c.kind;

GRANT SELECT ON public.margin_by_client TO authenticated;
GRANT SELECT ON public.margin_by_client TO service_role;

-- =========================================================
-- Trigger handle_new_user: crea profilo + membership a Studio Marini
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(NEW.email, '@', 1)));

  -- Aggancia il nuovo utente come operatore dell'azienda di esempio, se presente.
  SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.memberships (user_id, company_id, role)
    VALUES (NEW.id, v_company_id, 'operator')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Seed: azienda Studio Marini + settings di default.
-- Clienti/voci/classificazioni vengono inseriti in un passo successivo
-- (insert separato) per tenere questa migrazione focalizzata sullo schema.
-- =========================================================
INSERT INTO public.companies (id, name, vat_number, sector, period_label, status, published_at)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Studio Marini S.r.l.',
  '01234567890',
  'Consulenza direzionale',
  'Gennaio – Maggio 2026',
  'pubblicata',
  '2026-06-18'
);

INSERT INTO public.settings (company_id, threshold_high, threshold_medium)
VALUES ('00000000-0000-4000-8000-000000000001', 0.850, 0.600);
