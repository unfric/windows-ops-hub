-- Consolidated Initial Schema
-- Generated to optimize and secure the Supabase setup.

-- 1. Enums
CREATE TYPE public.app_role AS ENUM (
  'sales', 'finance', 'survey', 'design', 'procurement', 
  'stores', 'production', 'quality', 'dispatch', 'installation', 
  'management', 'admin'
);

-- 2. Tables

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_no TEXT,
  sales_order_no TEXT,
  order_name TEXT NOT NULL DEFAULT '',
  order_type TEXT NOT NULL DEFAULT 'Retail',
  product_type TEXT NOT NULL DEFAULT 'Windows',
  other_product_type TEXT,
  dealer_name TEXT NOT NULL DEFAULT '',
  salesperson TEXT,
  colour_shade TEXT,
  total_windows INTEGER NOT NULL DEFAULT 0,
  windows_released INTEGER NOT NULL DEFAULT 0,
  sqft NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commercial_status TEXT NOT NULL DEFAULT 'pending',
  finance_status TEXT NOT NULL DEFAULT 'Pending Approval',
  survey_status TEXT NOT NULL DEFAULT 'Pending',
  design_status TEXT NOT NULL DEFAULT 'Pending',
  dispatch_status TEXT NOT NULL DEFAULT 'Not Dispatched',
  installation_status TEXT NOT NULL DEFAULT 'Pending',
  rework_qty INTEGER NOT NULL DEFAULT 0,
  rework_issue TEXT,
  approval_for_production TEXT NOT NULL DEFAULT 'Pending',
  approval_for_dispatch TEXT NOT NULL DEFAULT 'Pending',
  finance_remarks TEXT,
  survey_done_windows INTEGER NOT NULL DEFAULT 0,
  survey_remarks TEXT,
  design_released_windows INTEGER NOT NULL DEFAULT 0,
  design_remarks TEXT,
  hardware_availability TEXT NOT NULL DEFAULT 'No',
  extrusion_availability TEXT NOT NULL DEFAULT 'No',
  glass_availability TEXT NOT NULL DEFAULT 'No',
  coated_extrusion_availability TEXT NOT NULL DEFAULT 'No',
  store_remarks TEXT,
  hardware_po_status TEXT NOT NULL DEFAULT 'Not Required',
  extrusion_po_status TEXT NOT NULL DEFAULT 'Not Required',
  glass_po_status TEXT NOT NULL DEFAULT 'Not Required',
  coating_status TEXT NOT NULL DEFAULT 'Not Required',
  procurement_remarks TEXT,
  hardware_delivery_date DATE,
  extrusion_delivery_date DATE,
  glass_delivery_date DATE,
  coating_delivery_date DATE,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_sales_order_no_unique ON public.orders (sales_order_no) WHERE sales_order_no IS NOT NULL AND sales_order_no != '';

CREATE TABLE public.material_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  aluminium_status TEXT NOT NULL DEFAULT 'pending',
  glass_status TEXT NOT NULL DEFAULT 'pending',
  hardware_status TEXT NOT NULL DEFAULT 'pending',
  aluminium_expected_date DATE,
  glass_expected_date DATE,
  hardware_expected_date DATE,
  coating_vendor TEXT
);

CREATE TABLE public.production_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  unit TEXT,
  cutting INTEGER NOT NULL DEFAULT 0,
  assembly INTEGER NOT NULL DEFAULT 0,
  glazing INTEGER NOT NULL DEFAULT 0,
  qc INTEGER NOT NULL DEFAULT 0,
  packing INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.dispatch (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  windows_dispatched INTEGER NOT NULL DEFAULT 0,
  dispatch_date DATE,
  transporter TEXT,
  vehicle_details TEXT
);

CREATE TABLE public.installation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  installation_planned DATE,
  installation_completed DATE,
  installation_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  updated_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.rework_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rework_qty INTEGER NOT NULL DEFAULT 0,
  rework_issue TEXT NOT NULL,
  issue_type TEXT,
  responsible_person TEXT,
  solution TEXT,
  cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reported_date DATE DEFAULT CURRENT_DATE,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.order_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  updated_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_mode TEXT,
  source_module TEXT NOT NULL DEFAULT 'Finance',
  status TEXT NOT NULL DEFAULT 'Confirmed',
  entered_by UUID,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.production_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  windows_completed INTEGER NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks TEXT,
  entered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.dispatch_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  windows_dispatched INTEGER NOT NULL DEFAULT 0,
  dispatch_date DATE,
  transporter TEXT,
  vehicle_details TEXT,
  remarks TEXT,
  entered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.installation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  windows_installed INTEGER NOT NULL DEFAULT 0,
  installation_date DATE,
  site_supervisor TEXT,
  remarks TEXT,
  entered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Settings Tables
