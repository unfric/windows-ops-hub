-- Drop unused/legacy tables that were replaced by the logs infrastructure
DROP TABLE IF EXISTS public.material_status CASCADE;
DROP TABLE IF EXISTS public.production_status CASCADE;
DROP TABLE IF EXISTS public.dispatch CASCADE;
DROP TABLE IF EXISTS public.installation CASCADE;

-- Drop unused settings tables (features removed from UI)
DROP TABLE IF EXISTS public.production_units CASCADE;
DROP TABLE IF EXISTS public.coating_vendors CASCADE;

-- Remove unused default app settings
DELETE FROM public.app_settings WHERE key IN (
  'material_dependency_cutting',
  'material_dependency_glazing',
  'material_dependency_assembly'
);
