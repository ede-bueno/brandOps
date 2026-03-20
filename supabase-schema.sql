-- Supabase Schema for Print on Demand Financial Analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Brands (Tenants)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users and Roles
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'BRAND_OWNER');

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'BRAND_OWNER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Brand Memberships (Many-to-Many)
CREATE TABLE brand_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, user_id)
);

-- 4. Products (from feed_facebook.csv)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    sku VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2),
    image_url TEXT,
    product_url TEXT,
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, sku)
);

-- 5. CMV History (Cost of Goods Sold)
CREATE TABLE cmv_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    sku VARCHAR(255) NOT NULL,
    cmv_unit DECIMAL(10, 2) NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Orders (from Pedidos Pagos.csv & Lista de Pedidos.csv)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    order_number VARCHAR(255) NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_name VARCHAR(255),
    gross_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50),
    source VARCHAR(100),
    tracking_code VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, order_number)
);

-- 7. Order Items (from Lista de Itens.csv)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    gross_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cmv_unit_applied DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cmv_total_applied DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Media Performance (from Meta Export.csv)
CREATE TABLE media_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    campaign_name VARCHAR(255),
    adset_name VARCHAR(255),
    ad_name VARCHAR(255),
    spend DECIMAL(10, 2) NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    purchases INTEGER NOT NULL DEFAULT 0,
    conversion_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_ignored BOOLEAN NOT NULL DEFAULT FALSE, -- For sanitization
    ignore_reason TEXT,
    ignored_by UUID REFERENCES user_profiles(id),
    ignored_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, date, campaign_name, adset_name, ad_name)
);

-- 9. Import Logs
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- PENDING, SUCCESS, FAILED
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ROW LEVEL SECURITY (RLS)

-- Enable RLS on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmv_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for brands
CREATE POLICY "Super admins can do everything on brands" ON brands
    FOR ALL USING (is_super_admin());

CREATE POLICY "Brand owners can view their own brands" ON brands
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM brand_members
            WHERE brand_members.brand_id = brands.id
            AND brand_members.user_id = auth.uid()
        )
    );

-- RLS Policies for products (and other brand-specific tables)
-- Example for products, apply similar to others
CREATE POLICY "Super admins can do everything on products" ON products
    FOR ALL USING (is_super_admin());

CREATE POLICY "Brand owners can view their own products" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM brand_members
            WHERE brand_members.brand_id = products.brand_id
            AND brand_members.user_id = auth.uid()
        )
    );
