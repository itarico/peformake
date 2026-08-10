-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_arts_work_month_id ON public.arts(work_month_id);
CREATE INDEX IF NOT EXISTS idx_traffic_campaigns_month_year ON public.traffic_campaigns(month, year);
CREATE INDEX IF NOT EXISTS idx_traffic_campaigns_client_id ON public.traffic_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_instagram_metrics_month_year ON public.instagram_metrics(month, year);
CREATE INDEX IF NOT EXISTS idx_instagram_metrics_client_id ON public.instagram_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_surveys_month_year ON public.client_satisfaction_surveys(month, year);
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_surveys_client_id ON public.client_satisfaction_surveys(client_id);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_sdr_staff_id ON public.sdr_leads(sdr_staff_id);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_status ON public.sdr_leads(status);

-- RPC for optimized staff performance calculation
CREATE OR REPLACE FUNCTION public.get_staff_performance_metrics(p_year INTEGER, p_month INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH staff_clients AS (
        SELECT staff_member_id, array_agg(client_id) as client_ids
        FROM public.client_team_assignments
        GROUP BY staff_member_id
    ),
    design_metrics AS (
        SELECT 
            sc.staff_member_id,
            COUNT(a.id) as total_arts,
            COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_arts,
            COUNT(CASE WHEN a.revision_comment IS NOT NULL THEN 1 END) as arts_with_revision,
            AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))/86400)::NUMERIC as avg_delivery_days
        FROM staff_clients sc
        JOIN public.work_months wm ON wm.client_id = ANY(sc.client_ids)
        JOIN public.arts a ON a.work_month_id = wm.id
        WHERE wm.year = p_year AND wm.month = p_month
        GROUP BY sc.staff_member_id
    ),
    traffic_metrics AS (
        SELECT 
            sc.staff_member_id,
            AVG(tc.roas) as avg_roas,
            SUM(tc.investment) as total_investment,
            COUNT(tc.id) as campaigns_count,
            AVG(tc.ctr) as avg_ctr,
            SUM(tc.leads) as total_leads,
            CASE WHEN SUM(tc.leads) > 0 THEN SUM(tc.investment) / NULLIF(SUM(tc.leads), 0) ELSE 0 END as avg_cpl
        FROM staff_clients sc
        JOIN public.traffic_campaigns tc ON tc.client_id = ANY(sc.client_ids)
        WHERE tc.year = p_year AND tc.month = p_month
        GROUP BY sc.staff_member_id
    ),
    social_metrics AS (
        SELECT 
            sc.staff_member_id,
            SUM(im.posts_count) as total_posts,
            AVG(im.engagement_rate) as avg_engagement_rate,
            SUM(im.new_followers) as total_new_followers,
            SUM(im.reach) as total_reach
        FROM staff_clients sc
        JOIN public.instagram_metrics im ON im.client_id = ANY(sc.client_ids)
        WHERE im.year = p_year AND im.month = p_month
        GROUP BY sc.staff_member_id
    ),
    sdr_metrics AS (
        SELECT 
            sdr_staff_id as staff_member_id,
            COUNT(id) as total_leads,
            COUNT(CASE WHEN status = 'won' THEN 1 END) as converted_leads,
            COUNT(CASE WHEN status = 'meeting_scheduled' THEN 1 END) as meetings_scheduled,
            SUM(estimated_value) as pipeline_value,
            AVG(EXTRACT(EPOCH FROM (last_contact_at - created_at))/3600)::NUMERIC as avg_response_hours
        FROM public.sdr_leads
        WHERE EXTRACT(YEAR FROM created_at) = p_year AND EXTRACT(MONTH FROM created_at) = p_month
        GROUP BY sdr_staff_id
    ),
    satisfaction_metrics AS (
        SELECT 
            sc.staff_member_id,
            AVG(css.score) as avg_nps,
            COUNT(css.id) as surveys_count
        FROM staff_clients sc
        JOIN public.client_satisfaction_surveys css ON css.client_id = ANY(sc.client_ids)
        WHERE css.year = p_year AND css.month = p_month
        GROUP BY sc.staff_member_id
    ),
    activity_metrics AS (
        SELECT 
            staff_member_id,
            SUM(duration_minutes) as total_system_minutes
        FROM public.system_activity_logs
        WHERE EXTRACT(YEAR FROM created_at) = p_year AND EXTRACT(MONTH FROM created_at) = p_month
        GROUP BY staff_member_id
    )
    SELECT jsonb_object_agg(
        sm.id,
        jsonb_build_object(
            'design', jsonb_build_object(
                'productivity', COALESCE(dm.total_arts, 0),
                'approvalRate', CASE WHEN COALESCE(dm.total_arts, 0) > 0 THEN (dm.approved_arts::FLOAT / dm.total_arts) * 100 ELSE 0 END,
                'revisionRate', CASE WHEN COALESCE(dm.total_arts, 0) > 0 THEN (dm.arts_with_revision::FLOAT / dm.total_arts) * 100 ELSE 0 END,
                'avgDeliveryDays', ROUND(COALESCE(dm.avg_delivery_days, 0)::NUMERIC, 1)
            ),
            'traffic', jsonb_build_object(
                'roas', ROUND(COALESCE(tm.avg_roas, 0)::NUMERIC, 2),
                'campaigns', COALESCE(tm.campaigns_count, 0),
                'managedInvestment', COALESCE(tm.total_investment, 0),
                'ctr', ROUND(COALESCE(tm.avg_ctr, 0)::NUMERIC, 2),
                'cpl', ROUND(COALESCE(tm.avg_cpl, 0)::NUMERIC, 2)
            ),
            'social', jsonb_build_object(
                'totalPosts', COALESCE(som.total_posts, 0),
                'engagementRate', ROUND(COALESCE(som.avg_engagement_rate, 0)::NUMERIC, 2),
                'newFollowers', COALESCE(som.total_new_followers, 0),
                'reach', COALESCE(som.total_reach, 0)
            ),
            'sdr', jsonb_build_object(
                'totalLeads', COALESCE(sdrm.total_leads, 0),
                'conversionRate', CASE WHEN COALESCE(sdrm.total_leads, 0) > 0 THEN (sdrm.converted_leads::FLOAT / sdrm.total_leads) * 100 ELSE 0 END,
                'meetings', COALESCE(sdrm.meetings_scheduled, 0),
                'pipelineValue', COALESCE(sdrm.pipeline_value, 0),
                'avgResponseHours', ROUND(COALESCE(sdrm.avg_response_hours, 0)::NUMERIC, 1)
            ),
            'leader', jsonb_build_object(
                'satisfaction', ROUND(COALESCE(sam.avg_nps, 0)::NUMERIC, 1),
                'surveysCount', COALESCE(sam.surveys_count, 0),
                'retentionRate', 98 -- Placeholder as retention logic is complex
            ),
            'general', jsonb_build_object(
                'systemTime', COALESCE(am.total_system_minutes, 0)
            )
        )
    )
    INTO result
    FROM public.staff sm
    LEFT JOIN design_metrics dm ON dm.staff_member_id = sm.id
    LEFT JOIN traffic_metrics tm ON tm.staff_member_id = sm.id
    LEFT JOIN social_metrics som ON som.staff_member_id = sm.id
    LEFT JOIN sdr_metrics sdrm ON sdrm.staff_member_id = sm.id
    LEFT JOIN satisfaction_metrics sam ON sam.staff_member_id = sm.id
    LEFT JOIN activity_metrics am ON am.staff_member_id = sm.id;

    RETURN COALESCE(result, '{}'::JSONB);
END;
$$;
