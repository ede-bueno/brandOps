-- BrandOps app support: security, helper functions, and import-ready schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Additional columns used by the real import/export flow
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
  ADD COLUMN IF NOT EXISTS items_in_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shipping_street TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS order_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS order_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS product_specs TEXT,
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.media_performance
  ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS platform VARCHAR(100),
  ADD COLUMN IF NOT EXISTS placement VARCHAR(150),
  ADD COLUMN IF NOT EXISTS device_platform VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delivery VARCHAR(100),
  ADD COLUMN IF NOT EXISTS clicks_all INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_clicks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr_all DECIMAL(10, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr_link DECIMAL(10, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_to_cart INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
  ADD COLUMN IF NOT EXISTS report_start DATE,
  ADD COLUMN IF NOT EXISTS report_end DATE;

CREATE TABLE IF NOT EXISTS public.sales_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  order_number VARCHAR(255) NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  order_discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  order_status VARCHAR(50),
  sku VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sales_lines ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cmv_history_single_open
  ON public.cmv_history (brand_id, sku)
  WHERE valid_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products (brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_brand_id ON public.orders (brand_id);
CREATE INDEX IF NOT EXISTS idx_order_items_brand_id ON public.order_items (brand_id);
CREATE INDEX IF NOT EXISTS idx_media_performance_brand_id ON public.media_performance (brand_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_brand_id ON public.import_logs (brand_id);
CREATE INDEX IF NOT EXISTS idx_cmv_history_brand_id ON public.cmv_history (brand_id);
CREATE INDEX IF NOT EXISTS idx_sales_lines_brand_id ON public.sales_lines (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_user_id ON public.brand_members (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email_unique
  ON public.user_profiles (email);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'BRAND_OWNER'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_brand_access(target_brand_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.brand_members
    WHERE brand_id = target_brand_id
      AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_brand(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_brand_id UUID;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can create brands.';
  END IF;

  INSERT INTO public.brands (name)
  VALUES (TRIM(p_name))
  RETURNING id INTO new_brand_id;

  RETURN new_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_user_to_brand(p_brand_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_id UUID;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can assign memberships.';
  END IF;

  INSERT INTO public.brand_members (brand_id, user_id)
  VALUES (p_brand_id, p_user_id)
  ON CONFLICT (brand_id, user_id) DO UPDATE
    SET brand_id = EXCLUDED.brand_id
  RETURNING id INTO membership_id;

  RETURN membership_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_cmv(
  p_brand_id UUID,
  p_sku TEXT,
  p_cmv_unit NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_entry_id UUID;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'You do not have access to this brand.';
  END IF;

  UPDATE public.cmv_history
  SET valid_to = NOW(),
      updated_at = NOW()
  WHERE brand_id = p_brand_id
    AND sku = p_sku
    AND valid_to IS NULL;

  INSERT INTO public.cmv_history (brand_id, sku, cmv_unit, valid_from)
  VALUES (p_brand_id, p_sku, p_cmv_unit, NOW())
  RETURNING id INTO new_entry_id;

  RETURN new_entry_id;
END;
$$;

DROP POLICY IF EXISTS "Super admins can do everything on brands" ON public.brands;
DROP POLICY IF EXISTS "Brand owners can view their own brands" ON public.brands;
DROP POLICY IF EXISTS "Super admins can manage brands" ON public.brands;
DROP POLICY IF EXISTS "Brand members can view their brands" ON public.brands;
CREATE POLICY "Super admins can manage brands"
  ON public.brands
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE POLICY "Brand members can view their brands"
  ON public.brands
  FOR SELECT
  USING (public.has_brand_access(id));

DROP POLICY IF EXISTS "Super admins can do everything on products" ON public.products;
DROP POLICY IF EXISTS "Brand owners can view their own products" ON public.products;
DROP POLICY IF EXISTS "Super admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Brand members can manage products" ON public.products;
CREATE POLICY "Super admins can manage products"
  ON public.products
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE POLICY "Brand members can manage products"
  ON public.products
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Super admins can manage user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Super admins can manage user profiles"
  ON public.user_profiles
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Super admins can manage brand members" ON public.brand_members;
DROP POLICY IF EXISTS "Users can view accessible brand memberships" ON public.brand_members;
DROP POLICY IF EXISTS "Users can view accessible brand memberships" ON public.brand_members;
CREATE POLICY "Super admins can manage brand members"
  ON public.brand_members
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can view accessible brand memberships"
  ON public.brand_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_brand_access(brand_id)
  );

DROP POLICY IF EXISTS "Brand members can manage cmv history" ON public.cmv_history;
CREATE POLICY "Brand members can manage cmv history"
  ON public.cmv_history
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Brand members can manage orders" ON public.orders;
CREATE POLICY "Brand members can manage orders"
  ON public.orders
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Brand members can manage order items" ON public.order_items;
CREATE POLICY "Brand members can manage order items"
  ON public.order_items
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Brand members can manage sales lines" ON public.sales_lines;
CREATE POLICY "Brand members can manage sales lines"
  ON public.sales_lines
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Brand members can manage media performance" ON public.media_performance;
CREATE POLICY "Brand members can manage media performance"
  ON public.media_performance
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Brand members can read import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Brand members can create import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Brand members can update own import logs" ON public.import_logs;
CREATE POLICY "Brand members can read import logs"
  ON public.import_logs
  FOR SELECT
  USING (public.has_brand_access(brand_id));
CREATE POLICY "Brand members can create import logs"
  ON public.import_logs
  FOR INSERT
  WITH CHECK (
    public.has_brand_access(brand_id)
    AND user_id = auth.uid()
  );
CREATE POLICY "Brand members can update own import logs"
  ON public.import_logs
  FOR UPDATE
  USING (
    public.has_brand_access(brand_id)
    AND user_id = auth.uid()
  )
  WITH CHECK (
    public.has_brand_access(brand_id)
    AND user_id = auth.uid()
  );

DROP TRIGGER IF EXISTS set_brands_updated_at ON public.brands;
CREATE TRIGGER set_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_cmv_history_updated_at ON public.cmv_history;
CREATE TRIGGER set_cmv_history_updated_at
  BEFORE UPDATE ON public.cmv_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_media_performance_updated_at ON public.media_performance;
CREATE TRIGGER set_media_performance_updated_at
  BEFORE UPDATE ON public.media_performance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_sales_lines_updated_at ON public.sales_lines;
CREATE TRIGGER set_sales_lines_updated_at
  BEFORE UPDATE ON public.sales_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
