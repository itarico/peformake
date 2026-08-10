-- Update Volume de Artes template to 36
UPDATE staff_goal_templates
SET target_value = 36, min_threshold = 36
WHERE name = 'Volume de Artes' AND target_role = 'designer';

-- Update all assigned goals for current and future months to 36
UPDATE staff_assigned_goals
SET custom_target_value = 36
WHERE template_id IN (SELECT id FROM staff_goal_templates WHERE name = 'Volume de Artes')
AND (year > date_part('year', now()) OR (year = date_part('year', now()) AND month >= date_part('month', now())));
