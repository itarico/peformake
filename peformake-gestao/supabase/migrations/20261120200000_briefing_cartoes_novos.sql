-- Briefing fixo reorganizado (Italo, 20/11): cartões juntos e 3 novos. As chaves antigas continuam em client_briefs.data;
-- o briefing em conversa passa a conhecer as novas (marketing, sazonalidade, marca e os valores só para admin na tela).
update public.agent_instructions
set body = replace(body,
  '- Fixos do cliente (client_briefs.data): publico, diferenciais, voz (como a marca fala), proibidos, quem_aparece (nos vídeos), quem_grava, capacidade (de atendimento).',
  '- Fixos do cliente (client_briefs.data): publico, posicionamento (inclui diferenciais), proposito (inclui a história), momento (forças, fraquezas, visão e capacidade de atendimento), jornada (como o cliente compra e as objeções), voz (jeito da marca: arquétipo, como fala e proibidos), percepcao, quem_aparece (nos vídeos), quem_grava, marketing (o que já fizeram, o que funcionou e o que não), sazonalidade (o porquê) com meses_fortes e meses_fracos (números de 1 a 12; não pergunte datas comemorativas, o sistema já sabe), marca (logo, cores, fontes, fotos e acessos: Instagram, gerenciador de anúncios, Google; nunca peça senha), verba_anuncio, ticket_medio e faturamento_mes (valores: grave, mas não repita no texto dos outros campos). As chaves antigas (diferenciais, historia, visao, capacidade, objecoes, arquetipo, proibidos) continuam valendo: leia, não apague.'),
  updated_at = now()
where name = 'briefing-conversa';
