
-- Update agency WhatsApp session to use the correct Italo session (74791)
UPDATE notification_email_settings 
SET agency_whatsapp_session_id = '74791'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Re-insert the Italo connection with correct session data
INSERT INTO crm_whatsapp_connections (client_id, session_id, phone_number, status)
VALUES ('1b74ff09-6625-429d-9a89-ad2694c71b03', '74791', '+5581985672212', 'disconnected')
ON CONFLICT (client_id) DO UPDATE SET 
  session_id = '74791',
  phone_number = '+5581985672212',
  session_api_key = NULL,
  status = 'disconnected';
