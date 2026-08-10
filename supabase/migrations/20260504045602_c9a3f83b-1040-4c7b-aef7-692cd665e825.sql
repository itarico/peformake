CREATE OR REPLACE VIEW staff_managed_revenue AS
WITH client_revenue AS (
  -- Calculate total revenue per client from active services
  SELECT 
    client_id, 
    SUM(COALESCE(price, 0) * COALESCE(quantity, 1)) as total_rev
  FROM client_services
  GROUP BY client_id
),
assignment_revenue AS (
  -- Revenue from direct staff-to-client assignments
  SELECT 
    staff_member_id,
    SUM(cr.total_rev) as revenue
  FROM client_team_assignments cta
  JOIN client_revenue cr ON cr.client_id = cta.client_id
  GROUP BY staff_member_id
),
squad_revenue AS (
  -- Revenue from squad-to-client assignments
  SELECT 
    ssm.staff_id,
    SUM(cr.total_rev) as revenue
  FROM staff_squad_members ssm
  JOIN clients c ON c.squad_id = ssm.squad_id
  JOIN client_revenue cr ON cr.client_id = c.id
  GROUP BY ssm.staff_id
),
combined_staff AS (
  SELECT staff_member_id as staff_id FROM assignment_revenue
  UNION
  SELECT staff_id FROM squad_revenue
)
SELECT 
  cs.staff_id,
  COALESCE((SELECT revenue FROM assignment_revenue ar WHERE ar.staff_member_id = cs.staff_id), 0) + 
  COALESCE((SELECT revenue FROM squad_revenue sr WHERE sr.staff_id = cs.staff_id), 0) as total_managed_revenue
FROM combined_staff cs;
