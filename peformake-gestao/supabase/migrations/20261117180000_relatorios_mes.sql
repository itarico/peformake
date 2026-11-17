-- Tráfego → Relatórios em cartões do mês (Italo, 17/11): Semana 1, 2, 3, 4 (5) + Mensal por cliente.
-- Devolve todos os relatórios do mês de cada cliente; a tela encaixa cada semanal pela segunda-feira em que começa
-- (o quadro antigo exigia o período exato e escondia os de 09 a 16/11, gravados com fim na segunda).
create or replace function public.report_month(_month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _from date := date_trunc('month', _month)::date; _to date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
begin
  if not public.can_access_traffic() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  return jsonb_build_object(
    'month', _from,
    'today', (now() at time zone 'America/Sao_Paulo')::date,
    'send_enabled', (select send_reports_enabled from public.traffic_settings where id),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'client_id', c.id, 'name', c.name,
        'has_phone', length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 10,
        'whatsapp_enabled', coalesce(s.whatsapp_enabled, false),
        'has_traffic_service', exists (select 1 from public.client_services cs join public.services sv on sv.id = cs.service_id
                                       where cs.client_id = c.id and cs.is_active and sv.name ilike 'tr%fego%'),
        'reports', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'period_start', r.period_start, 'period_end', r.period_end,
                     'path', r.path, 'sent_at', r.sent_at, 'send_error', r.send_error, 'by_agent', r.content is not null, 'created_at', r.created_at,
                     'spend_cents', (r.metrics ->> 'spend')::bigint, 'results', (r.metrics ->> 'results')::bigint) order by r.created_at desc)
                   from public.traffic_reports r where r.client_id = c.id
                     and ((r.kind = 'weekly' and r.period_start between _from - 6 and _to) or (r.kind = 'monthly' and r.period_start between _from and _to))), '[]'::jsonb)
      ) order by c.name)
      from public.clients c left join public.traffic_client_report_settings s on s.client_id = c.id
      where public.client_in_area(c.id, 'trafego') and exists (select 1 from public.ad_accounts a where a.client_id = c.id and a.enabled)
    ), '[]'::jsonb));
end $$;
revoke execute on function public.report_month(date) from public, anon;
grant execute on function public.report_month(date) to authenticated;
