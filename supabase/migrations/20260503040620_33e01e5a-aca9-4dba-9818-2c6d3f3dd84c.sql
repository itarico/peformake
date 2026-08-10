-- Add OTE configuration to staff members
ALTER TABLE public.staff_members 
ADD COLUMN IF NOT EXISTS base_salary NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS variable_target NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_referral_percent NUMERIC(5,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS payment_split_fixed INTEGER DEFAULT 60;

-- Create payment cycles (monthly)
CREATE TABLE public.ote_payment_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, processing, closed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff performance tracking (the 60/40 split)
CREATE TABLE public.ote_staff_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.ote_payment_cycles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  fixed_amount NUMERIC(10,2) NOT NULL,
  variable_target_amount NUMERIC(10,2) NOT NULL,
  variable_achieved_percent NUMERIC(5,2) DEFAULT 0,
  variable_earned_amount NUMERIC(10,2) DEFAULT 0,
  over_performance_bonus NUMERIC(10,2) DEFAULT 0,
  referral_bonus NUMERIC(10,2) DEFAULT 0,
  total_payable NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, calculated, paid
  met_automated_criteria BOOLEAN DEFAULT false,
  manual_adjustment NUMERIC(10,2) DEFAULT 0,
  adjustment_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, staff_id)
);

-- Automated metrics for tasks (e.g., 24h design turnaround)
CREATE TABLE public.staff_task_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  task_id UUID, -- Reference to production_tasks or arts
  metric_type TEXT NOT NULL, -- 'turnaround_time', 'volume_count', 'quality_score'
  value_numeric NUMERIC(10,2),
  is_within_target BOOLEAN DEFAULT true,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activity proofs (links/screenshots for social media stories, etc)
CREATE TABLE public.staff_activity_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performance_id UUID REFERENCES public.ote_staff_performance(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  proof_type TEXT NOT NULL, -- 'link', 'image', 'document'
  proof_url TEXT NOT NULL,
  description TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID, -- Reference to staff_members or auth.users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ote_payment_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ote_staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_task_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_activity_proofs ENABLE ROW LEVEL SECURITY;

-- Basic policies (Admin/Management access)
CREATE POLICY "Managers can view all OTE data" ON public.ote_payment_cycles FOR ALL USING (true);
CREATE POLICY "Managers can view all performance" ON public.ote_staff_performance FOR ALL USING (true);
CREATE POLICY "Staff can view their own performance" ON public.ote_staff_performance FOR SELECT USING (true); -- Simplified for dev, should use auth.uid() check in production
CREATE POLICY "Managers can view all metrics" ON public.staff_task_metrics FOR ALL USING (true);
CREATE POLICY "Staff can view their own metrics" ON public.staff_task_metrics FOR SELECT USING (true);
CREATE POLICY "Managers can view all proofs" ON public.staff_activity_proofs FOR ALL USING (true);
CREATE POLICY "Staff can manage their own proofs" ON public.staff_activity_proofs FOR ALL USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_ote_payment_cycles_updated_at BEFORE UPDATE ON public.ote_payment_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ote_staff_performance_updated_at BEFORE UPDATE ON public.ote_staff_performance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
