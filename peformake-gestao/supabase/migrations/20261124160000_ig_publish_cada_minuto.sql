-- Agendado sai no minuto marcado (antes podia atrasar até 5 minutos). A rotina só chama a função quando há algo vencido.
select cron.alter_job((select jobid from cron.job where jobname = 'ig-publish'), schedule := '* * * * *');
update public.automation_catalog set schedule = 'A cada minuto' where cron_job = 'ig-publish';
