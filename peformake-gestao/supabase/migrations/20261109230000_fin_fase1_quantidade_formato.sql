-- Financeiro · Fase 1, passo 2: quantidade e formato de cada serviço, preenchidos uma vez.
-- Antes: o que o cliente recebe no mês era texto livre ("12 artes por mês"); nada comparava entregue × contratado.
-- Agora:
--   services.delivery_qty / delivery_format: o padrão do catálogo (entregas por unidade contratada, por mês).
--   client_services.deliver_qty / deliver_format: o combinado com este cliente (vale acima do padrão).
--   client_service_deliverable(): entregas do mês = combinado do cliente, ou quantidade × padrão do catálogo.

alter table public.services
  add column if not exists delivery_qty numeric(8,2) check (delivery_qty is null or delivery_qty > 0),
  add column if not exists delivery_format text;
alter table public.client_services
  add column if not exists deliver_qty integer check (deliver_qty is null or deliver_qty between 0 and 1000),
  add column if not exists deliver_format text;

-- Padrões do catálogo, tirados das próprias descrições dos pacotes.
update public.services set delivery_qty = 1, delivery_format = coalesce(delivery_format, 'arte') where name = 'Design' and delivery_qty is null;
update public.services set delivery_qty = 4, delivery_format = coalesce(delivery_format, 'relatório semanal') where name = 'Tráfego' and delivery_qty is null;
update public.services set delivery_qty = 1, delivery_format = coalesce(delivery_format, 'estratégia') where name = 'Consultoria' and delivery_qty is null;
update public.services set delivery_qty = q.n, delivery_format = coalesce(delivery_format, 'vídeo editado')
from (values ('Plano Mobile Quinzenal', 8), ('Plano Mobile Semanal', 16), ('Plano Mobile Premium', 24),
             ('Plano Câmera Mensal', 6), ('Plano Câmera Quinzenal', 12), ('Plano Câmera Diária', 10)) as q(name, n)
where services.name = q.name and services.delivery_qty is null;

create or replace function public.client_service_deliverable(_cs uuid)
returns table(qty numeric, format text, unit text)
language sql stable security definer set search_path to '' as $$
  select coalesce(cs.deliver_qty::numeric, case when s.delivery_qty is not null then coalesce(cs.quantity, 1) * s.delivery_qty end),
    coalesce(nullif(cs.deliver_format, ''), s.delivery_format, s.delivery_unit), s.delivery_unit
  from public.client_services cs join public.services s on s.id = cs.service_id
  where cs.id = _cs
$$;
grant execute on function public.client_service_deliverable(uuid) to authenticated;

-- Salvar o combinado de entregas do serviço do cliente (vazio = volta ao padrão do catálogo).
create or replace function public.client_service_set_delivery(_client_service_id uuid, _qty integer, _format text)
returns void language plpgsql security definer set search_path to '' as $function$
declare _client uuid;
begin
  perform public.clients_require_manager();
  select client_id into _client from public.client_services where id = _client_service_id for update;
  if _client is null then raise exception 'Servico nao encontrado' using errcode = 'PF004'; end if;
  if _qty is not null and _qty not between 0 and 1000 then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  update public.client_services set deliver_qty = _qty, deliver_format = nullif(trim(coalesce(_format, '')), '') where id = _client_service_id;
  update public.clients set updated_at = now(), updated_by = (select auth.uid()) where id = _client;
end $function$;
revoke execute on function public.client_service_set_delivery(uuid, integer, text) from public, anon;
grant execute on function public.client_service_set_delivery(uuid, integer, text) to authenticated;

-- Produção Audiovisual: a quantidade cadastrada já é o número de produções no mês.
-- Social Mídia: o combinado do mês é o próprio planejamento do mês (sem digitar quantidade).
update public.services set delivery_qty = 1, delivery_format = coalesce(delivery_format, 'produção') where name = 'Produção Audiovisual' and delivery_qty is null;
update public.services set delivery_format = coalesce(delivery_format, 'conforme o planejamento do mês') where name = 'Social Mídia';
update public.services set delivery_qty = 4, delivery_format = coalesce(delivery_format, 'vídeo editado') where name = 'Visita mobile' and delivery_qty is null;
update public.services set delivery_qty = 6, delivery_format = coalesce(delivery_format, 'vídeo editado') where name = 'Captação com câmera' and delivery_qty is null;
