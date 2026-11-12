-- Perguntas do diagnóstico: opção "Todas" manda todas as perguntas abertas num link só (até 30). O padrão na tela continua 4.
-- Aplicada em 12/11/2026 (nuvem) trocando o limite 4 por 30 em client_chat_open (o resto da função igual).
do $do$ declare _src text; begin
  _src := pg_get_functiondef('public.client_chat_open'::regproc);
  _src := replace(replace(_src, 'cardinality(_ids_ok) > 4 then raise exception ''Escolha no máximo 4 perguntas por conversa''', 'cardinality(_ids_ok) > 30 then raise exception ''Escolha no máximo 30 perguntas por conversa'''), '_answered + cardinality(_ids_ok) > 4', '_answered + cardinality(_ids_ok) > 30');
  execute _src;
end $do$;
