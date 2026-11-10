-- Financeiro pelo WhatsApp (parte 1): tabelas, colunas e funções de apoio. Tudo sem IA, tudo no banco.
-- Canal (grupo ou número) -> caixa de entrada (fin_inbox) -> leitor por regras -> lançamento "a revisar" no Caixa.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Texto sem acento e em minúsculas (base do leitor e das comparações).
create or replace function public.fin_norm(_t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(_t, '')))
$$;

-- Chave do telefone: DDD + 8 dígitos (tira o 55 e o 9 extra), para casar "+55 81 98567-2212" com "558185672212".
create or replace function public.fin_phone_key(_p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case when d is null or length(d) < 10 then d
    else right(case when length(d) in (11, 13) and substr(d, length(d) - 8, 1) = '9' then left(d, length(d) - 9) || right(d, 8) else d end, 10) end
  from (select nullif(regexp_replace(coalesce(_p, ''), '[^0-9]', '', 'g'), '') d) x
$$;

-- Nome do cliente para comparar: sem acento, sem pontuação, sem "Ltda", "ME"...
create or replace function public.fin_client_key(_n text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(public.fin_norm(_n), '[^a-z0-9]+', ' ', 'g'),
    '\m(ltda|me|eireli|epp|sa|s a|cia|mei)\M', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- Configuração geral (uma linha). Tudo nasce desligado.
create table if not exists public.fin_wa_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,            -- leitura dos canais
  reply_enabled boolean not null default false,      -- resposta curta no grupo
  reimburse_enabled boolean not null default false,  -- "do meu bolso" vira reembolso para a pessoa
  pix_enabled boolean not null default false,        -- botão "Pagar agora por Pix" no reembolso
  high_value numeric not null default 1000 check (high_value > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.fin_wa_settings (id) values (true) on conflict do nothing;

create table if not exists public.fin_wa_channels (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('grupo', 'privado')),
  name text not null check (length(trim(name)) between 1 and 120),
  chat_jid text unique,
  invite_code text,
  phone_key text,
  enabled boolean not null default false,
  default_unit text check (default_unit in ('peformake', 'ellcazo')), -- vazio = decidir pelo conteúdo
  accept_saida boolean not null default true,
  accept_entrada boolean not null default true,
  reply boolean not null default true,
  default_payer text not null default 'empresa' check (default_payer in ('empresa', 'quem_lancou')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind = 'grupo' or phone_key is not null)
);
create unique index if not exists fin_wa_channels_phone_uq on public.fin_wa_channels (phone_key) where kind = 'privado';

-- Quem pode lançar: membro da equipe (o telefone fica em staff_members.phone).
create table if not exists public.fin_wa_people (
  staff_id uuid primary key references public.staff_members(id) on delete cascade,
  high_value numeric check (high_value > 0),
  created_at timestamptz not null default now()
);

-- Número de fora da equipe que tentou lançar (fica para "Liberar").
create table if not exists public.fin_wa_unknown (
  phone_key text primary key,
  phone text,
  name text,
  channel_id uuid references public.fin_wa_channels(id) on delete cascade,
  last_text text,
  attempts integer not null default 1,
  last_at timestamptz not null default now()
);

-- Caixa de entrada: uma linha por mensagem (a chave única impede lançar a mesma mensagem duas vezes).
create table if not exists public.fin_inbox (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text not null unique,
  wa_row_id bigint,
  channel_id uuid references public.fin_wa_channels(id) on delete set null,
  chat_jid text,
  staff_id uuid references public.staff_members(id) on delete set null,
  sender_name text,
  body text,
  media text check (media in ('audio', 'image', 'document')),
  state text not null default 'nao_entendi' check (state in ('aguardando_audio', 'nao_entendi', 'lancado', 'repetido', 'fatura', 'confirmado', 'descartado', 'cancelado')),
  parsed jsonb not null default '{}'::jsonb,
  entry_id uuid references public.fin_entries(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  reason text,
  confidence smallint,
  high_value boolean not null default false,
  received_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);
create index if not exists fin_inbox_state_idx on public.fin_inbox (state, received_at desc);
create index if not exists fin_inbox_entry_idx on public.fin_inbox (entry_id) where entry_id is not null;

-- Lançamento: revisão, banco, confirmações de outras fontes e atribuição.
alter table public.fin_entries
  add column if not exists review_status text check (review_status in ('a_revisar', 'confirmado')),
  add column if not exists bank_ref text,
  add column if not exists confirmations jsonb not null default '[]'::jsonb,
  add column if not exists attribution text,
  add column if not exists confidence smallint,
  add column if not exists av_project_id uuid references public.av_projects(id) on delete set null,
  add column if not exists service_job_id uuid references public.service_jobs(id) on delete set null,
  add column if not exists paid_by_staff uuid references public.staff_members(id) on delete set null,
  add column if not exists reimburse_status text check (reimburse_status in ('enviando', 'enviado', 'erro')),
  add column if not exists reimburse_ref text;
create index if not exists fin_entries_review_idx on public.fin_entries (review_status) where review_status = 'a_revisar';
create index if not exists fin_entries_bank_ref_idx on public.fin_entries (unit, bank_ref) where bank_ref is not null;

alter table public.clients add column if not exists aliases text[] not null default '{}';
alter table public.staff_members
  add column if not exists pix_key text,
  add column if not exists pix_key_type text check (pix_key_type in ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'));

-- Categorias que o leitor usa e ainda não existiam.
insert into public.fin_categories (unit, kind, name)
select u, 'saida', n from (values ('peformake', 'Deslocamento'), ('peformake', 'Alimentação'), ('peformake', 'Escritório e contas'), ('peformake', 'Equipamento'),
  ('ellcazo', 'Alimentação'), ('ellcazo', 'Escritório e contas'), ('ellcazo', 'Impostos'), ('ellcazo', 'Tarifas bancárias')) v(u, n)
where not exists (select 1 from public.fin_categories c where c.unit = v.u and c.kind = 'saida' and c.name = v.n);

alter table public.fin_wa_settings enable row level security;
alter table public.fin_wa_channels enable row level security;
alter table public.fin_wa_people enable row level security;
alter table public.fin_wa_unknown enable row level security;
alter table public.fin_inbox enable row level security;
create policy fin_wa_settings_read on public.fin_wa_settings for select to authenticated using (public.has_role('admin'));
create policy fin_wa_channels_read on public.fin_wa_channels for select to authenticated using (public.has_role('admin'));
create policy fin_wa_people_read on public.fin_wa_people for select to authenticated using (public.has_role('admin'));
create policy fin_wa_unknown_read on public.fin_wa_unknown for select to authenticated using (public.has_role('admin'));
create policy fin_inbox_read on public.fin_inbox for select to authenticated using (public.has_role('admin'));

-- Comprovantes e áudios do financeiro: pasta privada, só admin abre.
insert into storage.buckets (id, name, public) values ('fin-whatsapp', 'fin-whatsapp', false) on conflict (id) do nothing;
create policy fin_whatsapp_read on storage.objects for select to authenticated using (bucket_id = 'fin-whatsapp' and public.has_role('admin'));

-- O gatilho antigo (só privado, formato fixo, lançava direto como pago) para de agir: a caixa de entrada nova substitui.
-- (A função fica vazia em vez de apagar o gatilho; fin_whatsapp_senders fica guardada, sem uso.)
create or replace function public.fin_from_whatsapp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  return new;
end $$;
