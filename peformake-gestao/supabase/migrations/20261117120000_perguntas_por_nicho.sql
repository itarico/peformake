-- Perguntas do mês sob medida (Italo, 17/11): "a pergunta é das mais importantes; tem que se adaptar a cada cliente e nicho".
-- 8 perguntas abertas por nicho (comida, saúde/estética, varejo, serviços, B2B) + até 2 perguntas do DIAGNÓSTICO do cliente
-- (doc.do_cliente) que ainda não foram respondidas. Pacotes do mês ainda intocados (tudo pendente, nada respondido)
-- trocam as perguntas genéricas antigas pelas novas (as antigas ficam 'descartada', nada é apagado).
create or replace function public.brief_niche(_client uuid)
returns text language sql stable security definer set search_path to '' as $$
  select case
    when coalesce(c.segment, '') ~* 'gastro|restaur|aliment|bar\M|caf[eé]|pizz|hamb|doce|confeit|a[cç]a[ií]' then 'comida'
    when coalesce(c.segment, '') ~* 'sa[uú]de|est[eé]tica|beleza|odonto|cl[ií]nica|m[eé]dic|nutri|barbe|sal[aã]o' then 'saude'
    when coalesce(c.description, '') ~* 'b2b|para ind[uú]strias|ind[uú]strias parceiras' or coalesce(c.segment, '') ~* 'ind[uú]stria|distribuidora|atacad' then 'b2b'
    when coalesce(c.segment, '') ~* 'moda|[oó]tica|varejo|loja|automotiv|cal[cç]ado|pet' then 'varejo'
    else 'servicos' end
  from public.clients c where c.id = _client
$$;

