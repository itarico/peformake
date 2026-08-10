-- =============================================
-- SISTEMA PEFORMAKE - MÓDULO 1: Base e Cadastros
-- =============================================

-- 1. Criar enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'social_media', 'designer');

-- 2. Criar enum para tipo de arte
CREATE TYPE public.art_type AS ENUM ('post_instagram', 'story', 'carrossel');

-- 3. Criar enum para status da arte
CREATE TYPE public.art_status AS ENUM (
  'pending_briefing',
  'ready_for_production',
  'in_production',
  'awaiting_approval',
  'revision_requested',
  'approved'
);

-- 4. Tabela de perfis de usuários (vinculada a auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela de roles de usuários (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 6. Tabela de designers (freelancers)
CREATE TABLE public.designers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  cost_per_art DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabela de clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  designer_id UUID REFERENCES public.designers(id) ON DELETE SET NULL,
  arts_per_month INTEGER NOT NULL DEFAULT 4,
  contract_months INTEGER NOT NULL DEFAULT 12,
  price_per_art DECIMAL(10,2) NOT NULL DEFAULT 0,
  portal_token UUID NOT NULL DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Tabela de meses de trabalho
CREATE TABLE public.work_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  is_planning_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);

-- 9. Tabela de artes
CREATE TABLE public.arts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_month_id UUID REFERENCES public.work_months(id) ON DELETE CASCADE NOT NULL,
  art_number INTEGER NOT NULL,
  art_type art_type,
  title TEXT,
  description TEXT,
  caption TEXT,
  reference_image_url TEXT,
  observations TEXT,
  final_art_url TEXT,
  status art_status NOT NULL DEFAULT 'pending_briefing',
  is_extra BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Tabela de histórico de aprovações/comentários
CREATE TABLE public.art_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  art_id UUID REFERENCES public.arts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_portal BOOLEAN NOT NULL DEFAULT false,
  action TEXT NOT NULL CHECK (action IN ('comment', 'approve', 'request_revision')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Tabela de notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- FUNÇÕES DE SEGURANÇA
-- =============================================

-- Função para verificar role do usuário (SECURITY DEFINER para evitar recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário é admin ou social_media
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'social_media')
  )
$$;

-- Função para obter designer_id do usuário
CREATE OR REPLACE FUNCTION public.get_designer_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.designers WHERE user_id = _user_id LIMIT 1
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- TRIGGERS PARA updated_at
-- =============================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_designers_updated_at
  BEFORE UPDATE ON public.designers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_months_updated_at
  BEFORE UPDATE ON public.work_months
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_arts_updated_at
  BEFORE UPDATE ON public.arts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- USER_ROLES (apenas leitura para o próprio usuário, admin pode gerenciar)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DESIGNERS
CREATE POLICY "Staff can view all designers"
  ON public.designers FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin can manage designers"
  ON public.designers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Designer can view own record"
  ON public.designers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- CLIENTS
CREATE POLICY "Staff can view all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin can manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Designer can view assigned clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (designer_id = public.get_designer_id(auth.uid()));

-- WORK_MONTHS
CREATE POLICY "Staff can view all work months"
  ON public.work_months FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage work months"
  ON public.work_months FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Designer can view assigned client work months"
  ON public.work_months FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
      AND c.designer_id = public.get_designer_id(auth.uid())
    )
  );

-- ARTS
CREATE POLICY "Staff can view all arts"
  ON public.arts FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage arts"
  ON public.arts FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Designer can view assigned arts"
  ON public.arts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_months wm
      JOIN public.clients c ON c.id = wm.client_id
      WHERE wm.id = work_month_id
      AND c.designer_id = public.get_designer_id(auth.uid())
    )
  );

CREATE POLICY "Designer can update assigned arts"
  ON public.arts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_months wm
      JOIN public.clients c ON c.id = wm.client_id
      WHERE wm.id = work_month_id
      AND c.designer_id = public.get_designer_id(auth.uid())
    )
  );

-- ART_COMMENTS
CREATE POLICY "Staff can view all comments"
  ON public.art_comments FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Authenticated can create comments"
  ON public.art_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Designer can view comments on assigned arts"
  ON public.art_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arts a
      JOIN public.work_months wm ON wm.id = a.work_month_id
      JOIN public.clients c ON c.id = wm.client_id
      WHERE a.id = art_id
      AND c.designer_id = public.get_designer_id(auth.uid())
    )
  );

-- NOTIFICATIONS
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- =============================================
-- FUNÇÃO PARA GERAR MESES E ARTES AUTOMATICAMENTE
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_client_work_months()
RETURNS TRIGGER AS $$
DECLARE
  current_date_val DATE := CURRENT_DATE;
  start_year INTEGER := EXTRACT(YEAR FROM current_date_val);
  start_month INTEGER := EXTRACT(MONTH FROM current_date_val);
  i INTEGER;
  calc_year INTEGER;
  calc_month INTEGER;
  new_work_month_id UUID;
  j INTEGER;
BEGIN
  -- Gerar meses de trabalho baseado no contract_months
  FOR i IN 0..(NEW.contract_months - 1) LOOP
    calc_month := start_month + i;
    calc_year := start_year;
    
    -- Ajustar ano quando passar de dezembro
    WHILE calc_month > 12 LOOP
      calc_month := calc_month - 12;
      calc_year := calc_year + 1;
    END LOOP;
    
    -- Inserir mês de trabalho
    INSERT INTO public.work_months (client_id, year, month)
    VALUES (NEW.id, calc_year, calc_month)
    RETURNING id INTO new_work_month_id;
    
    -- Gerar artes vazias para o mês
    FOR j IN 1..NEW.arts_per_month LOOP
      INSERT INTO public.arts (work_month_id, art_number)
      VALUES (new_work_month_id, j);
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER generate_work_months_on_client_insert
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.generate_client_work_months();

-- =============================================
-- TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();