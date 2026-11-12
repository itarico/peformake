-- Fonte extra do plano do mês: dados de TikTok/Instagram/Biblioteca de Anúncios já coletados por outra rotina (por cliente e mês).
-- Por enquanto devolve null; quando a tabela da rotina de coleta existir, troque só esta função (a monthly-strategy já lê o resultado).
create or replace function public.monthly_scan_extra(_client uuid, _month date)
returns jsonb language sql stable security definer set search_path to '' as $$ select null::jsonb $$;
revoke all on function public.monthly_scan_extra(uuid, date) from public, anon, authenticated;
