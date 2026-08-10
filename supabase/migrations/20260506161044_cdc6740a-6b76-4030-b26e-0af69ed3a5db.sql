-- Create notification_pendencies table
CREATE TABLE IF NOT EXISTS public.notification_pendencies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.audiovisual_projects(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, resolved, failed
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_pendencies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can view all pendencies" 
ON public.notification_pendencies 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.staff_members WHERE id = auth.uid()));

CREATE POLICY "Staff can update pendencies" 
ON public.notification_pendencies 
FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.staff_members WHERE id = auth.uid()));

CREATE POLICY "Staff can insert pendencies" 
ON public.notification_pendencies 
FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.staff_members WHERE id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_notification_pendencies_updated_at
BEFORE UPDATE ON public.notification_pendencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
