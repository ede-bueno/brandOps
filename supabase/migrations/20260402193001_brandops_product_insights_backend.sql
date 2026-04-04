create index if not exists idx_ga4_item_daily_brand_date_item
  on public.ga4_item_daily_performance (brand_id, date, item_id);

create or replace function public.get_product_insights_base(
  p_brand_id uuid,
  p_from date default null,
  p_to date default null
)
returns table (
  item_id text,
  item_name text,
  item_brand text,
  item_category text,
  item_views bigint,
  add_to_carts bigint,
  checkouts bigint,
  ecommerce_purchases bigint,
  item_purchase_quantity bigint,
  item_revenue numeric
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(item_id, '')::text as item_id,
    coalesce(item_name, '')::text as item_name,
    coalesce(item_brand, '')::text as item_brand,
    coalesce(item_category, '')::text as item_category,
    coalesce(sum(item_views), 0)::bigint as item_views,
    coalesce(sum(add_to_carts), 0)::bigint as add_to_carts,
    coalesce(sum(checkouts), 0)::bigint as checkouts,
    coalesce(sum(ecommerce_purchases), 0)::bigint as ecommerce_purchases,
    coalesce(sum(item_purchase_quantity), 0)::bigint as item_purchase_quantity,
    coalesce(sum(item_revenue), 0)::numeric as item_revenue
  from public.ga4_item_daily_performance
  where brand_id = p_brand_id
    and (p_from is null or date >= p_from)
    and (p_to is null or date <= p_to)
  group by 1, 2, 3, 4
  order by item_views desc, item_revenue desc, item_name asc;
$$;

create or replace function public.get_product_insights_trends(
  p_brand_id uuid,
  p_from date default null,
  p_to date default null
)
returns table (
  date date,
  item_id text,
  item_name text,
  item_brand text,
  item_category text,
  item_views bigint,
  add_to_carts bigint,
  checkouts bigint,
  ecommerce_purchases bigint,
  item_purchase_quantity bigint,
  item_revenue numeric
)
language sql
security definer
set search_path = public
as $$
  select
    date,
    coalesce(item_id, '')::text as item_id,
    coalesce(item_name, '')::text as item_name,
    coalesce(item_brand, '')::text as item_brand,
    coalesce(item_category, '')::text as item_category,
    coalesce(sum(item_views), 0)::bigint as item_views,
    coalesce(sum(add_to_carts), 0)::bigint as add_to_carts,
    coalesce(sum(checkouts), 0)::bigint as checkouts,
    coalesce(sum(ecommerce_purchases), 0)::bigint as ecommerce_purchases,
    coalesce(sum(item_purchase_quantity), 0)::bigint as item_purchase_quantity,
    coalesce(sum(item_revenue), 0)::numeric as item_revenue
  from public.ga4_item_daily_performance
  where brand_id = p_brand_id
    and (p_from is null or date >= p_from)
    and (p_to is null or date <= p_to)
  group by 1, 2, 3, 4, 5
  order by date asc, item_views desc, item_revenue desc, item_name asc;
$$;
