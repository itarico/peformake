-- Fix overly permissive "Service can..." policies by restricting them to service_role
-- CRM Messages
DROP POLICY IF EXISTS "Service can insert crm messages" ON public.crm_messages;
CREATE POLICY "Service can insert crm messages" ON public.crm_messages FOR INSERT TO service_role WITH CHECK (true);

-- Notification Email Log
DROP POLICY IF EXISTS "Service can insert email log" ON public.notification_email_log;
CREATE POLICY "Service can insert email log" ON public.notification_email_log FOR INSERT TO service_role WITH CHECK (true);

-- CRM Conversion Events
DROP POLICY IF EXISTS "Service can insert conversion events" ON public.crm_conversion_events;
CREATE POLICY "Service can insert conversion events" ON public.crm_conversion_events FOR INSERT TO service_role WITH CHECK (true);

-- CRM Intelligence Events
DROP POLICY IF EXISTS "Service can insert intelligence events" ON public.crm_intelligence_events;
CREATE POLICY "Service can insert intelligence events" ON public.crm_intelligence_events FOR INSERT TO service_role WITH CHECK (true);

-- CRM Message Classifications
DROP POLICY IF EXISTS "Service can insert classifications" ON public.crm_message_classifications;
CREATE POLICY "Service can insert classifications" ON public.crm_message_classifications FOR INSERT TO service_role WITH CHECK (true);

-- CRM Lead Scores
DROP POLICY IF EXISTS "Service can upsert lead scores" ON public.crm_lead_scores;
DROP POLICY IF EXISTS "Service can update lead scores" ON public.crm_lead_scores;
CREATE POLICY "Service can manage lead scores" ON public.crm_lead_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- CRM Decision Logs
DROP POLICY IF EXISTS "Service can insert decision logs" ON public.crm_decision_logs;
CREATE POLICY "Service can insert decision logs" ON public.crm_decision_logs FOR INSERT TO service_role WITH CHECK (true);

-- CRM Sales
DROP POLICY IF EXISTS "Service can insert crm sales" ON public.crm_sales;
DROP POLICY IF EXISTS "Authenticated can update crm sales" ON public.crm_sales;
CREATE POLICY "Service can insert crm sales" ON public.crm_sales FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Staff can manage crm sales" ON public.crm_sales FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- WhatsApp Notification Log
DROP POLICY IF EXISTS "Service can insert wa log" ON public.whatsapp_notification_log;
CREATE POLICY "Service can insert wa log" ON public.whatsapp_notification_log FOR INSERT TO service_role WITH CHECK (true);

-- Instagram Conversations
DROP POLICY IF EXISTS "Service can insert ig conversations" ON public.instagram_conversations;
DROP POLICY IF EXISTS "Service can update ig conversations" ON public.instagram_conversations;
CREATE POLICY "Service can manage ig conversations" ON public.instagram_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Instagram Messages
DROP POLICY IF EXISTS "Service can insert ig messages" ON public.instagram_messages;
CREATE POLICY "Service can insert ig messages" ON public.instagram_messages FOR INSERT TO service_role WITH CHECK (true);

-- CRM Leads
DROP POLICY IF EXISTS "Service can insert crm leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Service can update crm leads" ON public.crm_leads;
CREATE POLICY "Service can manage crm leads" ON public.crm_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Framework Answers
DROP POLICY IF EXISTS "Service can manage framework answers" ON public.framework_answers;
DROP POLICY IF EXISTS "Service can update framework answers" ON public.framework_answers;
CREATE POLICY "Service can manage framework answers" ON public.framework_answers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Framework Instances
DROP POLICY IF EXISTS "Service can manage framework instances" ON public.framework_instances;
DROP POLICY IF EXISTS "Service can update framework instances" ON public.framework_instances;
CREATE POLICY "Service can manage framework instances" ON public.framework_instances FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Quiz Leads
DROP POLICY IF EXISTS "Public quiz submission" ON public.quiz_leads;
DROP POLICY IF EXISTS "Authenticated can update quiz leads" ON public.quiz_leads;
CREATE POLICY "Public quiz submission" ON public.quiz_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can update quiz leads" ON public.quiz_leads FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Service Requests
DROP POLICY IF EXISTS "Public can submit service requests" ON public.service_requests;
CREATE POLICY "Public can submit service requests" ON public.service_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

-- CRM Quick Replies
DROP POLICY IF EXISTS "Authenticated can insert quick replies" ON public.crm_quick_replies;
DROP POLICY IF EXISTS "Authenticated can update quick replies" ON public.crm_quick_replies;
DROP POLICY IF EXISTS "Authenticated can delete quick replies" ON public.crm_quick_replies;
CREATE POLICY "Staff can manage quick replies" ON public.crm_quick_replies FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Site Settings
DROP POLICY IF EXISTS "Authenticated users can insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can update site_settings" ON public.site_settings;
CREATE POLICY "Admins can manage site_settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Client Files
DROP POLICY IF EXISTS "Staff can insert client files" ON public.client_files;
DROP POLICY IF EXISTS "Staff can delete client files" ON public.client_files;
DROP POLICY IF EXISTS "Staff can update client files" ON public.client_files;
CREATE POLICY "Staff can manage client files" ON public.client_files FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Staff Client Payments (CRITICAL FIX)
DROP POLICY IF EXISTS "Allow all authenticated insert" ON public.staff_client_payments;
DROP POLICY IF EXISTS "Allow all authenticated update" ON public.staff_client_payments;
DROP POLICY IF EXISTS "Allow all authenticated delete" ON public.staff_client_payments;
DROP POLICY IF EXISTS "Allow all authenticated read" ON public.staff_client_payments;
CREATE POLICY "Admins can manage staff payments" ON public.staff_client_payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view own payments" ON public.staff_client_payments FOR SELECT TO authenticated USING (auth.uid() = staff_member_id);

-- Art Status History
DROP POLICY IF EXISTS "Membros da equipe podem inserir histórico" ON public.art_status_history;
CREATE POLICY "Staff can insert art status history" ON public.art_status_history FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- CRM Message Classifications (missed one)
DROP POLICY IF EXISTS "Service can insert classifications" ON public.crm_message_classifications;
CREATE POLICY "Service can insert classifications" ON public.crm_message_classifications FOR INSERT TO service_role WITH CHECK (true);

-- Ensure RLS is enabled on all tables (just in case)
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_intelligence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_message_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.framework_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.framework_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_status_history ENABLE ROW LEVEL SECURITY;
