-- Peça preenchida por etapas, guiada pelo tipo (pedido do Italo, 12/11/2026).
-- Tipos novos: impressao (flyer/cardápio/cartão), banner (banner/adesivo/lona), vetor (logo/arte vetorizada).
-- Sem mexer na trava de content_items.kind (trocar exigiria DROP): o tipo novo fica em piece_type e kind segue 'post',
-- então contagens de entregas (client_service_status), portal e relatórios continuam contando como arte.
-- Campos de cada tipo (tamanho, material, acabamento, quantidade, formatos do vetor, objetivo do carrossel) ficam em spec.

alter table public.content_items add column if not exists piece_type text;
alter table public.content_items add column if not exists spec jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'content_items_piece_type_check') then
    alter table public.content_items add constraint content_items_piece_type_check
      check (piece_type is null or piece_type in ('impressao', 'banner', 'vetor'));
  end if;
end $$;

create or replace function public.content_item_save(_item_id uuid, _expected_updated_at timestamp with time zone, _data jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _plan public.content_plans;
  _item public.content_items;
  _id uuid;
  _type text := coalesce(_data ->> 'kind', 'post');
  _kind text;
  _ptype text;
begin
  if not public.can_plan_content() then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if _type not in ('post', 'carrossel', 'story', 'reels', 'anuncio', 'impressao', 'banner', 'vetor')
    or (_data ? 'carousel_slides' and jsonb_typeof(_data -> 'carousel_slides') <> 'array')
    or (_data ? 'spec' and (jsonb_typeof(_data -> 'spec') <> 'object' or length((_data -> 'spec')::text) > 8000)) then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  _ptype := case when _type in ('impressao', 'banner', 'vetor') then _type end;
  _kind := case when _ptype is not null then 'post' else _type end;
  if _item_id is null then
    select * into _plan from public.content_plans where id = (_data ->> 'plan_id')::uuid;
    if not found then
      raise exception 'Nao encontrado' using errcode = 'PF004';
    end if;
    insert into public.content_items (plan_id, client_id, number, kind, piece_type, is_extra, updated_by)
    values (_plan.id, _plan.client_id,
      coalesce((select max(number) from public.content_items where plan_id = _plan.id), 0) + 1,
      _kind, _ptype, coalesce((_data ->> 'is_extra')::boolean, false), (select auth.uid()))
    returning id into _id;
  else
    select * into _item from public.content_items where id = _item_id for update;
    if not found then
      raise exception 'Nao encontrado' using errcode = 'PF004';
    end if;
    if _expected_updated_at is not null and _item.updated_at <> _expected_updated_at then
      raise exception 'Alterado por outra pessoa' using errcode = 'PF001';
    end if;
    if _item.status in ('client_review', 'approved', 'published') then
      raise exception 'Peca travada' using errcode = 'PF001';
    end if;
    _id := _item_id;
  end if;
  update public.content_items set
    kind = _kind,
    piece_type = _ptype,
    spec = case when _data ? 'spec' then _data -> 'spec' else spec end,
    title = nullif(trim(coalesce(_data ->> 'title', '')), ''),
    headline = nullif(trim(coalesce(_data ->> 'headline', '')), ''),
    subtitle = nullif(trim(coalesce(_data ->> 'subtitle', '')), ''),
    cta = nullif(trim(coalesce(_data ->> 'cta', '')), ''),
    briefing = nullif(trim(coalesce(_data ->> 'briefing', '')), ''),
    caption = nullif(trim(coalesce(_data ->> 'caption', '')), ''),
    observations = nullif(trim(coalesce(_data ->> 'observations', '')), ''),
    carousel_slides = coalesce(_data -> 'carousel_slides', carousel_slides),
    reference_links = case when _data ? 'reference_links'
      then array(select v from jsonb_array_elements_text(_data -> 'reference_links') v where v ~ '^https?://' limit 20) else reference_links end,
    publish_date = nullif(_data ->> 'publish_date', '')::date,
    deadline = nullif(_data ->> 'deadline', '')::date,
    designer_id = nullif(_data ->> 'designer_id', '')::uuid,
    updated_at = now(), updated_by = (select auth.uid())
  where id = _id;
  return _id;
end;
$function$;

-- Portal: tipo novo aparece com nome legível (o portal mostra o texto quando não conhece o tipo).
create or replace function public.portal_content(_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _client uuid := public.portal_resolve(_token);
begin
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'number', i.number,
        'kind', case i.piece_type when 'impressao' then 'Impressão' when 'banner' then 'Banner' when 'vetor' then 'Vetor' else i.kind end,
        'status', i.status, 'title', i.title, 'caption', i.caption,
        'publish_date', i.publish_date, 'month', p.month, 'revision_note', i.revision_note,
        'files', coalesce((select jsonb_agg(jsonb_build_object('path', f.path, 'mime', f.mime, 'name', f.name) order by f.created_at)
                           from public.content_files f where f.item_id = i.id and f.role = 'final'), '[]'::jsonb),
        'legacy_urls', to_jsonb(i.legacy_final_urls)
      ) order by p.month desc, i.number)
      from public.content_items i join public.content_plans p on p.id = i.plan_id
      where i.client_id = _client and i.status in ('client_review', 'changes_requested', 'approved', 'published')
        and p.month >= date_trunc('month', now() - interval '3 months')::date
    ), '[]'::jsonb),
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'title', v.title, 'status', v.status, 'final_link', v.final_link,
        'month', v.month, 'revision_note', v.revision_note) order by v.updated_at desc)
      from public.av_projects v
      where v.client_id = _client and v.status in ('client_review', 'changes_requested', 'approved', 'delivered')
        and v.updated_at > now() - interval '120 days'
    ), '[]'::jsonb)
  );
end;
$function$;
