-- Indexes for agency_expenses
CREATE INDEX IF NOT EXISTS idx_agency_expenses_client_id ON public.agency_expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_agency_expenses_entity ON public.agency_expenses(entity);
-- idx_agency_expenses_year_month already exists
CREATE INDEX IF NOT EXISTS idx_agency_expenses_due_date ON public.agency_expenses(due_date);

-- Indexes for other_revenues
CREATE INDEX IF NOT EXISTS idx_other_revenues_date ON public.other_revenues(date);
CREATE INDEX IF NOT EXISTS idx_other_revenues_entity ON public.other_revenues(entity);
CREATE INDEX IF NOT EXISTS idx_other_revenues_client_id ON public.other_revenues(client_id);

-- Indexes for financial_goals
CREATE INDEX IF NOT EXISTS idx_financial_goals_period ON public.financial_goals(month, year, entity);

-- Indexes for staff_assigned_goals
CREATE INDEX IF NOT EXISTS idx_staff_assigned_goals_staff_id ON public.staff_assigned_goals(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assigned_goals_status ON public.staff_assigned_goals(status);

-- Indexes for staff_activity_proofs
CREATE INDEX IF NOT EXISTS idx_staff_activity_proofs_staff_id ON public.staff_activity_proofs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_proofs_created_at ON public.staff_activity_proofs(created_at);

-- Indexes for staff_task_metrics
CREATE INDEX IF NOT EXISTS idx_staff_task_metrics_staff_id ON public.staff_task_metrics(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_task_metrics_task_id ON public.staff_task_metrics(task_id);
