-- Guarda o motivo do erro da conexão do Instagram (texto da Meta, sem token) para diagnóstico.
alter table public.ig_connect_states add column if not exists error text;
