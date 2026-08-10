CREATE OR REPLACE FUNCTION public.get_staff_performance_metrics(p_year integer, p_month integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    WITH staff_clients AS (
        -- Get clients assigned to each staff member via the junction table
        SELECT staff_member_id, array_agg(client_id) as client_ids
        FROM public.client_team_assignments
        GROUP BY staff_member_id
    ),
    design_metrics AS (
        -- Real metrics from arts table
        SELECT 
            sc.staff_member_id,
            COUNT(a.id) as total_arts,
            COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_arts,
            COUNT(CASE WHEN a.revision_comment IS NOT NULL OR a.status = 'revision_requested' THEN 1 END) as arts_with_revision,
            AVG(EXTRACT(EPOCH FROM (COALESCE(a.updated_at, now()) - a.created_at))/86400)::NUMERIC as avg_delivery_days
        FROM staff_clients sc
        JOIN public.work_months wm ON wm.client_id = ANY(sc.client_ids)
        JOIN public.arts a ON a.work_month_id = wm.id
        WHERE wm.year = p_year AND wm.month = p_month
        GROUP BY sc.staff_member_id
    ),
    traffic_metrics AS (
        -- Real metrics from traffic_campaigns table
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
        -- Real metrics from instagram_metrics table
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
        -- Real metrics from crm_leads
        SELECT 
            COALESCE(assigned_member_id, (SELECT id FROM staff_members WHERE role = 'sdr' LIMIT 1)) as staff_member_id,
            COUNT(id) as total_leads,
            COUNT(CASE WHEN status = 'won' OR status = 'converted' THEN 1 END) as converted_leads,
            SUM(COALESCE(sale_value, 0)) as pipeline_value,
            AVG(EXTRACT(EPOCH FROM (COALESCE(updated_at, now()) - created_at))/3600)::NUMERIC as avg_response_hours
        FROM public.crm_leads
        WHERE EXTRACT(YEAR FROM created_at) = p_year AND EXTRACT(MONTH FROM created_at) = p_month
        GROUP BY 1
    ),
    satisfaction_metrics AS (
        -- Real metrics from surveys
        SELECT 
            sc.staff_member_id,
            AVG(css.score) as avg_nps,
            COUNT(css.id) as surveys_count
        FROM staff_clients sc
        JOIN public.client_satisfaction_surveys css ON css.client_id = ANY(sc.client_ids)
        WHERE css.year = p_year AND css.month = p_month
        GROUP BY sc.staff_member_id
    ),
    retention_metrics AS (
        -- Real calculation of retention based on active clients
        SELECT 
            sc.staff_member_id,
            (COUNT(CASE WHEN c.is_active = true THEN 1 END)::FLOAT / NULLIF(COUNT(c.id), 0)) * 100 as retention_rate
        FROM staff_clients sc
        JOIN public.clients c ON c.id = ANY(sc.client_ids)
        GROUP BY sc.staff_member_id
    ),
    av_metrics_videographer AS (
        SELECT 
            videographer_id as staff_member_id,
            COUNT(id) as total_videos,
            COUNT(CASE WHEN status != 'awaiting_capture' AND status != 'cancelled' THEN 1 END) as captures_done,
            COUNT(DISTINCT client_id) as clients_served
        FROM public.audiovisual_projects
        WHERE month = p_month AND year = p_year
        GROUP BY videographer_id
    ),
    av_metrics_editor AS (
        SELECT 
            editor_id as staff_member_id,
            COUNT(CASE WHEN status IN ('awaiting_approval', 'published', 'revising') THEN 1 END) as videos_edited,
            AVG(EXTRACT(EPOCH FROM (editing_completed_at - editing_started_at))/3600)::NUMERIC as avg_edit_time_hours,
            (COUNT(CASE WHEN internal_revision_count > 0 OR leader_revision_count > 0 THEN 1 END)::FLOAT / NULLIF(COUNT(id), 0)) * 100 as revision_rate
        FROM public.audiovisual_projects
        WHERE month = p_month AND year = p_year
        GROUP BY editor_id
    )
    SELECT jsonb_object_agg(
        sm.id,
        jsonb_build_object(
            'design', jsonb_build_object(
                'productivity', COALESCE(dm.total_arts, 0),
                'approvalRate', CASE WHEN COALESCE(dm.total_arts, 0) > 0 THEN (dm.approved_arts::FLOAT / dm.total_arts) * 100 ELSE 0 END,
                'avgDeliveryDays', COALESCE(dm.avg_delivery_days, 0),
                'revisionRate', CASE WHEN COALESCE(dm.total_arts, 0) > 0 THEN (dm.arts_with_revision::FLOAT / dm.total_arts) * 100 ELSE 0 END
            ),
            'traffic', jsonb_build_object(
                'roas', COALESCE(tm.avg_roas, 0),
                'managedInvestment', COALESCE(tm.total_investment, 0),
                'ctr', COALESCE(tm.avg_ctr, 0),
                'totalLeads', COALESCE(tm.total_leads, 0),
                'cpl', COALESCE(tm.avg_cpl, 0)
            ),
            'social', jsonb_build_object(
                'totalPosts', COALESCE(sm_m.total_posts, 0),
                'engagementRate', COALESCE(sm_m.avg_engagement_rate, 0),
                'newFollowers', COALESCE(sm_m.total_new_followers, 0),
                'reach', COALESCE(sm_m.total_reach, 0)
            ),
            'sdr', jsonb_build_object(
                'totalLeads', COALESCE(sdr.total_leads, 0),
                'conversionRate', CASE WHEN COALESCE(sdr.total_leads, 0) > 0 THEN (sdr.converted_leads::FLOAT / sdr.total_leads) * 100 ELSE 0 END,
                'pipelineValue', COALESCE(sdr.pipeline_value, 0),
                'avgResponseHours', COALESCE(sdr.avg_response_hours, 0)
            ),
            'leader', jsonb_build_object(
                'satisfaction', COALESCE(sat.avg_nps, 0),
                'surveysCount', COALESCE(sat.surveys_count, 0),
                'retentionRate', COALESCE(ret.retention_rate, 100)
            ),
            'audiovisual', jsonb_build_object(
                'capturesDone', COALESCE(avv.captures_done, 0),
                'clientsServed', COALESCE(avv.clients_served, 0),
                'totalVideos', COALESCE(avv.total_videos, 0),
                'videosEdited', COALESCE(ave.videos_edited, 0),
                'avgEditTimeHours', COALESCE(ave.avg_edit_time_hours, 0),
                'revisionRate', COALESCE(ave.revision_rate, 0)
            )
        )
    )
    INTO result
    FROM public.staff_members sm
    LEFT JOIN design_metrics dm ON dm.staff_member_id = sm.id
    LEFT JOIN traffic_metrics tm ON tm.staff_member_id = sm.id
    LEFT JOIN social_metrics sm_m ON sm_m.staff_member_id = sm.id
    LEFT JOIN sdr_metrics sdr ON sdr.staff_member_id = sm.id
    LEFT JOIN satisfaction_metrics sat ON sat.staff_member_id = sm.id
    LEFT JOIN retention_metrics ret ON ret.staff_member_id = sm.id
    LEFT JOIN av_metrics_videographer avv ON avv.staff_member_id = sm.id
    LEFT JOIN av_metrics_editor ave ON ave.staff_member_id = sm.id
    WHERE sm.is_active = true;

    RETURN COALESCE(result, '{}'::JSONB);
END;
$function$
