-- Trigger to automatically create a draft payment when advance_received is recorded or changed
CREATE OR REPLACE FUNCTION public.sync_advance_to_payment_log()
RETURNS trigger AS $$
BEGIN
  -- We only create a draft payment if:
  -- 1. It's a new record with advance_received > 0
  -- 2. It's an update where advance_received has increased or changed to any positive value
  IF (TG_OP = 'INSERT' AND NEW.advance_received > 0) OR 
     (TG_OP = 'UPDATE' AND NEW.advance_received > 0 AND NEW.advance_received IS DISTINCT FROM OLD.advance_received) THEN
    
    INSERT INTO public.payment_logs (
      order_id,
      amount,
      source_module,
      status,
      entered_by,
      payment_date
    ) VALUES (
      NEW.id,
      NEW.advance_received,
      'Sales',
      'Draft',
      COALESCE(NEW.updated_by, NEW.created_by),
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_advance_to_payment ON public.orders;
CREATE TRIGGER trg_sync_advance_to_payment
  AFTER INSERT OR UPDATE OF advance_received
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_advance_to_payment_log();
