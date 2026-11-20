-- Teste de acessos antes de liberar a equipe (20/11):
-- 1) staff_members: Pix, CPF e endereço apareciam para Tráfego, Head, SDR e Closer (a política de linhas libera a lista
--    para eles). Agora a leitura direta só traz os campos de trabalho; Pix/CPF/endereço continuam nas funções do admin
--    (staff_contract_info, fin_wa_*, fin_reimburse_*), que rodam como dono.
revoke select on public.staff_members from anon, authenticated;
grant select (id, full_name, job_title, main_role, email, avatar_path, legacy_avatar_url, is_active, synced_at, profile_id, phone, skills, edited_at)
  on public.staff_members to authenticated;

-- 2) Valores só para administradores: estas funções devolviam dinheiro para qualquer cargo. Ninguém da tela chama
--    direto; as metas (role_goal_*) continuam usando por dentro (rodam como dono).
revoke execute on function public.goal_mrr_now() from public, anon, authenticated;
revoke execute on function public.goal_client_ticket(uuid) from public, anon, authenticated;
grant execute on function public.goal_mrr_now() to service_role;
grant execute on function public.goal_client_ticket(uuid) to service_role;
