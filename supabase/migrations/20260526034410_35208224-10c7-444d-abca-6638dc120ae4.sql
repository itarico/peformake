-- Update goals targets and settings
UPDATE staff_goal_templates
SET target_value = 36, 
    min_threshold = 36, 
    improvement_direction = 'down',
    measurement_unit = 'horas'
WHERE name = 'Tempo de Entrega' AND target_role = 'designer';

UPDATE staff_goal_templates
SET target_value = 36, 
    min_threshold = 36
WHERE name = 'Volume de Artes' AND target_role = 'designer';

-- Ensure only these two are active for designers
UPDATE staff_goal_templates
SET is_active = false
WHERE target_role = 'designer' AND name NOT IN ('Volume de Artes', 'Tempo de Entrega');

-- Update currently assigned goals for current and future months
UPDATE staff_assigned_goals
SET custom_target_value = 36
WHERE template_id IN (SELECT id FROM staff_goal_templates WHERE name IN ('Volume de Artes', 'Tempo de Entrega'))
AND (year > date_part('year', now()) OR (year = date_part('year', now()) AND month >= date_part('month', now())));
