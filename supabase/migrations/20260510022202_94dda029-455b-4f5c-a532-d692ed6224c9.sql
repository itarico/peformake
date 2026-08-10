UPDATE staff_goal_templates 
SET tracking_method = 'manual', 
    data_source_description = 'Upload manual de comprovantes pelo Social Media'
WHERE name = 'Stories no Mês';

UPDATE staff_goal_templates 
SET description = 'Número de clientes únicos que tiveram vídeos editados e aprovados no mês'
WHERE name = 'Clientes Ativos (Editor)';