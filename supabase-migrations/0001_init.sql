-- Lucido — Migration 0001: schema iniziale
-- Esegui questo file nel tuo progetto Supabase: SQL Editor → New query → incolla → Run.

-- =========================================================
-- 1) RUOLI UTENTE (pattern sicuro, NO ruolo su profiles)
-- =========================================================
create type public.app_role as enum ('titolare', 'operatore');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Un utente vede i propri ruoli"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- 2) CLIENTI / COMMESSE
-- =========================================================
create type public.entity_type as enum ('cliente', 'commessa');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo public.entity_type not null default 'cliente',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;

alter table public.clients enable row level security;

create policy "Owner gestisce i propri clienti"
on public.clients for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- =========================================================
-- 3) VOCI (ricavi / costi variabili)
-- =========================================================
create type public.line_kind as enum ('ricavo', 'costo_variabile');
create type public.line_source as enum ('manuale', 'fattura', 'banca', 'excel');
create type public.validation_status as enum ('da_validare', 'validata');

create table public.lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  kind public.line_kind not null,
  descrizione text not null,
  importo numeric(14,2) not null,
  data date not null,
  source public.line_source not null default 'manuale',
  confidence numeric(3,2),
  validato boolean not null default false,
  validato_da uuid references auth.users(id),
  validato_il timestamptz,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lines_owner_idx on public.lines(owner_id);
create index lines_client_idx on public.lines(client_id);

grant select, insert, update, delete on public.lines to authenticated;
grant all on public.lines to service_role;

alter table public.lines enable row level security;

create policy "Owner gestisce le proprie voci"
on public.lines for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- =========================================================
-- 4) TRIGGER updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger lines_updated_at
before update on public.lines
for each row execute function public.set_updated_at();
