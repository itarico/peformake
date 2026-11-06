-- Login único (equipe e cliente pelo mesmo Entrar). Parte 1 aplicada: is_team, portal_users, client_portal_links.user_id, portal_my_token.
-- Parte 2 (aplicar): um link ativo da equipe e um por cliente logado; portal_create_link só revoga o link da equipe;
-- leituras que estavam abertas a qualquer logado passam a exigir ser da equipe.
create unique index if not exists client_portal_links_one_team_link on public.client_portal_links (client_id) where revoked_at is null and user_id is null;
create unique index if not exists client_portal_links_one_user_link on public.client_portal_links (user_id) where revoked_at is null and user_id is not null;
drop index if exists public.client_portal_links_one_active;
