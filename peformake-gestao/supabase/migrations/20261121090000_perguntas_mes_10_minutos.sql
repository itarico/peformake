-- Perguntas do mês em uns 10 minutos (Italo, 20/11): ~12 perguntas visíveis contando as subperguntas.
-- Experiência e NPS misturado: preparado e DESLIGADO (automation_catalog 'nps_misturado').
update public.agent_instructions set body = replace(body,
'- 8 a 10 perguntas principais + subperguntas com `cond`.',
'- A conversa do mês dura uns 10 minutos: no máximo ~12 perguntas que o cliente VÊ, contando as subperguntas liberadas (40 a 60 s por resposta falada). Na prática: ~8 principais + subperguntas com `cond`. Prioridade: lacunas do briefing, datas do mês, mês passado e próximo, uma história; o que não couber fica para o mês seguinte (não se perde). O briefing fixo não entra nesse teto.
- Experiência e NPS (só se `automation_catalog` disser que está ligado; hoje DESLIGADO): uma pergunta aberta de experiência por serviço do cliente, no meio da conversa, e a nota de 0 a 10 a cada 3 meses (março, junho, setembro, dezembro) logo depois delas.
-'), updated_at = now()
where name = 'perguntas-do-mes' and position('uns 10 minutos' in body) = 0;

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, routine_on)
values ('nps_misturado', 'estrategia', 7, 'Experiência e NPS nas perguntas do mês',
  'Proposta do Italo em avaliação: uma pergunta aberta de experiência por serviço do cliente (posts, anúncios, gravação, atendimento) no meio das perguntas do mês, e a nota de 0 a 10 a cada 3 meses logo depois delas.',
  'Preparado no motor (questionEngine, opção nps) e na instrução perguntas-do-mes. Desligado: para ligar, passar nps: true no sistema e na função portal-brief.',
  'Março, junho, setembro e dezembro (a nota); experiência todo mês', false, 'baixo', false)
on conflict (key) do nothing;
