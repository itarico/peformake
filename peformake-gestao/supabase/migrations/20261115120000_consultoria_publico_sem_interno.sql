-- O link do cliente e o portal nunca levam o que é interno (decisões da Peformake, alertas, problemas internos, itens a conferir),
-- nem escondido nos dados da página (pedido do Italo, 12/11/2026).
create or replace function public.consult_public_payload(_client uuid)
returns jsonb language sql stable security definer set search_path to '' as $function$
  select jsonb_build_object(
    'name', trim(c.name), 'logo_path', c.logo_path, 'segment', c.segment,
    'doc', (d.doc - 'fontes' - 'frameworks' - 'do_cliente' - 'confirmar')
      #- '{inteligencia,decisoes_peformake}' #- '{inteligencia,red_flags}' #- '{inteligencia,problemas_internos}' #- '{inteligencia,confirmar}' #- '{inteligencia,perguntas}',
    'questions', coalesce((select jsonb_agg(jsonb_build_object('question', q.question, 'why', q.why, 'answer', q.answer) order by q.created_at)
      from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status <> 'descartada'), '[]'::jsonb),
    'approved_at', d.approved_at,
    'updated_at', greatest(d.updated_at, (select max(q.answered_at) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria'))
  )
  from public.consult_docs d join public.clients c on c.id = d.client_id where d.client_id = _client
$function$;
