-- 1. Ensure designer_id in clients references staff_members instead of the legacy designers table
-- First, let's check the current column type and constraints
DO $$ 
BEGIN
    -- If there's a foreign key to designers, drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_designer_id_fkey' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE public.clients DROP CONSTRAINT clients_designer_id_fkey;
    END IF;

    -- Update the column to reference staff_members
    -- We assume the data already contains staff_member IDs or will be corrected
    ALTER TABLE public.clients 
    ADD CONSTRAINT clients_designer_id_staff_fkey 
    FOREIGN KEY (designer_id) REFERENCES public.staff_members(id) ON DELETE SET NULL;
END $$;

-- 2. Create or Update the trigger function to sync squad members to clients
CREATE OR REPLACE FUNCTION public.fn_sync_squad_to_clients()
RETURNS TRIGGER AS $$
DECLARE
    squad_row RECORD;
    m RECORD;
    social_media_id UUID;
    designer_id UUID;
    traffic_manager_id UUID;
    editor_id UUID;
    head_marketing_id UUID;
BEGIN
    -- Only run if squad_id is changed and not null
    IF (TG_OP = 'UPDATE' AND (OLD.squad_id IS DISTINCT FROM NEW.squad_id)) OR (TG_OP = 'INSERT' AND NEW.squad_id IS NOT NULL) THEN
        
        -- Reset variables
        social_media_id := NULL;
        designer_id := NULL;
        traffic_manager_id := NULL;
        editor_id := NULL;
        head_marketing_id := NULL;

        -- Find specific roles in the squad
        FOR m IN SELECT staff_id, role FROM public.staff_squad_members WHERE squad_id = NEW.squad_id LOOP
            IF m.role = 'social_media' THEN social_media_id := m.staff_id;
            ELSIF m.role = 'designer' THEN designer_id := m.staff_id;
            ELSIF m.role = 'traffic_manager' THEN traffic_manager_id := m.staff_id;
            ELSIF m.role = 'editor' THEN editor_id := m.staff_id;
            ELSIF m.role = 'leader' OR m.role = 'head_marketing' THEN head_marketing_id := m.staff_id;
            END IF;
        END LOOP;

        -- Apply to the client
        NEW.social_media_staff_id := COALESCE(social_media_id, NEW.social_media_staff_id);
        NEW.designer_id := COALESCE(designer_id, NEW.designer_id);
        NEW.traffic_manager_id := COALESCE(traffic_manager_id, NEW.traffic_manager_id);
        NEW.editor_id := COALESCE(editor_id, NEW.editor_id);
        NEW.head_marketing_id := COALESCE(head_marketing_id, NEW.head_marketing_id);
        NEW.has_audiovisual_service := CASE WHEN editor_id IS NOT NULL THEN true ELSE NEW.has_audiovisual_service END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger on clients table
DROP TRIGGER IF EXISTS tr_sync_squad_to_client ON public.clients;
CREATE TRIGGER tr_sync_squad_to_client
BEFORE INSERT OR UPDATE OF squad_id ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_squad_to_clients();

-- 4. Create a function to handle when a squad MEMBER changes
-- This will update all clients linked to that squad
CREATE OR REPLACE FUNCTION public.fn_sync_squad_member_change_to_clients()
RETURNS TRIGGER AS $$
DECLARE
    m RECORD;
    social_media_id UUID;
    designer_id UUID;
    traffic_manager_id UUID;
    editor_id UUID;
    head_marketing_id UUID;
    current_squad_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        current_squad_id := OLD.squad_id;
    ELSE
        current_squad_id := NEW.squad_id;
    END IF;

    -- Get full squad composition
    social_media_id := (SELECT staff_id FROM public.staff_squad_members WHERE squad_id = current_squad_id AND role = 'social_media' LIMIT 1);
    designer_id := (SELECT staff_id FROM public.staff_squad_members WHERE squad_id = current_squad_id AND role = 'designer' LIMIT 1);
    traffic_manager_id := (SELECT staff_id FROM public.staff_squad_members WHERE squad_id = current_squad_id AND role = 'traffic_manager' LIMIT 1);
    editor_id := (SELECT staff_id FROM public.staff_squad_members WHERE squad_id = current_squad_id AND role = 'editor' LIMIT 1);
    head_marketing_id := (SELECT staff_id FROM public.staff_squad_members WHERE squad_id = current_squad_id AND (role = 'leader' OR role = 'head_marketing') LIMIT 1);

    -- Update all clients linked to this squad
    UPDATE public.clients SET
        social_media_staff_id = COALESCE(social_media_id, social_media_staff_id),
        designer_id = COALESCE(designer_id, designer_id),
        traffic_manager_id = COALESCE(traffic_manager_id, traffic_manager_id),
        editor_id = COALESCE(editor_id, editor_id),
        head_marketing_id = COALESCE(head_marketing_id, head_marketing_id),
        has_audiovisual_service = CASE WHEN editor_id IS NOT NULL THEN true ELSE has_audiovisual_service END
    WHERE squad_id = current_squad_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger on staff_squad_members
DROP TRIGGER IF EXISTS tr_sync_squad_members_to_clients ON public.staff_squad_members;
CREATE TRIGGER tr_sync_squad_members_to_clients
AFTER INSERT OR UPDATE OR DELETE ON public.staff_squad_members
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_squad_member_change_to_clients();