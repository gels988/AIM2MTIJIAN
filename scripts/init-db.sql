create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  email text,
  balance_g integer not null default 300,
  referrer_id uuid,
  referral_code varchar(16),
  is_active boolean not null default false,
  is_early_adopter boolean not null default false,
  private_donation numeric not null default 0,
  donated_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_active timestamptz,
  total_donation numeric not null default 0
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_users_phone_number_key'
  ) then
    alter table public.app_users add constraint app_users_phone_number_key unique (phone_number);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'app_users_email_key'
  ) then
    alter table public.app_users add constraint app_users_email_key unique (email);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'app_users_referral_code_key'
  ) then
    alter table public.app_users add constraint app_users_referral_code_key unique (referral_code);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'app_users_referrer_id_fkey'
  ) then
    alter table public.app_users
      add constraint app_users_referrer_id_fkey
      foreign key (referrer_id) references public.app_users (id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_app_users_referrer_id on public.app_users (referrer_id);
create index if not exists idx_app_users_created_at on public.app_users (created_at desc);

alter table public.app_users enable row level security;

drop policy if exists app_users_anon_select on public.app_users;
create policy app_users_anon_select on public.app_users
  for select
  to anon
  using (true);

drop policy if exists app_users_anon_insert on public.app_users;
create policy app_users_anon_insert on public.app_users
  for insert
  to anon
  with check (true);

drop policy if exists app_users_auth_select on public.app_users;
create policy app_users_auth_select on public.app_users
  for select
  to authenticated
  using (true);

drop policy if exists app_users_auth_insert on public.app_users;
create policy app_users_auth_insert on public.app_users
  for insert
  to authenticated
  with check (true);

