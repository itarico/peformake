-- Create client_management_actions table
CREATE TABLE public.client_management_actions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'call', 'briefing_request', 'designer_escalation', 'other'
    notes TEXT,
    staff_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_follow_ups table
CREATE TABLE public.client_follow_ups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_contacted', -- 'not_contacted', 'in_progress', 'resolved'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_management_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_follow_ups ENABLE ROW LEVEL SECURITY;

-- Policies for client_management_actions
CREATE POLICY "Authenticated users can manage management actions"
ON public.client_management_actions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for client_follow_ups
CREATE POLICY "Authenticated users can manage follow ups"
ON public.client_follow_ups
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at on client_follow_ups
CREATE TRIGGER update_client_follow_ups_updated_at
BEFORE UPDATE ON public.client_follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
