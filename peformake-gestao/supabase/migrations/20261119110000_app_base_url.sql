-- Endereço do sistema num lugar só (preparar a troca para https://peformake.com quando o DNS propagar).
-- Fonte única no banco: av_settings.site_url (padrão https://peformake-gestao.vercel.app).
-- Para trocar: update public.av_settings set site_url = 'https://peformake.com';
-- No front: src/lib/siteUrl.ts. Na edge member-access: lê public.app_base_url().
create or replace function public.app_base_url()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rtrim(coalesce((select nullif(trim(site_url), '') from public.av_settings limit 1), 'https://peformake-gestao.vercel.app'), '/')
$$;
grant execute on function public.app_base_url() to anon, authenticated, service_role;

-- As funções que tinham o link fixo passam a usar app_base_url() (só troca o texto; a lógica fica igual).
do $do$
declare
  f regprocedure;
  def text;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.proname <> 'app_base_url'
      and pg_get_functiondef(p.oid) like '%https://peformake-gestao.vercel.app%'
  loop
    def := replace(pg_get_functiondef(f), 'https://peformake-gestao.vercel.app', ''' || public.app_base_url() || ''');
    execute def;
  end loop;
end
$do$;
