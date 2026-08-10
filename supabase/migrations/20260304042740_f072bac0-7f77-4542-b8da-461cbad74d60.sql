
-- 1. Create WhatsApp notification log table for debugging and tracking
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  recipient_phone text,
  recipient_type text DEFAULT 'unknown',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  art_id uuid REFERENCES public.arts(id) ON DELETE SET NULL,
  message_preview text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  edge_function text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage wa log" ON public.whatsapp_notification_log
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert wa log" ON public.whatsapp_notification_log
  FOR INSERT WITH CHECK (true);
