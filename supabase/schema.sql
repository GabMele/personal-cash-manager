-- Esegui nello SQL editor di Supabase. Ogni riga appartiene a un utente (RLS).
create table accounts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null check (kind in ('bank','wallet','broker')),
  gross_rate numeric not null default 0,
  apply_bollo boolean not null default false,
  auto_interest boolean not null default false,
  color text not null default '#7c5cff',
  color2 text,
  currency text not null default 'EUR',
  created_at date not null default current_date,
  featured boolean not null default true,
  external boolean not null default false
);
create table holdings (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references accounts on delete cascade,
  symbol text not null,
  kind text not null check (kind in ('stock','crypto')),
  qty numeric not null,
  price numeric not null
);
create table txs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references accounts on delete cascade,
  date date not null,
  amount numeric not null,
  description text not null default '',
  category text not null default 'Altro',
  subcategory text not null default '',
  tags text[] not null default '{}',
  project text not null default '',
  payee text not null default '',
  destination text not null default '' check (destination in ('','consumo','esperienza','durevole','strumentale','crescita','costo')),
  stars int not null default 0 check (stars between 0 and 5),
  asset_value numeric,
  status text not null default 'confirmed' check (status in ('confirmed','pending')),
  kind text not null default 'normal' check (kind in ('normal','interest','bollo','transfer','opening')),
  transfer_id uuid,
  ref text,
  source text not null default 'manual',
  unique (user_id, ref)
);
-- Impostazioni per utente: categorie come array ordinato [{"name": "...", "subs": ["..."]}]
create table user_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  categories jsonb
);

create index on txs (user_id, date desc);

alter table accounts enable row level security;
alter table holdings enable row level security;
alter table txs enable row level security;
alter table user_settings enable row level security;
create policy own_accounts on accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_holdings on holdings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_txs on txs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_settings on user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Migrazione per database esistenti:
-- alter table accounts add column if not exists featured boolean not null default true;
-- alter table accounts add column if not exists external boolean not null default false;