create or replace function public.brief_questions_ensure(_client uuid, _month date)
returns integer language plpgsql security definer set search_path to '' as $function$
declare m text; mes text; n integer := 0; r record; niche text; untouched boolean; qs jsonb; dq jsonb; k int := 0;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  m := to_char(_month, 'YYYY-MM');
  mes := (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[extract(month from _month)::int];
  niche := coalesce(public.brief_niche(_client), 'servicos');

  -- [área, pergunta, por quê (aparece para o cliente como dica), opções]
  qs := case niche
    when 'comida' then jsonb_build_array(
      jsonb_build_array('vendas', format('Se você pudesse escolher um prato ou combo para todo mundo pedir em %s, qual seria? Quanto custa?', mes), 'Ex.: "Combo família, pizza grande + refri 2L, R$ 129". É o centro do mês.', '[]'::jsonb),
      jsonb_build_array('consultoria', format('Qual número faria %s ser um mês bom para você?', mes), 'Ex.: 300 pedidos, R$ 60 mil, casa cheia na sexta. Um número só.', '["Mais pedidos no delivery","Salão mais cheio","Ticket maior","Clientes novos"]'::jsonb),
      jsonb_build_array('vendas', 'Qual pergunta ou reclamação você mais ouve no WhatsApp ou no balcão?', 'Ex.: "demora a entrega", "tem opção sem lactose?". Vira conteúdo que responde antes.', '["Demora","Preço","Taxa de entrega","Não sabia que vocês tinham…"]'::jsonb),
      jsonb_build_array('consultoria', format('Tem data, evento ou feriado que mexe com o movimento em %s?', mes), 'Planejamos antes para não perder a data.', '["Não tem","Natal / Ano-novo","Jogo / evento na cidade","Aniversário da casa","Férias escolares"]'::jsonb),
      jsonb_build_array('vendas', 'Qual dia ou horário fica mais vazio? O que faria a pessoa vir (ou pedir) nesse momento?', 'Ex.: "terça à noite; rodízio a preço fixo puxaria".', '["Segunda","Terça","Quarta","Almoço","Fim de tarde"]'::jsonb),
      jsonb_build_array('audiovisual', 'Qual prato tem a melhor história? Receita da família, ingrediente especial, jeito de fazer?', 'História vira vídeo que ninguém mais pode copiar.', '[]'::jsonb),
      jsonb_build_array('consultoria', format('O que muda em %s? Prato novo, preço novo, horário, equipe, reforma?', mes), 'Novidade é assunto pronto.', '["Nada novo","Prato novo","Preço novo","Horário novo","Reforma"]'::jsonb),
      jsonb_build_array('consultoria', format('Em %s, tem algo que a gente NÃO deve falar ou mostrar?', mes), 'Evita retrabalho e erro com o público.', '["Nada","Preços","Rosto da equipe","A cozinha","iFood"]'::jsonb))
    when 'saude' then jsonb_build_array(
      jsonb_build_array('vendas', format('Qual procedimento ou consulta você mais quer encher a agenda em %s? Qual o valor ou a condição?', mes), 'Ex.: "botox, R$ 1.200 em 3x". É o centro do mês.', '[]'::jsonb),
      jsonb_build_array('consultoria', format('Quantos atendimentos fariam %s ser um mês bom?', mes), 'Um número: agendas, avaliações, pacientes novos.', '["Mais pacientes novos","Mais retornos","Ticket maior","Agenda cheia"]'::jsonb),
      jsonb_build_array('vendas', 'Qual a dúvida ou o medo que o paciente mais traz antes de fechar?', 'Ex.: "dói?", "fica artificial?", "quanto tempo dura?". Vira conteúdo que tranquiliza.', '["Dor","Preço","Resultado artificial","Tempo de recuperação","Segurança"]'::jsonb),
      jsonb_build_array('consultoria', format('Tem data ou campanha em %s (mês temático, aniversário, congresso)?', mes), 'Planejamos antes.', '["Não tem","Mês temático (ex.: Novembro Azul)","Aniversário da clínica","Congresso / curso","Férias"]'::jsonb),
      jsonb_build_array('audiovisual', 'Tem um caso que mostra bem o seu cuidado ou resultado? O paciente autorizou mostrar?', 'Só usamos antes e depois com autorização por escrito.', '["Sim, com autorização","Sim, sem autorização ainda","Não"]'::jsonb),
      jsonb_build_array('consultoria', format('Quantos horários livres você tem por semana em %s?', mes), 'Para não prometer o que a agenda não aguenta.', '["Poucos (até 5)","De 5 a 15","Mais de 15","Agenda cheia"]'::jsonb),
      jsonb_build_array('consultoria', format('O que muda em %s? Procedimento novo, aparelho, preço, sala?', mes), 'Novidade é assunto pronto.', '["Nada novo","Procedimento novo","Aparelho novo","Preço novo"]'::jsonb),
      jsonb_build_array('consultoria', 'O que o conselho da sua profissão (ou você) não deixa falar ou mostrar?', 'Ex.: preço no post, promessa de resultado, rosto de paciente.', '["Preço","Promessa de resultado","Rosto de paciente","Antes e depois"]'::jsonb))
    when 'varejo' then jsonb_build_array(
      jsonb_build_array('vendas', format('Qual produto você mais quer vender em %s? Tem estoque parado que precisa girar?', mes), 'Ex.: "óculos de sol, 40 peças paradas". É o centro do mês.', '[]'::jsonb),
      jsonb_build_array('consultoria', format('Qual número faria %s ser um mês bom?', mes), 'Ex.: 120 vendas, R$ 80 mil, 30 clientes novos.', '["Vender mais","Girar estoque","Ticket maior","Clientes novos"]'::jsonb),
      jsonb_build_array('vendas', 'O que o cliente mais pergunta antes de comprar?', 'Ex.: parcelamento, entrega, garantia, tamanho. Vira conteúdo que responde antes.', '["Preço / parcelamento","Entrega","Garantia","Tamanho / modelo","Troca"]'::jsonb),
      jsonb_build_array('consultoria', format('Tem data ou evento que mexe com as vendas em %s?', mes), 'Planejamos antes.', '["Não tem","Natal","Black Friday","Volta às aulas","Aniversário da loja"]'::jsonb),
      jsonb_build_array('vendas', 'Vende mais na loja, no WhatsApp ou online? Onde quer crescer?', 'Para colocar a força onde dá resultado.', '["Loja física","WhatsApp","Site / online","Marketplace"]'::jsonb),
      jsonb_build_array('audiovisual', 'Qual produto chegou ou vai chegar e merece ser mostrado?', 'Lançamento é assunto pronto.', '[]'::jsonb),
      jsonb_build_array('consultoria', format('Tem condição especial em %s (frete, parcelamento, brinde, combo)?', mes), 'A oferta certa decide a venda.', '["Frete grátis","Parcelamento maior","Brinde","Combo","Nenhuma"]'::jsonb),
      jsonb_build_array('consultoria', format('Em %s, tem algo que a gente NÃO deve falar ou mostrar?', mes), 'Evita retrabalho e erro.', '["Nada","Preços","Marca do fornecedor","Concorrentes"]'::jsonb))
    when 'b2b' then jsonb_build_array(
      jsonb_build_array('vendas', format('Que tipo de empresa você mais quer atrair em %s (ramo, porte, região)?', mes), 'Ex.: "hotéis de Porto de Galinhas com mais de 50 quartos".', '[]'::jsonb),
      jsonb_build_array('consultoria', format('Qual número faria %s ser um mês bom?', mes), 'Ex.: 10 cotações, 3 contratos, R$ 200 mil fechados.', '["Mais cotações","Mais contratos","Contrato maior","Cliente novo de peso"]'::jsonb),
      jsonb_build_array('vendas', 'Quem decide a compra do lado do cliente e o que faz ele desistir?', 'Ex.: "comprador; acha caro sem ver o custo da parada".', '["Dono","Comprador","Engenheiro / técnico","Preço","Prazo"]'::jsonb),
      jsonb_build_array('vendas', 'Qual problema caro o cliente evita trabalhando com vocês? Tem um número?', 'Ex.: "máquina parada custa R$ 30 mil por dia". Número convence empresa.', '[]'::jsonb),
      jsonb_build_array('consultoria', format('Tem feira, evento ou época forte do setor em %s?', mes), 'Planejamos antes.', '["Não tem","Feira do setor","Fim de ano (orçamento)","Safra / temporada"]'::jsonb),
      jsonb_build_array('audiovisual', 'Tem um cliente ou trabalho que dá para mostrar (com autorização)?', 'Caso real é a prova mais forte no B2B.', '["Sim, com nome","Sim, sem o nome","Não"]'::jsonb),
      jsonb_build_array('consultoria', format('O que muda em %s? Serviço novo, equipamento, equipe, região atendida?', mes), 'Novidade é assunto pronto.', '["Nada novo","Serviço novo","Equipamento novo","Nova região"]'::jsonb),
      jsonb_build_array('consultoria', 'O que a gente NÃO pode falar (preço, clientes, fornecedores)?', 'Evita problema com contrato e parceiro.', '["Nada","Preços","Nome dos clientes","Fornecedores"]'::jsonb))
    else jsonb_build_array(
      jsonb_build_array('vendas', format('Qual serviço você mais quer vender em %s? Quanto custa ou a partir de quanto?', mes), 'Ex.: "instalação de ar-condicionado, a partir de R$ 450". É o centro do mês.', '[]'::jsonb),
      jsonb_build_array('consultoria', format('Qual número faria %s ser um mês bom?', mes), 'Ex.: 40 orçamentos, 15 fechados, R$ 50 mil.', '["Mais orçamentos","Mais fechamentos","Ticket maior","Clientes novos"]'::jsonb),
      jsonb_build_array('vendas', 'Qual o motivo que mais faz o cliente desistir de fechar?', 'Ex.: "acha caro", "vai pensar", "fechou com outro mais barato".', '["Preço","Vai pensar","Prazo","Desconfiança","Escolheu outro"]'::jsonb),
      jsonb_build_array('consultoria', format('Tem data, estação ou evento que mexe com a procura em %s?', mes), 'Planejamos antes.', '["Não tem","Calor / chuva","Fim de ano","Férias","Aniversário da empresa"]'::jsonb),
      jsonb_build_array('audiovisual', 'Tem um trabalho recente que deu orgulho (antes e depois, obra, projeto)?', 'Trabalho real é a melhor prova.', '[]'::jsonb),
      jsonb_build_array('vendas', 'Quanto tempo leva do primeiro contato até fechar? Onde o cliente some?', 'Para o atendimento não deixar escapar.', '["No mesmo dia","Até 1 semana","Mais de 1 semana","Some depois do orçamento"]'::jsonb),
      jsonb_build_array('consultoria', format('O que muda em %s? Serviço novo, preço, equipe, região?', mes), 'Novidade é assunto pronto.', '["Nada novo","Serviço novo","Preço novo","Nova região"]'::jsonb),
      jsonb_build_array('consultoria', format('Em %s, tem algo que a gente NÃO deve falar ou mostrar?', mes), 'Evita retrabalho e erro.', '["Nada","Preços","Rosto da equipe","Clientes"]'::jsonb))
  end;

  -- Até 2 perguntas do diagnóstico deste cliente que ainda não foram respondidas.
  for dq in select q from public.consult_docs d, jsonb_array_elements(coalesce(d.doc->'do_cliente', '[]'::jsonb)) q
            where d.client_id = _client and coalesce(q->>'pergunta', '') <> ''
              and not exists (select 1 from public.client_questions x where x.client_id = _client and lower(x.question) = lower(q->>'pergunta') and x.status in ('respondida', 'enviada'))
  loop
    exit when k >= 2;
    qs := qs || jsonb_build_array(jsonb_build_array('consultoria', dq->>'pergunta', coalesce(nullif(dq->>'por_que', ''), 'Ficou em aberto no diagnóstico.'), '[]'::jsonb));
    k := k + 1;
  end loop;

  -- Pacote do mês ainda intocado: as perguntas antigas que não estão na lista nova saem (descartada).
  select not exists (select 1 from public.client_questions where client_id = _client and pack = 'briefing_mes' and focus = m and (status <> 'pendente' or answer is not null))
    into untouched;
  if untouched then
    update public.client_questions set status = 'descartada'
    where client_id = _client and pack = 'briefing_mes' and focus = m and status = 'pendente'
      and lower(question) not in (select lower(e->>1) from jsonb_array_elements(qs) e);
  end if;

  for r in select (e->>0) area, (e->>1) question, (e->>2) why, (e->3) options, ord from jsonb_array_elements(qs) with ordinality t(e, ord) loop
    insert into public.client_questions (client_id, area, pack, focus, question, why, required, status, source, options)
    values (_client, r.area, 'briefing_mes', m, r.question, r.why, r.ord in (1, 2), 'pendente', 'briefing', r.options)
    on conflict (client_id, area, lower(question)) do update set status = 'pendente', pack = 'briefing_mes', focus = m
      where (public.client_questions.status = 'descartada' and public.client_questions.pack = 'briefing_mes')
         or (public.client_questions.status = 'pendente' and public.client_questions.pack is null and public.client_questions.answer is null);
    if found then n := n + 1; end if;
  end loop;
  return n;
end $function$;
grant execute on function public.brief_questions_ensure(uuid, date) to authenticated;
revoke execute on function public.brief_niche(uuid) from public, anon;
