-- Production tasks to measure Cycle Time
CREATE TABLE public.production_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee records for Turnover and Operational Efficiency
CREATE TABLE public.employee_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    hired_at DATE NOT NULL,
    terminated_at DATE,
    salary NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Strategic Goals/Milestones for Business Strategy indicator
CREATE TABLE public.strategic_goals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    achieved_at TIMESTAMP WITH TIME ZONE,
    is_innovation BOOLEAN DEFAULT false, -- For Innovation & Development indicator
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Investments for ROI tracking
CREATE TABLE public.business_investments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT, -- marketing, tools, training
    amount NUMERIC NOT NULL,
    expected_return NUMERIC,
    invested_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_investments ENABLE ROW LEVEL SECURITY;

-- Simple "true" policies for now as requested for management
CREATE POLICY "Allow all management read" ON public.production_tasks FOR SELECT USING (true);
CREATE POLICY "Allow all management write" ON public.production_tasks FOR ALL USING (true);
CREATE POLICY "Allow all employees read" ON public.employee_records FOR SELECT USING (true);
CREATE POLICY "Allow all employees write" ON public.employee_records FOR ALL USING (true);
CREATE POLICY "Allow all goals read" ON public.strategic_goals FOR SELECT USING (true);
CREATE POLICY "Allow all goals write" ON public.strategic_goals FOR ALL USING (true);
CREATE POLICY "Allow all investments read" ON public.business_investments FOR SELECT USING (true);
CREATE POLICY "Allow all investments write" ON public.business_investments FOR ALL USING (true);
