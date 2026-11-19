-- O motor de roteiro grava o dossiê do cliente e o contexto do mês em client_scan.
-- A checagem antiga recusava 'dossie', 'contexto_roteiro' e 'hype'. Só troca a regra; nenhum dado é apagado.
-- Upsert: há UNIQUE (client_id, month, source, query); o motor usa query fixa ('motor-roteiro').
alter table public.client_scan
  drop constraint client_scan_source_check,
  add constraint client_scan_source_check check (
    source = any (array['tiktok','instagram','hashtags','perfis','ads_library','google','dossie','contexto_roteiro','hype'])
  );
