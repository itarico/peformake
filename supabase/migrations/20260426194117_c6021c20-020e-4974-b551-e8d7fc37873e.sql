CREATE OR REPLACE FUNCTION public.reset_crm_data(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leads_count integer;
  v_messages_count integer;
  v_sales_count integer;
BEGIN
  SELECT COUNT(*) INTO v_leads_count FROM public.crm_leads WHERE client_id = p_client_id;
  SELECT COUNT(*) INTO v_messages_count FROM public.crm_messages WHERE client_id = p_client_id;
  SELECT COUNT(*) INTO v_sales_count FROM public.crm_sales WHERE client_id = p_client_id;

  DELETE FROM public.crm_message_classifications
  WHERE lead_id IN (SELECT id FROM public.crm_leads WHERE client_id = p_client_id)
     OR message_id IN (SELECT id FROM public.crm_messages WHERE client_id = p_client_id);

  DELETE FROM public.crm_lead_tags
  WHERE lead_id IN (SELECT id FROM public.crm_leads WHERE client_id = p_client_id)
     OR tag_id IN (SELECT id FROM public.crm_tags WHERE client_id = p_client_id);

  DELETE FROM public.crm_flow_nodes
  WHERE flow_id IN (SELECT id FROM public.crm_flows WHERE client_id = p_client_id);

  DELETE FROM public.crm_flow_sessions WHERE client_id = p_client_id;
  DELETE FROM public.crm_intelligence_events WHERE client_id = p_client_id;
  DELETE FROM public.crm_decision_logs WHERE client_id = p_client_id;
  DELETE FROM public.crm_conversion_events WHERE client_id = p_client_id;
  DELETE FROM public.crm_lead_scores WHERE client_id = p_client_id;
  DELETE FROM public.crm_lead_summaries WHERE client_id = p_client_id;
  DELETE FROM public.crm_lead_activities WHERE client_id = p_client_id;
  DELETE FROM public.crm_scheduled_messages WHERE client_id = p_client_id;
  DELETE FROM public.crm_sales WHERE client_id = p_client_id;
  DELETE FROM public.crm_messages WHERE client_id = p_client_id;
  DELETE FROM public.crm_leads WHERE client_id = p_client_id;

  DELETE FROM public.crm_auto_notification_logs WHERE client_id = p_client_id;
  DELETE FROM public.crm_auto_notifications WHERE client_id = p_client_id;
  DELETE FROM public.crm_campaigns WHERE client_id = p_client_id;
  DELETE FROM public.crm_quotes WHERE client_id = p_client_id;
  DELETE FROM public.crm_quote_configs WHERE client_id = p_client_id;
  DELETE FROM public.client_products WHERE client_id = p_client_id;
  DELETE FROM public.crm_quick_replies WHERE client_id = p_client_id;
  DELETE FROM public.crm_flow_webhooks WHERE client_id = p_client_id;
  DELETE FROM public.crm_flows WHERE client_id = p_client_id;
  DELETE FROM public.crm_tags WHERE client_id = p_client_id;
  DELETE FROM public.crm_team_members WHERE client_id = p_client_id;
  DELETE FROM public.crm_agent_files WHERE client_id = p_client_id;
  DELETE FROM public.crm_agent_knowledge WHERE client_id = p_client_id;
  DELETE FROM public.crm_agent_questions WHERE client_id = p_client_id;
  DELETE FROM public.crm_agent_configs WHERE client_id = p_client_id;
  DELETE FROM public.crm_bot_configs WHERE client_id = p_client_id;
  DELETE FROM public.crm_whatsapp_connections WHERE client_id = p_client_id;

  RETURN jsonb_build_object(
    'success', true,
    'leads_removed', v_leads_count,
    'messages_removed', v_messages_count,
    'sales_removed', v_sales_count
  );
END;
$$;