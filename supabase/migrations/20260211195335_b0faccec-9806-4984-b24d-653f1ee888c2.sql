
-- Table: services (the 6 service types)
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  default_price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admin can manage services" ON public.services FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Table: service_packages (named packages)
CREATE TABLE public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view packages" ON public.service_packages FOR SELECT USING (true);
CREATE POLICY "Admin can manage packages" ON public.service_packages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Table: package_services (junction: services in a package with price)
CREATE TABLE public.package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(package_id, service_id)
);

ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view package services" ON public.package_services FOR SELECT USING (true);
CREATE POLICY "Admin can manage package services" ON public.package_services FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Table: client_services (services activated for a client)
CREATE TABLE public.client_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.service_packages(id) ON DELETE SET NULL,
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, service_id)
);

ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view client services" ON public.client_services FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Admin can manage client services" ON public.client_services FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default services
INSERT INTO public.services (name, slug, default_price, display_order) VALUES
  ('Produção Audiovisual', 'producao_audiovisual', 0, 1),
  ('Tráfego', 'trafego', 0, 2),
  ('Design', 'design', 0, 3),
  ('Social Mídia', 'social_midia', 0, 4),
  ('Consultoria', 'consultoria', 0, 5),
  ('Desenvolvimento de Sistema', 'desenvolvimento_sistema', 0, 6);

-- Triggers for updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_packages_updated_at BEFORE UPDATE ON public.service_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_services_updated_at BEFORE UPDATE ON public.client_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
