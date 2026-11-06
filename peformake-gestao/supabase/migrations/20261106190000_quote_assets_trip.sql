-- Orçamento: fotos dos equipamentos (bucket público, só quem edita o orçamento envia) e categorias de viagem e aluguel.
insert into storage.buckets (id, name, public) values ('quote-assets', 'quote-assets', true) on conflict (id) do nothing;
drop policy if exists quote_assets_write on storage.objects;
create policy quote_assets_write on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-assets' and (public.can_edit_catalog() or public.has_role('social_media')));
drop policy if exists quote_assets_update on storage.objects;
create policy quote_assets_update on storage.objects for update to authenticated
  using (bucket_id = 'quote-assets' and (public.can_edit_catalog() or public.has_role('social_media')));
drop policy if exists quote_assets_delete on storage.objects;
create policy quote_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'quote-assets' and (public.can_edit_catalog() or public.has_role('social_media')));

update public.av_pricing set values = jsonb_set(jsonb_set(values,
  '{menu,categories}', (values->'menu'->'categories') || '[{"id":"viagem","name":"Viagem e equipe","active":true},{"id":"equipamentos","name":"Aluguel de equipamentos","active":true}]'::jsonb),
  '{menu,items}', (values->'menu'->'items') || '[{"id":"alimentacao","categoryId":"viagem","name":"Alimentação da equipe","price":40,"unit":"diaria","active":true,"auto":"diaria_pessoa","description":"Por pessoa, por diária"},{"id":"hospedagem","categoryId":"viagem","name":"Hospedagem","price":150,"unit":"noite","active":true,"auto":"viagem_pessoa","description":"Por pessoa, por noite, quando é viagem"}]'::jsonb),
  updated_at = now()
where id and values ? 'menu' and not exists (select 1 from jsonb_array_elements(values->'menu'->'categories') c where c->>'id' = 'viagem');
