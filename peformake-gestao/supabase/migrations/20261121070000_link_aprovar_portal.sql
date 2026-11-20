-- Social/Design (revisão de ponta a ponta, 21/11): o link de "arte/vídeo pronto para aprovar" abria o portal inteiro e,
-- com briefing abaixo de 80% ou perguntas do mês, o cliente caía na conversa obrigatória sem ver a arte.
-- Agora o link termina em /aprovar: o portal pula a conversa e rola até "Artes e vídeos" (portalRules.startTab).
-- Troca só a montagem do link no texto atual de cada função (falha se o trecho não for achado).
do $$
declare _def text; _new text;
begin
  _def := pg_get_functiondef('public.content_delivery_notify(uuid)'::regprocedure);
  _new := replace(_def, $a$_url := '' || public.app_base_url() || '/portal#' || _token;$a$,
                         $a$_url := '' || public.app_base_url() || '/portal#' || _token || '/aprovar';$a$);
  if _new = _def then raise exception 'content_delivery_notify: trecho do link nao encontrado'; end if;
  execute _new;

  _def := pg_get_functiondef('public.av_client_review_notify'::regproc);
  _new := replace(_def, $a$_url := public.client_portal_auto_url(_p.client_id);$a$,
                         $a$_url := public.client_portal_auto_url(_p.client_id) || '/aprovar';$a$);
  if _new = _def then raise exception 'av_client_review_notify: trecho do link nao encontrado'; end if;
  execute _new;
end $$;
