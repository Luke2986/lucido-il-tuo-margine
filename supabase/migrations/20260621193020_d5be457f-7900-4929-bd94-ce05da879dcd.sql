-- Trigger generico per updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enum di dominio
create type public.client_kind as enum ('cliente', 'commessa');
create type public.entry_direction as enum ('ricavo', 'costo');
create type public.cost_type as enum ('fisso', 'variabile', 'non_costo');
create type public.entry_source as enum ('manuale', 'fattura', 'banca', 'excel');
create type public.confidence_band as enum ('alta', 'media', 'bassa');
create type public.validation_status as enum ('da_validare', 'validato');
create type public.validator as enum ('AI', 'Operatore');

-- Anagrafica azienda (singleton)
create table public.companies (
  id text primary key default 'singleton',
  name text not null default '',
  vat_number text not null default '',
  sector text not null default '',
  period_label text not null default '',
  published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.companies to anon, authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "Accesso aperto companies" on public.companies
  for all using (true) with check (true);
create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.touch_updated_at();

-- Impostazioni applicative (singleton)
create table public.settings (
  id text primary key default 'singleton',
  threshold_high numeric(3,2) not null default 0.85,
  threshold_medium numeric(3,2) not null default 0.60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.settings to anon, authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "Accesso aperto settings" on public.settings
  for all using (true) with check (true);
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- Clienti e commesse
create table public.clients (
  id text primary key,
  name text not null,
  kind public.client_kind not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to anon, authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;
create policy "Accesso aperto clients" on public.clients
  for all using (true) with check (true);
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.touch_updated_at();

-- Voci di ricavo/costo
create table public.entries (
  id text primary key,
  entry_date date not null,
  description text not null,
  counterparty text not null,
  amount numeric(14,2) not null,
  direction public.entry_direction not null,
  cost_type public.cost_type,
  client_id text references public.clients(id) on delete set null,
  source public.entry_source not null,
  confidence public.confidence_band not null,
  status public.validation_status not null,
  invoice_number text,
  validated_by public.validator,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_entries_client on public.entries(client_id);
create index idx_entries_date on public.entries(entry_date);
grant select, insert, update, delete on public.entries to anon, authenticated;
grant all on public.entries to service_role;
alter table public.entries enable row level security;
create policy "Accesso aperto entries" on public.entries
  for all using (true) with check (true);
create trigger trg_entries_updated_at
  before update on public.entries
  for each row execute function public.touch_updated_at();