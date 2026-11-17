-- Estratégia interativa: o agente estuda cada link do briefing (links + links_extra, menos links_off)
-- e busca referências em qualquer fonte útil (Italo, 17/11).
update public.agent_instructions
set body = replace(body,
  'O briefing vale mais que a sua leitura e que a pesquisa.',
  E'O briefing vale mais que a sua leitura e que a pesquisa.\nLinks do briefing (links e links_extra; ignore links_off): abra cada um (site, Instagram, Google Maps com nota e avaliações, cardápio/iFood, TikTok, YouTube...) e use o que achar. Os produtos do briefing podem ter vindo de uma planilha ou PDF importado: confira preços estranhos e marque em "suposicao".\nReferências de qualquer fonte útil: Instagram, TikTok, YouTube, Pinterest (foto e vídeo; foto do Pinterest só como referência de estilo), Behance, Dribbble, Vimeo, Biblioteca de Anúncios da Meta e sites. Sempre com link, porquê e número quando houver.'),
  updated_at = now()
where name = 'estrategia-interativa' and body not like '%links_extra%';
