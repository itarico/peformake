-- Prevent duplicate goals for the same period and entity
ALTER TABLE public.financial_goals 
ADD CONSTRAINT unique_goal_period_entity UNIQUE (year, month, entity);

-- Centralized View for Financial KPIs (The "Unified Equation" Source)
CREATE OR REPLACE VIEW public.financial_performance_summary AS
WITH monthly_revenue AS (
    SELECT 
        EXTRACT(MONTH FROM created_at) as month,
        EXTRACT(YEAR FROM created_at) as year,
        SUM(price * quantity) as revenue
    FROM public.client_services
    WHERE is_active = true
    GROUP BY 1, 2
),
monthly_expenses AS (
    SELECT 
        month,
        year,
        SUM(amount) as expenses
    FROM public.agency_expenses
    GROUP BY 1, 2
),
staff_costs AS (
    SELECT SUM(monthly_cost) as total_staff_cost FROM public.staff_members WHERE is_active = true
)
SELECT 
    r.year,
    r.month,
    r.revenue as mrr,
    COALESCE(e.expenses, 0) + COALESCE(s.total_staff_cost, 0) as total_costs,
    r.revenue - (COALESCE(e.expenses, 0) + COALESCE(s.total_staff_cost, 0)) as net_profit,
    CASE 
        WHEN r.revenue > 0 THEN ((r.revenue - (COALESCE(e.expenses, 0) + COALESCE(s.total_staff_cost, 0))) / r.revenue) * 100 
        ELSE 0 
    END as margin_percent
FROM monthly_revenue r
LEFT JOIN monthly_expenses e ON r.month = e.month AND r.year = e.year
CROSS JOIN staff_costs s;
