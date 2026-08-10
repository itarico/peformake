-- 1. Create a temporary column to store the staff_id
ALTER TABLE public.clients ADD COLUMN designer_staff_id UUID REFERENCES public.staff_members(id);

-- 2. Migrate existing designer_id (which points to designers table) to staff_member_id
UPDATE public.clients c
SET designer_staff_id = d.staff_member_id
FROM public.designers d
WHERE c.designer_id = d.id;

-- 3. Update the designer_id column to point to staff_members instead of designers
-- We'll drop the old constraint and add a new one
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_designer_id_fkey;

-- Now update designer_id with the staff_id and change the reference
UPDATE public.clients SET designer_id = designer_staff_id;

ALTER TABLE public.clients 
  ADD CONSTRAINT clients_designer_id_fkey 
  FOREIGN KEY (designer_id) 
  REFERENCES public.staff_members(id) 
  ON DELETE SET NULL;

-- 4. Clean up the temp column
ALTER TABLE public.clients DROP COLUMN designer_staff_id;

-- 5. Create a function to auto-sync squad members to client roles
CREATE OR REPLACE FUNCTION public.sync_squad_to_client()
RETURNS TRIGGER AS $$
DECLARE
    social_media_id UUID;
    designer_id UUID;
    traffic_id UUID;
    editor_id UUID;
    leader_id UUID;
BEGIN
    -- Only sync if squad_id is changed and not null
    IF (TG_OP = 'UPDATE' AND NEW.squad_id IS DISTINCT FROM OLD.squad_id AND NEW.squad_id IS NOT NULL) OR 
       (TG_OP = 'INSERT' AND NEW.squad_id IS NOT NULL) THEN
        
        -- Get main roles from squad
        SELECT staff_id INTO social_media_id FROM public.staff_squad_members WHERE squad_id = NEW.squad_id AND role = 'social_media' LIMIT 1;
        SELECT staff_id INTO designer_id FROM public.staff_squad_members WHERE squad_id = NEW.squad_id AND role = 'designer' LIMIT 1;
        SELECT staff_id INTO traffic_id FROM public.staff_squad_members WHERE squad_id = NEW.squad_id AND role = 'traffic_manager' LIMIT 1;
        SELECT staff_id INTO editor_id FROM public.staff_squad_members WHERE squad_id = NEW.squad_id AND role = 'editor' LIMIT 1;
        SELECT staff_id INTO leader_id FROM public.staff_squad_members WHERE squad_id = NEW.squad_id AND role = 'leader' LIMIT 1;

        -- Apply to NEW record
        IF social_media_id IS NOT NULL THEN NEW.social_media_staff_id = social_media_id; END IF;
        IF designer_id IS NOT NULL THEN NEW.designer_id = designer_id; END IF;
        IF traffic_id IS NOT NULL THEN NEW.traffic_manager_id = traffic_id; END IF;
        IF editor_id IS NOT NULL THEN 
            NEW.editor_id = editor_id;
            NEW.has_audiovisual_service = true;
        END IF;
        IF leader_id IS NOT NULL THEN NEW.head_marketing_id = leader_id; END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for clients table
DROP TRIGGER IF EXISTS tr_sync_squad_to_client ON public.clients;
CREATE TRIGGER tr_sync_squad_to_client
BEFORE INSERT OR UPDATE OF squad_id ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_squad_to_client();

-- 7. Function to sync when squad members are updated
CREATE OR REPLACE FUNCTION public.sync_clients_from_squad_members()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all clients that belong to this squad
    UPDATE public.clients
    SET updated_at = now() -- This will trigger the sync_squad_to_client trigger
    WHERE squad_id = COALESCE(NEW.squad_id, OLD.squad_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger for staff_squad_members
DROP TRIGGER IF EXISTS tr_sync_clients_from_squad_members ON public.staff_squad_members;
CREATE TRIGGER tr_sync_clients_from_squad_members
AFTER INSERT OR UPDATE OR DELETE ON public.staff_squad_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_clients_from_squad_members();
