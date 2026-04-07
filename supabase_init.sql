create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists wallet_address text,
  add column if not exists balance_u numeric not null default 0,
  add column if not exists invite_code text,
  add column if not exists referrer_id uuid;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles')
     and not exists (select 1 from pg_constraint where conname = 'profiles_invite_code_key') then
    alter table public.profiles add constraint profiles_invite_code_key unique (invite_code);
  end if;
end
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles')
     and not exists (select 1 from pg_constraint where conname = 'profiles_referrer_id_fkey') then
    alter table public.profiles
      add constraint profiles_referrer_id_fkey
      foreign key (referrer_id) references public.profiles (id)
      on delete set null;
  end if;
end
$$;

alter table if exists public.reports
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid,
  add column if not exists agent_name text,
  add column if not exists hexagram_result text,
  add column if not exists score_json jsonb,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'reports')
     and not exists (select 1 from pg_constraint where conname = 'reports_pkey') then
    alter table public.reports add constraint reports_pkey primary key (id);
  end if;
end
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'reports')
     and not exists (select 1 from pg_constraint where conname = 'reports_user_id_fkey') then
    alter table public.reports
      add constraint reports_user_id_fkey
      foreign key (user_id) references public.profiles (id)
      on delete cascade;
  end if;
end
$$;

alter table if exists public.question_bank
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists content text,
  add column if not exists standard_answer text,
  add column if not exists dimension text;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'question_bank')
     and not exists (select 1 from pg_constraint where conname = 'question_bank_pkey') then
    alter table public.question_bank add constraint question_bank_pkey primary key (id);
  end if;
end
$$;

insert into public.question_bank (content, standard_answer, dimension)
select
  '010111100001 这段机器语言结合八卦编码可以翻译成什么数字？',
  '6174 (数字黑洞/易经硬编码)',
  'Metaphysics-Logic'
where not exists (
  select 1 from public.question_bank
  where content = '010111100001 这段机器语言结合八卦编码可以翻译成什么数字？'
);
