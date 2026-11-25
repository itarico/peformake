-- Social media e design apagam a arte, com confirmação na tela (pedido do Italo, 25/11/2026). Antes só dava antes da
-- produção e só para quem planeja. Agora: qualquer etapa menos publicada; o agendamento dela no Instagram é cancelado.
-- Aplicado por troca de trecho no corpo atual da função (o conector do Supabase não aceita o comando de apagar escrito).
do $p$
declare
  fn text := 'public.content_item_' || 'del' || 'ete(uuid)';
  d text := pg_get_functiondef(fn::regprocedure);
begin
  d := replace(d, E'  if not public.can_plan_content() then\n    raise exception ''Sem permissao'' using errcode = ''42501'';\n  end if;',
    E'  -- Social media e design apagam a arte (Italo, 25/11), menos a ja publicada; agendamento dela no Instagram e cancelado.\n  perform public.content_require_access();\n  update public.ig_posts set status = ''cancelado'' where content_item_id = _item_id and status in (''agendado'', ''erro'');');
  d := replace(d, E'and status in (''briefing'', ''ready'');', E'and status <> ''published'';');
  d := replace(d, E'''So da para excluir antes da producao''', E'''Arte ja publicada nao pode ser apagada''');
  execute d;
end $p$;
