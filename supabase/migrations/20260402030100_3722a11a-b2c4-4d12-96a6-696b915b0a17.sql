
-- ============================================
-- SECURITY HARDENING: Tighten permissive RLS policies
-- ============================================

-- 1. CRM FLOWS - restrict write to authenticated
DROP POLICY IF EXISTS "Public access crm_flows" ON public.crm_flows;
CREATE POLICY "Public can read crm_flows" ON public.crm_flows FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage crm_flows" ON public.crm_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. CRM FLOW NODES - restrict write to authenticated
DROP POLICY IF EXISTS "Public access crm_flow_nodes" ON public.crm_flow_nodes;
CREATE POLICY "Public can read crm_flow_nodes" ON public.crm_flow_nodes FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage crm_flow_nodes" ON public.crm_flow_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. CRM FLOW SESSIONS - restrict write to authenticated
DROP POLICY IF EXISTS "Public access crm_flow_sessions" ON public.crm_flow_sessions;
CREATE POLICY "Public can read crm_flow_sessions" ON public.crm_flow_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage crm_flow_sessions" ON public.crm_flow_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. CRM FLOW WEBHOOKS - restrict write to authenticated
DROP POLICY IF EXISTS "Public access crm_flow_webhooks" ON public.crm_flow_webhooks;
CREATE POLICY "Public can read crm_flow_webhooks" ON public.crm_flow_webhooks FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage crm_flow_webhooks" ON public.crm_flow_webhooks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. CRM BOT CONFIGS - restrict to authenticated
DROP POLICY IF EXISTS "Staff can manage bot configs" ON public.crm_bot_configs;
CREATE POLICY "Public can read bot configs" ON public.crm_bot_configs FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage bot configs" ON public.crm_bot_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. LANDING TABLES - restrict writes to authenticated
DROP POLICY IF EXISTS "Authenticated can manage logos" ON public.landing_client_logos;
CREATE POLICY "Public can read logos" ON public.landing_client_logos FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage logos" ON public.landing_client_logos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage cases" ON public.landing_portfolio_cases;
CREATE POLICY "Public can read cases" ON public.landing_portfolio_cases FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage cases" ON public.landing_portfolio_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage stats" ON public.landing_stats;
CREATE POLICY "Public can read stats" ON public.landing_stats FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage stats" ON public.landing_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage testimonials" ON public.landing_testimonials;
CREATE POLICY "Public can read testimonials" ON public.landing_testimonials FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage testimonials" ON public.landing_testimonials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. CRM QUICK REPLIES - restrict to authenticated
DROP POLICY IF EXISTS "Public delete quick replies" ON public.crm_quick_replies;
DROP POLICY IF EXISTS "Public insert quick replies" ON public.crm_quick_replies;
DROP POLICY IF EXISTS "Public update quick replies" ON public.crm_quick_replies;
CREATE POLICY "Authenticated can insert quick replies" ON public.crm_quick_replies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update quick replies" ON public.crm_quick_replies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete quick replies" ON public.crm_quick_replies FOR DELETE TO authenticated USING (true);

-- 8. CRM SALES - restrict update to authenticated
DROP POLICY IF EXISTS "Public can update crm sales" ON public.crm_sales;
CREATE POLICY "Authenticated can update crm sales" ON public.crm_sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 9. QUIZ LEADS - restrict update to authenticated (keep public insert)
DROP POLICY IF EXISTS "Public can update quiz leads" ON public.quiz_leads;
CREATE POLICY "Authenticated can update quiz leads" ON public.quiz_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 10. Add database indexes for performance
CREATE INDEX IF NOT EXISTS idx_arts_work_month_id ON public.arts(work_month_id);
CREATE INDEX IF NOT EXISTS idx_arts_status ON public.arts(status);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);
CREATE INDEX IF NOT EXISTS idx_work_months_client_id ON public.work_months(client_id);
CREATE INDEX IF NOT EXISTS idx_work_months_year_month ON public.work_months(year, month);
CREATE INDEX IF NOT EXISTS idx_consulting_months_client_id ON public.consulting_months(client_id);
CREATE INDEX IF NOT EXISTS idx_consulting_months_year_month ON public.consulting_months(year, month);
CREATE INDEX IF NOT EXISTS idx_crm_leads_client_id ON public.crm_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_messages_lead_id ON public.crm_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_client_id ON public.crm_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_sales_client_id ON public.crm_sales(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON public.client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_agency_expenses_year_month ON public.agency_expenses(year, month);
