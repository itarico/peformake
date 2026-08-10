-- Update Volume de Artes template
UPDATE staff_goal_templates
SET target_value = 60, min_threshold = 60
WHERE name = 'Volume de Artes' AND target_role = 'designer';

-- Update Tempo de Entrega template
UPDATE staff_goal_templates
SET target_value = 48, min_threshold = 48, improvement_direction = 'down'
WHERE name = 'Tempo de Entrega' AND target_role = 'designer';

-- Update existing assigned goals for current and future months to match fixed targets
UPDATE staff_assigned_goals
SET custom_target_value = 60
WHERE template_id IN (SELECT id FROM staff_goal_templates WHERE name = 'Volume de Artes')
AND (year > date_part('year', now()) OR (year = date_part('year', now()) AND month >= date_part('month', now())));

UPDATE staff_assigned_goals
SET custom_target_value = 48
WHERE template_id IN (SELECT id FROM staff_goal_templates WHERE name = 'Tempo de Entrega')
AND (year > date_part('year', now()) OR (year = date_part('year', now()) AND month >= date_part('month', now())));

-- Disable other designer goals if they exist and are not the ones requested
UPDATE staff_goal_templates
SET is_active = false
WHERE target_role = 'designer' 
AND name NOT IN ('Volume de Artes', 'Tempo de Entrega');
