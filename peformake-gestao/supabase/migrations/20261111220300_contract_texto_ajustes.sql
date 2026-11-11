-- Ajustes de texto: título sem repetir o nome do serviço, formato igual à unidade some, CNPJ/CPF vazio vira "(a preencher)".
do $do$
declare d text; f text;
begin
  d := pg_get_functiondef('public.contract_compose(uuid,uuid,text,text,text)'::regprocedure);
  d := replace(d, $x$_ttl := replace(_txt.title, '{{servico}}', upper(r.name));$x$,
    $x$_ttl := case when position(upper(r.name) in upper(replace(_txt.title, '({{servico}})', ''))) > 0 or upper(r.name) = upper(_txt.title) then trim(replace(_txt.title, ' ({{servico}})', '')) else replace(_txt.title, '{{servico}}', upper(r.name)) end;$x$);
  d := replace(d, $x$|| coalesce(', ' || nullif(r.fmt, ''), '')$x$, $x$|| coalesce(', ' || nullif(nullif(r.fmt, ''), r.delivery_unit), '')$x$);
  d := replace(d, 'coalesce(public.doc_fmt(_p.document), ', 'coalesce(nullif(public.doc_fmt(_p.document), ''''), ');
  d := replace(d, $x$coalesce(', inscrito(a) no CPF sob o nº ' || public.doc_fmt(_p.representative_document), '')$x$, $x$coalesce(', inscrito(a) no CPF sob o nº ' || nullif(public.doc_fmt(_p.representative_document), ''), '')$x$);
  execute d;
  f := pg_get_functiondef('public.staff_contract_compose(uuid,text)'::regprocedure);
  f := replace(f, 'coalesce(public.doc_fmt(_p.document), ', 'coalesce(nullif(public.doc_fmt(_p.document), ''''), ');
  f := replace(f, $x$coalesce(', inscrito(a) no CPF sob o nº ' || public.doc_fmt(_p.representative_document), '')$x$, $x$coalesce(', inscrito(a) no CPF sob o nº ' || nullif(public.doc_fmt(_p.representative_document), ''), '')$x$);
  execute f;
end $do$;
