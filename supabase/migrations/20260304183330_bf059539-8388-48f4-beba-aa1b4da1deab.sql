
ALTER TABLE notification_email_settings
ADD COLUMN IF NOT EXISTS notify_system_art_approved boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_system_art_revision boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_system_art_ready boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_system_briefing_completed boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_system_crm_new_lead boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_system_crm_new_message boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_system_planning_complete boolean NOT NULL DEFAULT true;
