-- Pastas "Estratégia" e "Relatórios" nos arquivos do cliente e upload do agente do Claude (função agent-upload).
-- Decisão do Italo (12/11/2026): estratégias e relatórios são feitos pelo agente do Claude e o PDF sobe na pasta do cliente.
-- Aplicada em 12/11/2026 (nuvem).
alter table public.client_assets drop constraint if exists client_assets_folder_check;
alter table public.client_assets add constraint client_assets_folder_check check (folder = any (array['estrategia','relatorios','design','trafego','audiovisual','social','contratos','outros']));
alter table public.client_assets drop constraint if exists client_assets_source_check;
alter table public.client_assets add constraint client_assets_source_check check (source = any (array['manual','creative','report','strategy','whatsapp','agente']));
-- Token curto para o upload (criado por quem tem acesso ao SQL; vale 2 h e até 50 envios).
create table if not exists public.agent_upload_tokens (
  token text primary key,
  expires_at timestamptz not null default now() + interval '2 hours',
  uses int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.agent_upload_tokens enable row level security;
