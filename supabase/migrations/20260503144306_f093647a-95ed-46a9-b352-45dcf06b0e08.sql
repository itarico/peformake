-- Insert default goal templates
INSERT INTO public.staff_goal_templates (name, description, tracking_method, target_value, measurement_unit, role_type)
VALUES 
('Postagem de Stories', 'Mínimo de 150 stories por mês para cada cliente da carteira', 'automatic', 150, 'stories', 'social_media'),
('Entrega Design 24h', 'Artes devem ser enviadas em no máximo 24h após o briefing', 'manual', 100, '%', 'design'),
('Reuniões Fechadas', 'Número de reuniões comerciais fechadas e qualificadas', 'manual', 5, 'reuniões', 'comercial'),
('Taxa de Retenção', 'Manter os clientes atuais ativos na base', 'automatic', 95, '%', 'cs')
ON CONFLICT DO NOTHING;

-- Insert default commission templates
INSERT INTO public.staff_commission_templates (name, description, commission_type, value)
VALUES 
('Comissão por Indicação', 'Bônus por trazer novos clientes para a agência', 'fixed', 500),
('Bônus de Performance Excedente', 'Bonificação por bater metas acima do esperado', 'percentage_of_revenue', 5),
('Bônus Produtividade Same-day', 'Bônus por entregar artes no mesmo dia', 'fixed', 50)
ON CONFLICT DO NOTHING;

-- Ensure staff_members has monthly_cost and base_salary synced if needed, 
-- but we will favor monthly_cost for financial integration.
ALTER TABLE public.staff_members ALTER COLUMN monthly_cost SET DEFAULT 0;
ALTER TABLE public.staff_members ALTER COLUMN base_salary SET DEFAULT 0;
