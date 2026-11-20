-- Contexto da estratégia lê o briefing completo (Italo, 20/11: "a partir do briefing e das perguntas o sistema fica completo").
-- Novo: tipo de negócio e cartão CNPJ explícitos, documentos da pasta Briefing, resumo do diagnóstico,
-- respostas de meses anteriores e o guia de leitura dos cartões juntos. O resto fica igual.
create or replace function public.strategy_brief_context(_client uuid, _month date)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare m date := date_trunc('month', _month)::date;
        b jsonb := coalesce((select data from public.client_briefs where client_id = _client), '{}'::jsonb);
begin
  if not public.strategy_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return jsonb_build_object(
    'cliente', (select jsonb_build_object('id', c.id, 'nome', c.name, 'segmento', c.segment, 'nicho', c.niche, 'descricao', left(coalesce(c.description, ''), 500), 'instagram', c.instagram, 'site', c.website, 'endereco', c.address) from public.clients c where c.id = _client),
    'mes', to_char(m, 'YYYY-MM'),
    'tipo_de_negocio', jsonb_build_object('familia', b->>'tipo', 'como_a_equipe_chama', b->>'tipo_label'),
    'cartao_cnpj', b->'cnpj',
    'como_ler_o_briefing', 'Cartões juntos: posicionamento (+diferenciais), proposito (+historia), momento (+visao, capacidade), jornada = como o cliente compra (+objecoes), voz = jeito da marca (+arquetipo, proibidos); a chave principal tem o texto mais novo e as antigas continuam valendo. Novos: marketing (o que já fizeram e o resultado), marca (logo, cores, fontes, fotos, acessos, destino do anúncio, pixel), sazonalidade com meses_fortes e meses_fracos (1 a 12), historias (conversas longas para conteúdo). Valores: verba_anuncio, ticket_medio, faturamento_mes, gasto_ano_cliente, margem_principal (use no plano e no tráfego; nunca no texto para o cliente).',
    'briefing', b,
    'briefing_do_mes', coalesce((select data from public.client_brief_months where client_id = _client and month = m), '{}'::jsonb),
    'perguntas_do_mes', coalesce((select jsonb_agg(jsonb_build_object('pergunta', q.question, 'resposta', case when q.status = 'respondida' then q.answer else 'sem resposta' end, 'por', q.answered_via))
      from public.client_questions q where q.client_id = _client and q.pack = 'briefing_mes' and q.focus = to_char(m, 'YYYY-MM')), '[]'::jsonb),
    'respostas_meses_anteriores', coalesce((select jsonb_agg(jsonb_build_object('mes', x.focus, 'pergunta', x.question, 'resposta', left(x.answer, 600)) order by x.answered_at desc)
      from (select q.focus, q.question, q.answer, q.answered_at from public.client_questions q where q.client_id = _client and q.status = 'respondida' and coalesce(q.focus, '') <> to_char(m, 'YYYY-MM') order by q.answered_at desc nulls last limit 60) x), '[]'::jsonb),
    'documentos_do_briefing', coalesce((select jsonb_agg(jsonb_build_object('nome', a.name, 'tipo', a.mime, 'bucket', a.bucket, 'caminho', a.path, 'em', to_char(a.created_at, 'YYYY-MM-DD')) order by a.created_at desc)
      from public.client_assets a where a.client_id = _client and a.folder = 'briefing'), '[]'::jsonb),
    'diagnostico_resumo', (select jsonb_build_object('status', d.status, 'resumo', d.doc->'resumo', 'swot', d.doc->'diagnostico'->'swot', 'publico', d.doc->'diagnostico'->'publico', 'proposta_valor', d.doc->'diagnostico'->'proposta_valor', 'mercado', d.doc->'diagnostico'->'mercado', 'perguntas_em_aberto', d.doc->'do_cliente') from public.consult_docs d where d.client_id = _client),
    'anotacoes_da_reuniao', coalesce((select jsonb_agg(left(n.body, 400) order by n.created_at desc) from public.client_meeting_notes n where n.client_id = _client and n.done_at is null), '[]'::jsonb),
    'direcionamento', coalesce((select jsonb_agg(d.area || ': ' || left(d.body, 400)) from public.client_directions d where d.client_id = _client and (d.month is null or d.month = m)), '[]'::jsonb),
    'voz_da_marca', (select to_jsonb(v) - 'client_id' - 'updated_at' from public.client_brand_voice v where v.client_id = _client),
    'regras_de_conteudo_recusas', coalesce((select jsonb_agg(r.rule order by r.created_at desc) from public.content_rules r where r.client_id = _client or r.client_id is null), '[]'::jsonb),
    'o_que_funcionou', (select jsonb_build_object('periodo', t.period_start || ' a ' || t.period_end, 'resumo', left(coalesce(t.summary, ''), 700)) from public.traffic_reports t where t.client_id = _client and t.kind = 'monthly' order by t.period_end desc limit 1),
    'ja_feito_nao_repetir', coalesce((select jsonb_agg(to_char(s.month, 'YYYY-MM') || ' ' || s.tab || ': ' || s.title) from (select * from public.strategy_cards where client_id = _client and month < m and status <> 'recusado' order by month desc limit 60) s), '[]'::jsonb),
    'contrato_so_referencia', coalesce((select jsonb_agg(jsonb_build_object('servico', sv.name, 'area', sv.area, 'qtd', coalesce(cs.deliver_qty, cs.quantity * sv.delivery_qty))) from public.client_services cs join public.services sv on sv.id = cs.service_id where cs.client_id = _client and cs.is_active), '[]'::jsonb),
    'faltou_no_briefing', coalesce((select missing from public.strategy_boards where client_id = _client and month = m), '[]'::jsonb)
  );
end $function$;
