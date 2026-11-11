-- Consultoria: depois do teste real num cliente (Will motos, 11/11), a automação do diagnóstico fica ligada.
-- Só gera o documento interno (nada vai ao cliente); 1 geração por dia por cliente; no máximo 2 ao mesmo tempo; teto do mês em ai_settings.
update public.consult_settings set auto_enabled = true, updated_at = now() where id;