CREATE TABLE public.salespersons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.dealers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.colour_shades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.production_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.coating_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.project_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_client_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.other_product_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.commercial_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Functions & Triggers

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check for specific domain
  IF NEW.email NOT LIKE '%@mywindow.co.in' THEN
    RAISE EXCEPTION 'Registration restricted to @mywindow.co.in domain';
  END IF;

  INSERT INTO public.profiles (user_id, name, email, status, joined_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, 'active', now())
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    joined_at = COALESCE(profiles.joined_at, now()),
    name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), profiles.name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_balance_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.balance_amount := NEW.order_value - NEW.advance_received;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_balance
  BEFORE INSERT OR UPDATE OF order_value, advance_received
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_balance_amount();

CREATE OR REPLACE FUNCTION public.update_orders_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_orders_timestamp();

-- 4. Default Seed Data
INSERT INTO public.app_settings (key, value) VALUES
  ('min_advance_percentage', '50'),
  ('material_dependency_cutting', 'Aluminium must be Received before Cutting can begin'),
  ('material_dependency_glazing', 'Glass must be Received before Glazing can begin'),
  ('material_dependency_assembly', 'Hardware must be Received before Assembly can begin');

INSERT INTO public.production_units (name) VALUES ('Unit-1'), ('Unit-2');
INSERT INTO public.commercial_statuses (name) VALUES ('Pipeline'), ('Confirmed'), ('Hold'), ('Cancelled');

-- 5. RLS Setup

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rework_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.salespersons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colour_shades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coating_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_client_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_statuses ENABLE ROW LEVEL SECURITY;

-- 6. Policies

-- Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Base Policies helper logic (using functions for cleanliness or just inline)
-- Orders
CREATE POLICY "Authenticated users can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'quality') OR public.has_role(auth.uid(), 'dispatch') OR public.has_role(auth.uid(), 'installation') OR public.has_role(auth.uid(), 'survey') OR public.has_role(auth.uid(), 'design') OR public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'stores') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Material status
CREATE POLICY "Authenticated can view material_status" ON public.material_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert material_status" ON public.material_status FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'stores') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update material_status" ON public.material_status FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'stores') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

-- Production status & logs
CREATE POLICY "Authenticated can view production_status" ON public.production_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert production_status" ON public.production_status FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update production_status" ON public.production_status FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view production_logs" ON public.production_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert production_logs" ON public.production_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update production_logs" ON public.production_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

-- Dispatch & logs
CREATE POLICY "Authenticated can view dispatch" ON public.dispatch FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert dispatch" ON public.dispatch FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dispatch') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update dispatch" ON public.dispatch FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dispatch') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view dispatch_logs" ON public.dispatch_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert dispatch_logs" ON public.dispatch_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dispatch') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update dispatch_logs" ON public.dispatch_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dispatch') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

-- Installation & logs
CREATE POLICY "Authenticated can view installation" ON public.installation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert installation" ON public.installation FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'installation') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update installation" ON public.installation FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'installation') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view installation_logs" ON public.installation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert installation_logs" ON public.installation_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'installation') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update installation_logs" ON public.installation_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'installation') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

-- Payment logs
CREATE POLICY "Authenticated can view payment_logs" ON public.payment_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert payment_logs" ON public.payment_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update payment_logs" ON public.payment_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted delete payment_logs" ON public.payment_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

-- Rework logs
CREATE POLICY "Authenticated can view rework_logs" ON public.rework_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role restricted insert rework_logs" ON public.rework_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'quality') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role restricted update rework_logs" ON public.rework_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'quality') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'management') OR public.has_role(auth.uid(), 'admin'));

-- Audit log
CREATE POLICY "Authenticated can view audit_log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Order activity log
CREATE POLICY "Authenticated can view order_activity_log" ON public.order_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert order_activity_log" ON public.order_activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Settings Tables Policies
CREATE POLICY "Authenticated can view salespersons" ON public.salespersons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage salespersons" ON public.salespersons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view dealers" ON public.dealers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage dealers" ON public.dealers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view colour_shades" ON public.colour_shades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage colour_shades" ON public.colour_shades FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view app_settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage app_settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view production_units" ON public.production_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage production_units" ON public.production_units FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view coating_vendors" ON public.coating_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage coating_vendors" ON public.coating_vendors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view project_names" ON public.project_names FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage project_names" ON public.project_names FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view project_client_names" ON public.project_client_names FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage project_client_names" ON public.project_client_names FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view other_product_types" ON public.other_product_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage other_product_types" ON public.other_product_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view commercial_statuses" ON public.commercial_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage commercial_statuses" ON public.commercial_statuses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Realtime setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
