-- Miniaturas das referências (Instagram, TikTok, YouTube, sites): a função ref-thumb busca a capa uma vez,
-- GUARDA uma cópia (o link do Instagram expira em dias) e todo o sistema reaproveita (moldura, aba Referências, briefing, PDF).
create table if not exists public.ref_thumbs (
  url_key text primary key,
  url text not null,
  thumb_path text,
  thumb_url text,
  source text,
  status text not null default 'ok' check (status in ('ok', 'falhou')),
  created_at timestamptz not null default now()
);
alter table public.ref_thumbs enable row level security;
drop policy if exists ref_thumbs_read on public.ref_thumbs;
create policy ref_thumbs_read on public.ref_thumbs for select to authenticated using (true);

insert into storage.buckets (id, name, public) values ('ref-thumbs', 'ref-thumbs', true)
on conflict (id) do update set public = true;
