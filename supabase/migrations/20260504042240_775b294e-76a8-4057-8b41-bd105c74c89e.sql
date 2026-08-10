-- Allow multiple roles by using an array
ALTER TABLE public.staff_members 
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- Migrate existing role to roles array if empty
UPDATE public.staff_members 
SET roles = ARRAY[role] 
WHERE (roles IS NULL OR array_length(roles, 1) IS NULL) AND role IS NOT NULL;

-- Create table for tracking commissions
CREATE TABLE IF NOT EXISTS public.staff_commissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.staff_commission_templates(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    reference_id UUID, -- Optional: link to a client, deal, or project
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for commissions
ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all commissions" 
ON public.staff_commissions 
FOR ALL 
USING (true);

-- Create table for system usage tracking (for automated KPIs)
CREATE TABLE IF NOT EXISTS public.system_activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL, -- session_start, session_end, work_on_client
    duration_minutes INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for activity logs
ALTER TABLE public.system_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs" 
ON public.system_activity_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own logs" 
ON public.system_activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
