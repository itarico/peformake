-- 07/11 (aplicado pelo MCP): login do Italo ligado ao cadastro "Italo" da equipe (staff_members.profile_id),
-- e tarefa do Tráfego sem responsável vai para o head de marketing do cliente (depois, squad).
create or replace function public.traffic_task_auto_assign() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if new.assignee_id is null and new.client_id is not null then
    select ct.staff_id into new.assignee_id from public.client_team ct
    join public.staff_members s on s.id = ct.staff_id
    where ct.client_id = new.client_id and ct.role_in_client in ('head_marketing', 'squad')
    order by case ct.role_in_client when 'head_marketing' then 0 else 1 end limit 1;
  end if;
  return new;
end $$;
-- create trigger traffic_task_auto_assign before insert on public.traffic_tasks for each row execute function public.traffic_task_auto_assign();
-- Backfill: as 38 tarefas abertas sem responsável receberam o head de marketing (28 Italo, 10 Thyfany).
