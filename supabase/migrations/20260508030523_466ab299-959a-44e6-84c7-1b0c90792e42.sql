
-- 1. Etapas da jornada por cliente
CREATE TABLE public.client_journey_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL CHECK (stage_key IN ('data_collection','growth_class','feedback_call_21d','monthly_meeting','new_implementation','quarterly_meeting')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','overdue')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  responsible_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  notes TEXT,
  outcome_data JSONB DEFAULT '{}'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, stage_key)
);
CREATE INDEX idx_journey_stages_client ON public.client_journey_stages(client_id);
CREATE INDEX idx_journey_stages_status ON public.client_journey_stages(status);

ALTER TABLE public.client_journey_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage journey stages" ON public.client_journey_stages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_journey_stages_updated BEFORE UPDATE ON public.client_journey_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Coleta de dados (Etapa 1)
CREATE TABLE public.client_data_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  facebook TEXT,
  instagram TEXT,
  email TEXT,
  cardapio_digital_url TEXT,
  localizacao TEXT,
  whatsapp_business TEXT,
  horarios_funcionamento TEXT,
  concorrentes JSONB DEFAULT '[]'::jsonb,
  cliente_autenticou BOOLEAN NOT NULL DEFAULT false,
  collected_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  collected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_data_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage data collection" ON public.client_data_collection
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_data_collection_updated BEFORE UPDATE ON public.client_data_collection
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Reuniões da jornada
CREATE TABLE public.client_journey_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('growth_class','feedback_call','monthly','quarterly')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  responsible_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  attendees JSONB DEFAULT '[]'::jsonb,
  agenda JSONB DEFAULT '{}'::jsonb,
  outcomes TEXT,
  next_steps TEXT,
  recording_url TEXT,
  diagnostics JSONB DEFAULT '{}'::jsonb,
  seeds_planted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_journey_meetings_client ON public.client_journey_meetings(client_id);
CREATE INDEX idx_journey_meetings_date ON public.client_journey_meetings(scheduled_at);

ALTER TABLE public.client_journey_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage journey meetings" ON public.client_journey_meetings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_journey_meetings_updated BEFORE UPDATE ON public.client_journey_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Conteúdo institucional do playbook
CREATE TABLE public.playbook_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.playbook_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read playbook" ON public.playbook_content
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated edit playbook" ON public.playbook_content
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_playbook_content_updated BEFORE UPDATE ON public.playbook_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Trigger: ao criar cliente, instanciar 6 etapas pendentes
CREATE OR REPLACE FUNCTION public.create_journey_stages_for_client()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.client_journey_stages (client_id, stage_key, display_order, scheduled_at) VALUES
    (NEW.id, 'data_collection',     1, now()),
    (NEW.id, 'growth_class',        2, now() + interval '3 days'),
    (NEW.id, 'feedback_call_21d',   3, now() + interval '21 days'),
    (NEW.id, 'monthly_meeting',     4, date_trunc('month', now()) + interval '1 month'),
    (NEW.id, 'new_implementation',  5, now() + interval '45 days'),
    (NEW.id, 'quarterly_meeting',   6, now() + interval '90 days')
  ON CONFLICT (client_id, stage_key) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_journey_on_client_insert
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.create_journey_stages_for_client();

-- 6. Backfill: criar etapas para clientes ativos existentes
INSERT INTO public.client_journey_stages (client_id, stage_key, display_order)
SELECT c.id, s.stage_key, s.ord
FROM public.clients c
CROSS JOIN (VALUES
  ('data_collection', 1),
  ('growth_class', 2),
  ('feedback_call_21d', 3),
  ('monthly_meeting', 4),
  ('new_implementation', 5),
  ('quarterly_meeting', 6)
) AS s(stage_key, ord)
WHERE c.is_active = true
ON CONFLICT (client_id, stage_key) DO NOTHING;

-- 7. Seed do conteúdo institucional do playbook
INSERT INTO public.playbook_content (section_key, title, content_md, display_order) VALUES
('overview', 'Visão Geral', E'Padronizar o comportamento, processos e entregas do time operacional da Performake, garantindo qualidade consistente, alinhamento entre squads, melhor experiência do cliente e escalabilidade operacional.\n\nA jornada é dividida em duas linhas:\n- **Operacional** → executada pelo Squad Operacional\n- **Experience** → executada por outros setores\n\nO foco do playbook é o operacional.', 1),
('stage_1', '1. Coleta de Dados', E'**Quando:** Antes da reunião de Growth Class.\n**Responsável:** Executor de Projeto.\n**Objetivo:** Coletar o máximo de informações para estudo estratégico inicial.\n\n**Dados:** Facebook, Instagram, E-mail, Cardápio digital, Localização, WhatsApp Business, Horários, Concorrentes.\n\n*Cliente deve estar presente para autenticação de acessos.*', 2),
('stage_2', '2. Growth Class', E'**Quando:** No onboarding (o mais rápido possível).\n**Responsáveis:** Todo o time.\n\nReunião estratégica para posicionar autoridade, diagnosticar gargalos, alinhar expectativas, gerar confiança e preparar futuras vendas consultivas.\n\n**Conceito:** "Plantar sementes" — mostrar oportunidades sem vender diretamente.', 3),
('stage_3', '3. Ligação de Feedback', E'**Quando:** 21 dias após início da operação.\n**Responsável:** Coordenadores.\n\nConversa breve, consultiva e estratégica para avaliar satisfação, identificar gargalos, fortalecer relacionamento e antecipar problemas.', 4),
('stage_4', '4. Reunião Mensal', E'**Quando:** Todo mês.\n**Responsável:** Head Operacional.\n\n1. **Retrospectiva** — Resultados, metas, dados, ajustes, transparência\n2. **Direcionamento Estratégico** — Próximos passos, oportunidades, escala\n3. **Semeando Soluções** — Sugestão de novos serviços (sem venda agressiva)', 5),
('stage_5', '5. Nova Implementação', E'**Quando:** Geralmente a partir do segundo mês.\n**Head sugere, Executor executa.**\n\nGerar percepção contínua de evolução. Primeira implementação geralmente é otimização de cardápio digital (gratuita).\n\n**Portfólio:** Otimização iFood, Captação, Google Meu Negócio, Presença Online, Disparos, Cardápio Digital.', 6),
('stage_6', '6. Reunião Trimestral', E'**Quando:** A cada 3 meses.\n**Responsável:** Head Operacional.\n\nVisão estratégica e ampla, consolidação de resultados. Sempre apresentar um novo desafio, uma nova meta e uma nova oportunidade.', 7),
('best_practices', 'Boas Práticas do Squad', E'1. **Registrar Ata de Reunião** no WhatsApp\n2. **Comunicação TAP** — Transparência, Antecipação, Proatividade\n3. **Tempo de Resposta** — Máximo 10 minutos\n4. **Cumprir Todas as Reuniões**\n5. **Contato Diário com Cliente**\n6. **Adaptar-se ao Cliente**\n7. **Última Mensagem Sempre da Equipe**\n8. **Venda é Consequência** — Foco em entrega, resultado e valor contínuo', 8);
