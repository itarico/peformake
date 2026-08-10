-- View for staff performance metrics using existing summary tables
CREATE OR REPLACE VIEW public.staff_performance_metrics_view AS
SELECT 
    sm.id as staff_id,
    sm.full_name as staff_name,
    EXTRACT(MONTH FROM CURRENT_DATE) as month,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    COALESCE(smr.total_managed_revenue, 0) as total_managed_revenue
FROM 
    public.staff_members sm
LEFT JOIN 
    public.staff_managed_revenue smr ON sm.id = smr.staff_id;

-- Grant access to the view
GRANT SELECT ON public.staff_performance_metrics_view TO authenticated;
GRANT SELECT ON public.staff_performance_metrics_view TO service_role;
GRANT SELECT ON public.staff_performance_metrics_view TO anon;
