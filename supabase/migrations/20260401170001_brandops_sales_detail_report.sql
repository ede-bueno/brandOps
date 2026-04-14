BEGIN;

DROP FUNCTION IF EXISTS public.get_sales_detail_report(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_sales_detail_report(
  p_brand_id UUID,
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH filtered_orders AS (
    SELECT
      o.id,
      o.order_number,
      DATE(o.order_date) AS order_date,
      o.items_in_order,
      CASE
        WHEN COALESCE(o.gross_revenue, 0) > 0 AND COALESCE(o.net_revenue, 0) > 0
          THEN GREATEST(COALESCE(o.gross_revenue, 0), COALESCE(o.net_revenue, 0))
        WHEN COALESCE(o.gross_revenue, 0) > 0
          THEN COALESCE(o.gross_revenue, 0)
        ELSE COALESCE(o.net_revenue, 0)
      END AS order_value
    FROM public.orders o
    WHERE o.brand_id = p_brand_id
      AND o.is_ignored = FALSE
      AND COALESCE(o.payment_status, '') = 'Pago'
      AND (p_from IS NULL OR DATE(o.order_date) >= p_from)
      AND (p_to   IS NULL OR DATE(o.order_date) <= p_to)
  ),
  filtered_items AS (
    SELECT
      oi.order_number,
      COALESCE(NULLIF(TRIM(oi.product_name), ''), 'Produto sem nome') AS product_name,
      COALESCE(oi.quantity, 0) AS quantity,
      COALESCE(oi.gross_value, 0) AS gross_value
    FROM public.order_items oi
    WHERE oi.brand_id = p_brand_id
      AND COALESCE(oi.is_ignored, FALSE) = FALSE
      AND (p_from IS NULL OR DATE(oi.order_date) >= p_from)
      AND (p_to   IS NULL OR DATE(oi.order_date) <= p_to)
  ),
  items_by_order AS (
    SELECT
      fi.order_number,
      SUM(fi.quantity) AS items_count
    FROM filtered_items fi
    GROUP BY fi.order_number
  ),
  daily_sales AS (
    SELECT
      fo.order_date::text AS date,
      SUM(fo.order_value) AS revenue,
      COUNT(*) AS orders,
      SUM(COALESCE(ibo.items_count, fo.items_in_order, 0)) AS items
    FROM filtered_orders fo
    LEFT JOIN items_by_order ibo
      ON ibo.order_number = fo.order_number
    GROUP BY fo.order_date
  ),
  top_products AS (
    SELECT
      fi.product_name AS product_key,
      fi.product_name,
      SUM(fi.quantity) AS quantity,
      SUM(fi.gross_value) AS gross_revenue
    FROM filtered_items fi
    GROUP BY fi.product_name
    ORDER BY SUM(fi.gross_value) DESC, fi.product_name
    LIMIT 15
  )
  SELECT JSONB_BUILD_OBJECT(
    'dailySeries',
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'date', ds.date,
            'revenue', ds.revenue,
            'orders', ds.orders,
            'items', ds.items
          )
          ORDER BY ds.date
        )
        FROM daily_sales ds
      ),
      '[]'::JSONB
    ),
    'topProducts',
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'productKey', tp.product_key,
            'productName', tp.product_name,
            'quantity', tp.quantity,
            'grossRevenue', tp.gross_revenue
          )
          ORDER BY tp.gross_revenue DESC, tp.product_name
        )
        FROM top_products tp
      ),
      '[]'::JSONB
    )
  )
  INTO result;

  RETURN COALESCE(
    result,
    JSONB_BUILD_OBJECT(
      'dailySeries', '[]'::JSONB,
      'topProducts', '[]'::JSONB
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_detail_report(uuid, date, date) TO authenticated;

COMMIT;
