-- Add progress columns to orders for bulk import/sync
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS windows_dispatched INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS windows_installed INTEGER NOT NULL DEFAULT 0;

-- Comment to explain purpose
COMMENT ON COLUMN public.orders.windows_dispatched IS 'Tally of windows dispatched, can be updated via bulk import';
COMMENT ON COLUMN public.orders.windows_installed IS 'Tally of windows installed, can be updated via bulk import';
