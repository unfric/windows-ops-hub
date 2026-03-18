-- Add date columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS tat_date DATE,
ADD COLUMN IF NOT EXISTS target_delivery_date DATE,
ADD COLUMN IF NOT EXISTS dispatch_date DATE;

-- Create TAT configuration table
CREATE TABLE IF NOT EXISTS public.tat_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_type TEXT NOT NULL,
  colour_shade TEXT NOT NULL,
  days_to_add INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(material_type, colour_shade)
);

-- Enable RLS for tat_config
ALTER TABLE public.tat_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all users" ON public.tat_config FOR SELECT USING (true);
CREATE POLICY "Allow all for admin/management" ON public.tat_config FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'management')
  )
);

-- Seed some default TAT logic
INSERT INTO public.tat_config (material_type, colour_shade, days_to_add) 
VALUES 
  ('Windows', 'White', 10),
  ('Windows', 'Wood Finish', 15),
  ('Windows', 'Standard', 7)
ON CONFLICT DO NOTHING;
