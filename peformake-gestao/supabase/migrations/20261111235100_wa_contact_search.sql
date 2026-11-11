-- Novo cliente: buscar o responsável nos contatos do WhatsApp (nome ou parte do número), sem acento e sem maiúscula.
-- Só para quem cadastra cliente (admin ou head de marketing). Até 6 contatos, sem grupos e sem ocultos.
-- Diz se o número já é de um cliente (pelo vínculo do contato ou pelo telefone do cliente/contato), para não duplicar.
create or replace function public.wa_contact_search(_q text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  _from text := 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';
  _to   text := 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn';
  _t text := lower(translate(trim(coalesce(_q, '')), _from, _to));
  _d text := regexp_replace(coalesce(_q, ''), '\D', '', 'g');
begin
  if not public.can_manage_clients() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if length(_t) < 2 then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(r order by r.score desc, r.last desc nulls last)
    from (
      select w.id, w.phone, coalesce(nullif(trim(w.display_name), ''), nullif(trim(w.verified_name), ''), nullif(trim(w.wa_name), '')) as name,
        w.avatar_path, w.last_message_at as last,
        coalesce(c1.name, c2.name) as client_name,
        case when lower(translate(coalesce(w.display_name, '') || ' ' || coalesce(w.wa_name, ''), _from, _to)) like _t || '%' then 3
             when length(_d) >= 4 and w.phone like '%' || _d || '%' then 2 else 1 end as score
      from public.wa_contacts w
      left join public.clients c1 on c1.id = w.client_id
      left join lateral (
        select c.name from public.clients c
        where w.phone is not null and right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 8) = right(w.phone, 8) and length(w.phone) >= 8
        union all
        select c.name from public.client_contacts cc join public.clients c on c.id = cc.client_id
        where w.phone is not null and right(regexp_replace(coalesce(cc.phone, ''), '\D', '', 'g'), 8) = right(w.phone, 8) and length(w.phone) >= 8
        limit 1
      ) c2 on true
      where not w.is_group and not coalesce(w.hidden, false) and w.phone is not null
        and (lower(translate(coalesce(w.display_name, '') || ' ' || coalesce(w.wa_name, '') || ' ' || coalesce(w.verified_name, ''), _from, _to)) like '%' || _t || '%'
             or (length(_d) >= 3 and w.phone like '%' || _d || '%'))
      order by score desc, w.last_message_at desc nulls last
      limit 6
    ) r
  ), '[]'::jsonb);
end $$;

revoke all on function public.wa_contact_search(text) from public, anon;
grant execute on function public.wa_contact_search(text) to authenticated;
