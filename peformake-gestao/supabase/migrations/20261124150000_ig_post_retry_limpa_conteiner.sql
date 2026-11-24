-- Tentar de novo uma publicação com erro cria uma mídia nova na Meta (o contêiner antigo pode ter vencido).
do $do$
declare _def text;
begin
  _def := pg_get_functiondef('public.ig_post_save(uuid,uuid,uuid,text,text,text,text,timestamptz)'::regprocedure);
  _def := replace(_def, $x$scheduled_at = _at, status = 'agendado', error = null, tries = 0$x$, $x$scheduled_at = _at, status = 'agendado', error = null, tries = 0, container_id = null$x$);
  if _def not like '%container_id = null%' then raise exception 'ig_post_save: não trocado'; end if;
  execute _def;
end $do$;
