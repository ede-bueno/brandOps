DROP INDEX IF EXISTS public.idx_orders_brand_row_hash;
DROP INDEX IF EXISTS public.idx_order_items_brand_row_hash;
DROP INDEX IF EXISTS public.idx_media_performance_row_hash;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_brand_row_hash
  ON public.orders (brand_id, row_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_brand_row_hash
  ON public.order_items (brand_id, row_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_performance_row_hash
  ON public.media_performance (brand_id, row_hash);
