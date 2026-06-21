CREATE OR REPLACE FUNCTION public.bulk_update_jan_aushadhi_price(p_updates jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  WITH payload AS (
    SELECT id, jan_aushadhi_price
    FROM jsonb_to_recordset(p_updates) AS x(id uuid, jan_aushadhi_price numeric)
    WHERE id IS NOT NULL AND jan_aushadhi_price IS NOT NULL
  ),
  changed AS (
    UPDATE public.medicines m
    SET jan_aushadhi_price = p.jan_aushadhi_price
    FROM payload p
    WHERE m.id = p.id
    RETURNING m.id
  )
  SELECT count(*) INTO v_updated FROM changed;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_jan_aushadhi_price(jsonb) TO service_role;
