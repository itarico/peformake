-- Consultoria: coleta antes da análise (Firecrawl → ScrapeCreators: posts, reels e comentários do Instagram do cliente e dos concorrentes).
-- Teto de créditos do Firecrawl por cliente (padrão 100, muda em ai_settings) e créditos gastos registrados em ai_usage_log.
alter table public.ai_settings add column if not exists firecrawl_credits_per_client integer not null default 100 check (firecrawl_credits_per_client between 0 and 2000);
alter table public.ai_usage_log add column if not exists credits integer not null default 0;
comment on column public.ai_settings.firecrawl_credits_per_client is 'Máximo de créditos do Firecrawl por geração de diagnóstico (coleta do Instagram).';
comment on column public.ai_usage_log.credits is 'Créditos de serviço externo (ex.: Firecrawl) gastos nesta chamada.';
