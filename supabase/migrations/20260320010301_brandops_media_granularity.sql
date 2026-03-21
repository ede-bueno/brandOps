ALTER TABLE public.media_performance
  DROP CONSTRAINT IF EXISTS media_performance_brand_id_date_campaign_name_adset_name_ad_key;

ALTER TABLE public.media_performance
  ADD CONSTRAINT media_performance_brand_id_date_campaign_name_adset_name_ad_key
  UNIQUE (
    brand_id,
    date,
    campaign_name,
    adset_name,
    ad_name,
    platform,
    placement,
    device_platform
  );
