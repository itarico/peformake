-- PENDENTE: ainda NÃO aplicada no banco (aguardando confirmação do Italo em 12/11). Aplicar com execute_sql e tirar esta linha.
-- Vídeo pronto avisa a social media (Italo, 12/11/2026).
-- Cliente com social media + audiovisual: quando a edição entrega (vai para o cliente) a social é avisada;
-- quando o cliente aprova, nasce a tarefa "Postar" na coluna Tarefas do quadro de Conteúdo, com o link do material.
-- (A troca da regra de origem foi aplicada à parte por SQL: social_tasks.source passa a aceitar 'audiovisual'.)
--   alter table public.social_tasks drop constraint social_tasks_source_check;
--   alter table public.social_tasks add constraint social_tasks_source_check
--     check (source in ('manual','pedido_cliente','estrategia','agente','novidade','audiovisual'));

create or replace function public.av_ready_for_social()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _client text; _who uuid[]; _links text; _title text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status not in ('client_review', 'approved', 'delivered') then return new; end if;
  -- Só quem também contratou social media.
  if not exists (select 1 from public.client_services cs join public.services s on s.id = cs.service_id
                 where cs.client_id = new.client_id and cs.is_active and s.area in ('social', 'design')) then return new; end if;
  select name into _client from public.clients where id = new.client_id;
  _who := public.client_staff_profiles(new.client_id, array['social_media']);
  if coalesce(cardinality(_who), 0) = 0 then _who := public.client_staff_profiles(new.client_id, array['head_marketing']); end if;
  _title := coalesce(nullif(trim(new.title), ''), 'Vídeos');
  _links := concat_ws(E'\n',
    case when new.final_link is not null then 'Vídeo final: ' || new.final_link end,
    case when coalesce(cardinality(new.raw_links), 0) > 0 then 'Material bruto e fotos: ' || array_to_string(new.raw_links, ' ') end);

  if new.status = 'client_review' then
    perform public.notify(_who, 'av_ready_social', 'Vídeo pronto, com o cliente para aprovar: ' || _title,
      _client || '. Já dá para planejar as postagens.', '/audiovisual/projeto/' || new.id, new.client_id);
  elsif not exists (select 1 from public.social_tasks t where t.ref_table = 'av_projects' and t.ref_id = new.id) then
    insert into public.social_tasks (client_id, title, description, status, source, network, priority, ref_table, ref_id)
    values (new.client_id, left('Postar: ' || _title, 200),
      left(concat_ws(E'\n\n', 'O cliente aprovou o vídeo. Programe as postagens.', _links), 4000),
      'a_fazer', 'audiovisual', 'instagram', true, 'av_projects', new.id);
    perform public.notify(_who, 'av_ready_social', 'Vídeo aprovado, pode postar: ' || _title,
      _client || '. Entrou como tarefa no quadro de Conteúdo.', '/conteudo/quadro?cliente=' || new.client_id, new.client_id);
  end if;
  return new;
end $$;

drop trigger if exists av_ready_for_social on public.av_projects;
create trigger av_ready_for_social after update of status on public.av_projects
  for each row execute function public.av_ready_for_social();
