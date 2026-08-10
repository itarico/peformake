-- Add lost_reason and lost_at columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS lost_reason TEXT,
ADD COLUMN IF NOT EXISTS lost_at TIMESTAMP WITH TIME ZONE;

-- Index for performance when filtering inactive clients
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients (is_active);
