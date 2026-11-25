-- Referência e arte pronta de qualquer tipo e tamanho (pedido do Italo, 25/11/2026). O plano gratuito do Supabase
-- aceita até 50 MB por arquivo: o maior sobe em partes (<arquivo>.part0, .part1, ...) e a função content-download junta
-- as partes na hora de baixar, com o nome e a extensão originais. size_bytes continua com o teto antigo (a checagem da
-- tabela); o tamanho real fica em real_size.
alter table public.content_files
  add column if not exists parts int not null default 0,
  add column if not exists real_size bigint;

create or replace function public.content_file_parts(_file_id uuid, _parts int, _size bigint)
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform public.content_require_access();
  if _parts < 1 or _parts > 200 or _size < 1 then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  update public.content_files set parts = _parts, real_size = _size where id = _file_id and uploaded_by = (select auth.uid());
end $$;
revoke execute on function public.content_file_parts(uuid, int, bigint) from public, anon;
grant execute on function public.content_file_parts(uuid, int, bigint) to authenticated;

-- Qualquer tipo de arquivo no balde das artes (antes só imagem, vídeo, PDF e alguns áudios).
update storage.buckets set allowed_mime_types = null where id = 'content-files';
