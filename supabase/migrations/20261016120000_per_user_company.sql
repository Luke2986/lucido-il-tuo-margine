-- Ogni nuovo utente (anche anonimo) riceve la propria azienda demo:
-- i visitatori del prototipo pubblico non condividono né possono cancellare i dati altrui.

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS seeded_at timestamptz;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_display_name text;
BEGIN
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Operatore anonimo'
  );

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_display_name)
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  INSERT INTO public.companies (status) VALUES ('bozza') RETURNING id INTO v_company_id;
  INSERT INTO public.settings (company_id) VALUES (v_company_id);
  INSERT INTO public.memberships (user_id, company_id, role)
  VALUES (NEW.id, v_company_id, 'operator');

  RETURN NEW;
END;
$$;

-- La vecchia policy permetteva di riscrivere anche company_id, cioè di entrare in qualsiasi azienda.
DROP POLICY IF EXISTS "membership: aggiornamento ruolo proprio (test)" ON public.memberships;

CREATE OR REPLACE FUNCTION public.set_my_role(_company_id uuid, _role public.app_role)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.memberships
  SET role = _role
  WHERE user_id = auth.uid() AND company_id = _company_id;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_role(uuid, public.app_role) TO authenticated;

-- Il titolare vede transazioni e clienti dell'azienda pubblicata: deve vederne anche le classificazioni,
-- altrimenti i costi variabili spariscono dal suo margine.
CREATE POLICY "classifications: select owner pubblicata" ON public.classifications
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = classifications.transaction_id
        AND public.has_role_in_company(auth.uid(), t.company_id, 'owner')
        AND public.is_company_published(t.company_id)
    )
  );
