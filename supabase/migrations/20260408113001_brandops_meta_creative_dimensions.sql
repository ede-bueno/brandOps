BEGIN;

ALTER TABLE public.media_performance
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS adset_id TEXT,
  ADD COLUMN IF NOT EXISTS ad_id TEXT,
  ADD COLUMN IF NOT EXISTS creative_id TEXT,
  ADD COLUMN IF NOT EXISTS creative_name TEXT;

CREATE INDEX IF NOT EXISTS idx_media_performance_brand_ad_id
  ON public.media_performance (brand_id, ad_id);

CREATE INDEX IF NOT EXISTS idx_media_performance_brand_creative_id
  ON public.media_performance (brand_id, creative_id);

CREATE OR REPLACE FUNCTION public.ingest_meta_raw(
  p_brand_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
  updated_count  INTEGER := 0;
  row_data       JSONB;
  h              TEXT;
  was_inserted   BOOLEAN;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied to brand %', p_brand_id;
  END IF;

  FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    h := md5(
      p_brand_id::TEXT || '|'
        || COALESCE(row_data->>'report_start', '') || '|'
        || COALESCE(row_data->>'campaign_name', '') || '|'
        || COALESCE(row_data->>'adset_name', '') || '|'
        || COALESCE(row_data->>'ad_name', '')
    );

    INSERT INTO public.media_performance (
      brand_id,
      date,
      report_start,
      report_end,
      campaign_id,
      campaign_name,
      adset_id,
      adset_name,
      ad_id,
      ad_name,
      creative_id,
      creative_name,
      account_name,
      platform,
      placement,
      device_platform,
      delivery,
      reach,
      impressions,
      clicks,
      clicks_all,
      link_clicks,
      spend,
      purchases,
      conversion_value,
      ctr_all,
      ctr_link,
      add_to_cart,
      currency,
      row_hash
    )
    VALUES (
      p_brand_id,
      (row_data->>'report_start')::DATE,
      (row_data->>'report_start')::DATE,
      COALESCE((row_data->>'report_end')::DATE, (row_data->>'report_start')::DATE),
      NULLIF(row_data->>'campaign_id', ''),
      COALESCE(row_data->>'campaign_name', ''),
      NULLIF(row_data->>'adset_id', ''),
      COALESCE(row_data->>'adset_name', ''),
      NULLIF(row_data->>'ad_id', ''),
      COALESCE(row_data->>'ad_name', ''),
      NULLIF(row_data->>'creative_id', ''),
      NULLIF(row_data->>'creative_name', ''),
      NULLIF(row_data->>'account_name', ''),
      COALESCE(NULLIF(row_data->>'platform', ''), 'meta_ads'),
      COALESCE(NULLIF(row_data->>'placement', ''), 'all'),
      COALESCE(NULLIF(row_data->>'device_platform', ''), 'all'),
      COALESCE(NULLIF(row_data->>'delivery', ''), 'api'),
      COALESCE((row_data->>'reach')::INTEGER, 0),
      COALESCE((row_data->>'impressions')::INTEGER, 0),
      COALESCE((row_data->>'link_clicks')::INTEGER, COALESCE((row_data->>'clicks_all')::INTEGER, 0)),
      COALESCE((row_data->>'clicks_all')::INTEGER, 0),
      COALESCE((row_data->>'link_clicks')::INTEGER, 0),
      COALESCE((row_data->>'spend')::NUMERIC, 0),
      COALESCE((row_data->>'purchases')::INTEGER, 0),
      COALESCE((row_data->>'revenue')::NUMERIC, 0),
      COALESCE((row_data->>'ctr_all')::NUMERIC, 0),
      COALESCE((row_data->>'ctr_link')::NUMERIC, 0),
      COALESCE((row_data->>'add_to_cart')::INTEGER, 0),
      'BRL',
      h
    )
    ON CONFLICT (brand_id, row_hash) DO UPDATE SET
      date             = EXCLUDED.date,
      report_start     = EXCLUDED.report_start,
      report_end       = EXCLUDED.report_end,
      campaign_id      = EXCLUDED.campaign_id,
      campaign_name    = EXCLUDED.campaign_name,
      adset_id         = EXCLUDED.adset_id,
      adset_name       = EXCLUDED.adset_name,
      ad_id            = EXCLUDED.ad_id,
      ad_name          = EXCLUDED.ad_name,
      creative_id      = EXCLUDED.creative_id,
      creative_name    = EXCLUDED.creative_name,
      account_name     = EXCLUDED.account_name,
      platform         = EXCLUDED.platform,
      placement        = EXCLUDED.placement,
      device_platform  = EXCLUDED.device_platform,
      delivery         = EXCLUDED.delivery,
      reach            = EXCLUDED.reach,
      impressions      = EXCLUDED.impressions,
      clicks           = EXCLUDED.clicks,
      clicks_all       = EXCLUDED.clicks_all,
      link_clicks      = EXCLUDED.link_clicks,
      spend            = EXCLUDED.spend,
      purchases        = EXCLUDED.purchases,
      conversion_value = EXCLUDED.conversion_value,
      ctr_all          = EXCLUDED.ctr_all,
      ctr_link         = EXCLUDED.ctr_link,
      add_to_cart      = EXCLUDED.add_to_cart,
      currency         = EXCLUDED.currency,
      updated_at       = NOW()
    RETURNING (xmax = 0) INTO was_inserted;

    IF was_inserted THEN
      inserted_count := inserted_count + 1;
    ELSE
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'updated', updated_count
  );
END;
$$;

COMMIT;
