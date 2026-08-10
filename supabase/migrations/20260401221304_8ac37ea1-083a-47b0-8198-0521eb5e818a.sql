
-- Flows table
CREATE TABLE public.crm_flows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_value TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access crm_flows" ON public.crm_flows FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TRIGGER update_crm_flows_updated_at
BEFORE UPDATE ON public.crm_flows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Flow nodes table
CREATE TABLE public.crm_flow_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID REFERENCES public.crm_flows(id) ON DELETE CASCADE NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'message',
  node_order INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  next_node_id UUID REFERENCES public.crm_flow_nodes(id) ON DELETE SET NULL,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_flow_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access crm_flow_nodes" ON public.crm_flow_nodes FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TRIGGER update_crm_flow_nodes_updated_at
BEFORE UPDATE ON public.crm_flow_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Flow sessions table
CREATE TABLE public.crm_flow_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID REFERENCES public.crm_flows(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_node_id UUID REFERENCES public.crm_flow_nodes(id) ON DELETE SET NULL,
  variables JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.crm_flow_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access crm_flow_sessions" ON public.crm_flow_sessions FOR ALL TO public USING (true) WITH CHECK (true);

-- Flow webhooks table
CREATE TABLE public.crm_flow_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  headers JSONB DEFAULT '{}',
  payload_template JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_flow_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access crm_flow_webhooks" ON public.crm_flow_webhooks FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TRIGGER update_crm_flow_webhooks_updated_at
BEFORE UPDATE ON public.crm_flow_webhooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
