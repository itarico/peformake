-- Aviso "Design entregou" (sininho e WhatsApp do social) e "Arte para revisar" abrem a aba Revisar do cliente no Social Media
-- (pedido do Italo, 24/11/2026). Troca só o link dentro das funções existentes.
do $do$
declare _def text;
begin
  _def := pg_get_functiondef('public.content_delivery_notify(uuid)'::regprocedure);
  _def := replace(_def, $x$'/conteudo/peca/' || _i.id, _i.client_id);$x$, $x$'/conteudo/cliente/' || _i.client_id || '?aba=revisar', _i.client_id);$x$);
  _def := replace(_def, $x$public.app_base_url() || '/conteudo/peca/' || _i.id,$x$, $x$public.app_base_url() || '/conteudo/cliente/' || _i.client_id || '?aba=revisar',$x$);
  if _def like '%/conteudo/peca/%' then raise exception 'content_delivery_notify: link não trocado'; end if;
  execute _def;

  _def := pg_get_functiondef('public.content_item_set_status(uuid,text,text)'::regprocedure);
  _def := replace(_def, $x$'content_review', 'Arte para revisar: ' || _label, _client, _link, _i.client_id);$x$,
                        $x$'content_review', 'Arte para revisar: ' || _label, _client, '/conteudo/cliente/' || _i.client_id || '?aba=revisar', _i.client_id);$x$);
  if _def not like '%?aba=revisar%' then raise exception 'content_item_set_status: link não trocado'; end if;
  execute _def;
end $do$;
