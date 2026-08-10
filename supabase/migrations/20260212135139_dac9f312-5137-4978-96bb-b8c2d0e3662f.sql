
-- Table to store Meta OAuth connections per client (owned by Traffic module)
CREATE TABLE public.traffic_meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL,
  ad_account_name text,
  access_token text NOT NULL,
  token_expires_at timestamp with time zone,
  meta_user_id text,
  meta_user_name text,
  status text NOT NULL DEFAULT 'active',
  last_synced_at timestamp with time zone,
  sync_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.traffic_meta_connections ENABLE ROW LEVEL SECURITY;

-- Only admins can manage connections (tokens are sensitive)
CREATE POLICY "Admin can manage traffic meta connections"
ON public.traffic_meta_connections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view connection status (not tokens)
CREATE POLICY "Staff can view traffic meta connections"
ON public.traffic_meta_connections
FOR SELECT
USING (is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_traffic_meta_connections_updated_at
BEFORE UPDATE ON public.traffic_meta_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
