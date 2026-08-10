ALTER TABLE public.clients 
ADD COLUMN head_marketing_id UUID REFERENCES public.staff_members(id),
ADD COLUMN traffic_manager_id UUID REFERENCES public.staff_members(id),
ADD COLUMN closer_id UUID REFERENCES public.staff_members(id),
ADD COLUMN editor_id UUID REFERENCES public.staff_members(id);

COMMENT ON COLUMN public.clients.head_marketing_id IS 'Head de Marketing responsável pelo cliente';
COMMENT ON COLUMN public.clients.traffic_manager_id IS 'Gestor de Tráfego responsável pelas campanhas do cliente';
COMMENT ON COLUMN public.clients.closer_id IS 'Closer (vendedor) responsável pelo fechamento/atendimento comercial';
COMMENT ON COLUMN public.clients.editor_id IS 'Editor/Videomaker responsável pelo audiovisual do cliente';