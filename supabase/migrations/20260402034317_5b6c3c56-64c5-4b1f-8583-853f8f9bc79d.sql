
-- Merge messages from duplicate leads to the surviving (oldest) lead
WITH duplicates AS (
  SELECT id, client_id, phone,
    ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn,
    FIRST_VALUE(id) OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as survivor_id
  FROM crm_leads
),
dups_to_remove AS (
  SELECT id, survivor_id FROM duplicates WHERE rn > 1
)
UPDATE crm_messages SET lead_id = d.survivor_id
FROM dups_to_remove d
WHERE crm_messages.lead_id = d.id;

-- Clean related tables
WITH dups AS (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn FROM crm_leads
  ) t WHERE rn > 1
)
DELETE FROM crm_lead_scores WHERE lead_id IN (SELECT id FROM dups);

WITH dups AS (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn FROM crm_leads
  ) t WHERE rn > 1
)
DELETE FROM crm_lead_summaries WHERE lead_id IN (SELECT id FROM dups);

WITH dups AS (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn FROM crm_leads
  ) t WHERE rn > 1
)
DELETE FROM crm_intelligence_events WHERE lead_id IN (SELECT id FROM dups);

WITH dups AS (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn FROM crm_leads
  ) t WHERE rn > 1
)
DELETE FROM crm_decision_logs WHERE lead_id IN (SELECT id FROM dups);

WITH dups AS (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn FROM crm_leads
  ) t WHERE rn > 1
)
DELETE FROM crm_message_classifications WHERE lead_id IN (SELECT id FROM dups);

-- Reassign sales
WITH duplicates AS (
  SELECT id,
    FIRST_VALUE(id) OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as survivor_id,
    ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn
  FROM crm_leads
)
UPDATE crm_sales SET lead_id = d.survivor_id
FROM (SELECT id, survivor_id FROM duplicates WHERE rn > 1) d
WHERE crm_sales.lead_id = d.id;

-- Reassign flow sessions
WITH duplicates AS (
  SELECT id,
    FIRST_VALUE(id) OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as survivor_id,
    ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn
  FROM crm_leads
)
UPDATE crm_flow_sessions SET lead_id = d.survivor_id
FROM (SELECT id, survivor_id FROM duplicates WHERE rn > 1) d
WHERE crm_flow_sessions.lead_id = d.id;

-- Reassign conversion events (lead_id is UUID here too)
WITH duplicates AS (
  SELECT id,
    FIRST_VALUE(id) OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as survivor_id,
    ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn
  FROM crm_leads
)
UPDATE crm_conversion_events SET lead_id = d.survivor_id
FROM (SELECT id, survivor_id FROM duplicates WHERE rn > 1) d
WHERE crm_conversion_events.lead_id = d.id;

-- Delete duplicate leads (keeping oldest)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC) as rn
  FROM crm_leads
)
DELETE FROM crm_leads WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Add unique constraint to prevent future duplicates
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_client_phone_unique UNIQUE (client_id, phone);
