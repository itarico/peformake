-- arts indices
CREATE INDEX IF NOT EXISTS idx_arts_work_month_id_status ON public.arts (work_month_id, status);
CREATE INDEX IF NOT EXISTS idx_arts_created_at ON public.arts (created_at DESC);

-- work_months indices
CREATE INDEX IF NOT EXISTS idx_work_months_client_year_month ON public.work_months (client_id, year, month);

-- clients indices
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_squad_id ON public.clients (squad_id);

-- user_roles indices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- notifications indices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- system_activity_logs indices
CREATE INDEX IF NOT EXISTS idx_activity_logs_staff_created ON public.system_activity_logs (staff_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.system_activity_logs (activity_type);

-- client_team_assignments indices
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_staff ON public.client_team_assignments (staff_member_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_client ON public.client_team_assignments (client_id);

-- staff_squad_members indices
CREATE INDEX IF NOT EXISTS idx_staff_squad_members_staff ON public.staff_squad_members (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_squad_members_squad ON public.staff_squad_members (squad_id);

-- client_services indices
CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON public.client_services (client_id);
