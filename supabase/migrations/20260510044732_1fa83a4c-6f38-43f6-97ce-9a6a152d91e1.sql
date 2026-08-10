ALTER TABLE public.staff_goal_templates 
DROP CONSTRAINT staff_goal_templates_category_check;

ALTER TABLE public.staff_goal_templates 
ADD CONSTRAINT staff_goal_templates_category_check 
CHECK (category = ANY (ARRAY[
  'finance'::text, 
  'commercial'::text, 
  'operational'::text, 
  'general'::text, 
  'head_marketing'::text, 
  'sdr'::text, 
  'closer'::text, 
  'design'::text, 
  'social_media'::text, 
  'editor'::text, 
  'traffic'::text
]));