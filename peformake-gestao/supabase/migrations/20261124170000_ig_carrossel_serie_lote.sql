-- Instagram (pedido do Italo, 24/11/2026): carrossel, story que repete e programar em massa.
-- Carrossel = post com 2 a 10 arquivos em media (a regra antiga de tipo fica igual: post, reels, story).
-- Story que repete: cada repetição é uma publicação própria, ligada pela série (series_id), para aparecer no calendário
-- e poder cancelar a série inteira. Definições completas aplicadas no banco (ig_post_create, ig_series_cancel,
-- ig_publish_queue com media); este arquivo registra as colunas.
alter table public.ig_posts add column if not exists media jsonb not null default '[]'::jsonb;
alter table public.ig_posts add column if not exists series_id uuid;
create index if not exists ig_posts_series on public.ig_posts (series_id) where series_id is not null;
