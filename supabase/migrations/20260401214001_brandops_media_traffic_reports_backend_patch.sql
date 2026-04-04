BEGIN;

DROP FUNCTION IF EXISTS public.get_media_report(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_traffic_report(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_media_report(
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

  WITH meta_config AS (
    SELECT
      COALESCE(
        (
          SELECT mode
          FROM public.brand_integrations
          WHERE brand_id = p_brand_id
            AND provider = 'meta'
          LIMIT 1
        ),
        'manual_csv'
      ) AS mode,
      COALESCE(
        (
          SELECT (settings->>'manualFallback')::BOOLEAN
          FROM public.brand_integrations
          WHERE brand_id = p_brand_id
            AND provider = 'meta'
          LIMIT 1
        ),
        FALSE
      ) AS manual_fallback
  ),
  raw_media AS (
    SELECT
      mp.id,
      COALESCE(mp.report_start, mp.date) AS metric_date,
      COALESCE(mp.campaign_name, 'Campanha sem nome') AS campaign_name,
      COALESCE(mp.adset_name, 'Sem conjunto') AS adset_name,
      COALESCE(mp.ad_name, 'Sem anúncio') AS ad_name,
      CASE
        WHEN LOWER(TRIM(COALESCE(mp.delivery, ''))) = 'api' THEN 'api'
        ELSE 'manual_csv'
      END AS data_source,
      CONCAT_WS(
        '::',
        COALESCE(COALESCE(mp.report_start, mp.date)::TEXT, ''),
        COALESCE(mp.campaign_name, ''),
        COALESCE(mp.adset_name, ''),
        COALESCE(mp.ad_name, '')
      ) AS merge_key,
      COALESCE(mp.reach, 0) AS reach,
      COALESCE(mp.impressions, 0) AS impressions,
      COALESCE(mp.clicks_all, 0) AS clicks_all,
      COALESCE(mp.link_clicks, 0) AS link_clicks,
      COALESCE(mp.spend, 0) AS spend,
      COALESCE(mp.purchases, 0) AS purchases,
      COALESCE(mp.conversion_value, 0) AS purchase_value
    FROM public.media_performance mp
    WHERE mp.brand_id = p_brand_id
      AND COALESCE(mp.is_ignored, FALSE) = FALSE
      AND COALESCE(mp.report_start, mp.date) IS NOT NULL
      AND (p_from IS NULL OR COALESCE(mp.report_start, mp.date) >= p_from)
      AND (p_to   IS NULL OR COALESCE(mp.report_start, mp.date) <= p_to)
  ),
  media_scope AS (
    SELECT
      cfg.mode,
      cfg.manual_fallback,
      EXISTS (
        SELECT 1
        FROM raw_media rm
        WHERE rm.data_source = 'api'
      ) AS has_api_rows
    FROM meta_config cfg
  ),
  effective_media AS (
    SELECT rm.*
    FROM raw_media rm
    CROSS JOIN media_scope scope
    WHERE scope.mode <> 'disabled'
      AND (
        (scope.mode <> 'api' AND rm.data_source = 'manual_csv')
        OR
        (
          scope.mode = 'api'
          AND (
            rm.data_source = 'api'
            OR (
              scope.manual_fallback = TRUE
              AND rm.data_source = 'manual_csv'
              AND (
                scope.has_api_rows = FALSE
                OR NOT EXISTS (
                  SELECT 1
                  FROM raw_media api
                  WHERE api.data_source = 'api'
                    AND api.merge_key = rm.merge_key
                )
              )
            )
          )
        )
      )
  ),
  summary_row AS (
    SELECT
      COALESCE(SUM(spend), 0) AS spend,
      COALESCE(SUM(purchase_value), 0) AS purchase_value,
      COALESCE(SUM(purchases), 0) AS purchases,
      COALESCE(SUM(reach), 0) AS reach,
      COALESCE(SUM(impressions), 0) AS impressions,
      COALESCE(SUM(clicks_all), 0) AS clicks_all,
      COALESCE(SUM(link_clicks), 0) AS link_clicks
    FROM effective_media
  ),
  daily_series AS (
    SELECT
      metric_date::TEXT AS date,
      SUM(spend) AS spend,
      SUM(purchase_value) AS purchase_value,
      SUM(purchases) AS purchases,
      SUM(reach) AS reach,
      SUM(impressions) AS impressions,
      SUM(clicks_all) AS clicks_all,
      SUM(link_clicks) AS link_clicks
    FROM effective_media
    GROUP BY metric_date
  ),
  campaign_rows AS (
    SELECT
      campaign_name,
      SUM(spend) AS spend,
      SUM(purchase_value) AS purchase_value,
      SUM(purchases) AS purchases,
      SUM(reach) AS reach,
      SUM(impressions) AS impressions,
      SUM(clicks_all) AS clicks_all,
      SUM(link_clicks) AS link_clicks
    FROM effective_media
    GROUP BY campaign_name
  ),
  campaign_enriched AS (
    SELECT
      campaign_name,
      spend,
      purchase_value,
      purchases,
      reach,
      impressions,
      clicks_all,
      link_clicks,
      CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END AS roas,
      CASE WHEN impressions > 0 THEN clicks_all / impressions ELSE 0 END AS ctr_all,
      CASE WHEN impressions > 0 THEN link_clicks / impressions ELSE 0 END AS ctr_link,
      CASE WHEN link_clicks > 0 THEN spend / link_clicks ELSE 0 END AS cpc,
      CASE WHEN purchases > 0 THEN spend / purchases ELSE 0 END AS cpa,
      CASE
        WHEN spend >= 150
          AND (CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END) >= 1.6
          AND (CASE WHEN impressions > 0 THEN clicks_all / impressions ELSE 0 END) >= 0.025
        THEN 'scale'
        WHEN spend >= 150
          AND (
            (CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END) < 1
            OR (purchases = 0 AND clicks_all >= 40)
          )
        THEN 'review'
        ELSE 'monitor'
      END AS action,
      CASE
        WHEN spend >= 150
          AND (CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END) >= 1.6
          AND (CASE WHEN impressions > 0 THEN clicks_all / impressions ELSE 0 END) >= 0.025
        THEN 'Há retorno e aderência suficientes para considerar aumento gradual de verba.'
        WHEN spend >= 150
          AND (
            (CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END) < 1
            OR (purchases = 0 AND clicks_all >= 40)
          )
        THEN 'A campanha está consumindo verba sem retorno proporcional. Vale revisar criativo, público ou distribuição.'
        ELSE 'O desempenho está em observação. Ainda vale acompanhar antes de mexer na verba.'
      END AS summary
    FROM campaign_rows
  ),
  command_room AS (
    SELECT JSONB_BUILD_OBJECT(
      'bestScale',
      (
        SELECT CASE
          WHEN COUNT(*) = 0 THEN NULL
          ELSE JSONB_BUILD_OBJECT(
            'campaignName', campaign_name,
            'spend', spend,
            'purchaseValue', purchase_value,
            'purchases', purchases,
            'reach', reach,
            'impressions', impressions,
            'clicksAll', clicks_all,
            'linkClicks', link_clicks,
            'roas', roas,
            'ctrAll', ctr_all,
            'ctrLink', ctr_link,
            'cpc', cpc,
            'cpa', cpa,
            'action', action,
            'summary', summary
          )
        END
        FROM (
          SELECT *
          FROM campaign_enriched
          WHERE spend > 0
          ORDER BY roas DESC, spend DESC, campaign_name
          LIMIT 1
        ) best_scale
      ),
      'priorityReview',
      (
        SELECT CASE
          WHEN COUNT(*) = 0 THEN NULL
          ELSE JSONB_BUILD_OBJECT(
            'campaignName', campaign_name,
            'spend', spend,
            'purchaseValue', purchase_value,
            'purchases', purchases,
            'reach', reach,
            'impressions', impressions,
            'clicksAll', clicks_all,
            'linkClicks', link_clicks,
            'roas', roas,
            'ctrAll', ctr_all,
            'ctrLink', ctr_link,
            'cpc', cpc,
            'cpa', cpa,
            'action', action,
            'summary', summary
          )
        END
        FROM (
          SELECT *
          FROM campaign_enriched
          WHERE action = 'review'
          ORDER BY spend DESC, campaign_name
          LIMIT 1
        ) priority_review
      ),
      'narrative',
      (
        SELECT CASE
          WHEN spend <= 0 THEN 'Ainda não há investimento suficiente no período para formar uma leitura gerencial da mídia.'
          WHEN purchase_value / spend >= 1.5 THEN 'A mídia já mostra retorno atribuído saudável. O foco deve ser encontrar as campanhas que sustentam esse padrão para escalar com cuidado.'
          WHEN purchase_value / spend >= 1 THEN 'O período está em zona de atenção. Há sinal de retorno, mas ainda não de forma confortável para subir verba sem revisar eficiência.'
          ELSE 'O retorno atribuído ainda está pressionado. Antes de aumentar investimento, a prioridade deve ser corrigir as campanhas que consomem mais verba e devolvem menos.'
        END
        FROM summary_row
      )
    ) AS payload
  )
  SELECT JSONB_BUILD_OBJECT(
    'summary',
    (
      SELECT JSONB_BUILD_OBJECT(
        'spend', spend,
        'purchaseValue', purchase_value,
        'purchases', purchases,
        'reach', reach,
        'impressions', impressions,
        'clicksAll', clicks_all,
        'linkClicks', link_clicks,
        'attributedRoas', CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END,
        'ctrAll', CASE WHEN impressions > 0 THEN clicks_all / impressions ELSE 0 END,
        'ctrLink', CASE WHEN impressions > 0 THEN link_clicks / impressions ELSE 0 END,
        'cpc', CASE WHEN link_clicks > 0 THEN spend / link_clicks ELSE 0 END,
        'cpa', CASE WHEN purchases > 0 THEN spend / purchases ELSE 0 END
      )
      FROM summary_row
    ),
    'dailySeries',
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'date', ds.date,
            'spend', ds.spend,
            'purchaseValue', ds.purchase_value,
            'purchases', ds.purchases,
            'reach', ds.reach,
            'impressions', ds.impressions,
            'clicksAll', ds.clicks_all,
            'linkClicks', ds.link_clicks,
            'attributedRoas', CASE WHEN ds.spend > 0 THEN ds.purchase_value / ds.spend ELSE 0 END,
            'ctrAll', CASE WHEN ds.impressions > 0 THEN ds.clicks_all / ds.impressions ELSE 0 END,
            'ctrLink', CASE WHEN ds.impressions > 0 THEN ds.link_clicks / ds.impressions ELSE 0 END,
            'cpc', CASE WHEN ds.link_clicks > 0 THEN ds.spend / ds.link_clicks ELSE 0 END,
            'cpa', CASE WHEN ds.purchases > 0 THEN ds.spend / ds.purchases ELSE 0 END
          )
          ORDER BY ds.date
        )
        FROM daily_series ds
      ),
      '[]'::JSONB
    ),
    'campaigns',
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'campaignName', ce.campaign_name,
            'spend', ce.spend,
            'purchaseValue', ce.purchase_value,
            'purchases', ce.purchases,
            'reach', ce.reach,
            'impressions', ce.impressions,
            'clicksAll', ce.clicks_all,
            'linkClicks', ce.link_clicks,
            'roas', ce.roas,
            'ctrAll', ce.ctr_all,
            'ctrLink', ce.ctr_link,
            'cpc', ce.cpc,
            'cpa', ce.cpa,
            'action', ce.action,
            'summary', ce.summary
          )
          ORDER BY ce.spend DESC, ce.campaign_name
        )
        FROM campaign_enriched ce
      ),
      '[]'::JSONB
    ),
    'commandRoom',
    (SELECT payload FROM command_room)
  )
  INTO result;

  RETURN COALESCE(
    result,
    JSONB_BUILD_OBJECT(
      'summary',
      JSONB_BUILD_OBJECT(
        'spend', 0,
        'purchaseValue', 0,
        'purchases', 0,
        'reach', 0,
        'impressions', 0,
        'clicksAll', 0,
        'linkClicks', 0,
        'attributedRoas', 0,
        'ctrAll', 0,
        'ctrLink', 0,
        'cpc', 0,
        'cpa', 0
      ),
      'dailySeries', '[]'::JSONB,
      'campaigns', '[]'::JSONB,
      'commandRoom',
      JSONB_BUILD_OBJECT(
        'bestScale', NULL,
        'priorityReview', NULL,
        'narrative', 'Ainda não há investimento suficiente no período para formar uma leitura gerencial da mídia.'
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_traffic_report(
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

  WITH filtered_rows AS (
    SELECT
      gdp.date,
      COALESCE(NULLIF(TRIM(gdp.source_medium), ''), 'Sem origem') AS source_medium,
      COALESCE(NULLIF(TRIM(gdp.campaign_name), ''), 'Sem campanha') AS campaign_name,
      COALESCE(NULLIF(TRIM(gdp.landing_page), ''), 'Sem landing page') AS landing_page,
      COALESCE(gdp.sessions, 0) AS sessions,
      COALESCE(gdp.total_users, 0) AS total_users,
      COALESCE(gdp.page_views, 0) AS page_views,
      COALESCE(gdp.add_to_carts, 0) AS add_to_carts,
      COALESCE(gdp.begin_checkouts, 0) AS begin_checkouts,
      COALESCE(gdp.purchases, 0) AS purchases,
      COALESCE(gdp.purchase_revenue, 0) AS purchase_revenue
    FROM public.ga4_daily_performance gdp
    WHERE gdp.brand_id = p_brand_id
      AND (p_from IS NULL OR gdp.date >= p_from)
      AND (p_to   IS NULL OR gdp.date <= p_to)
  ),
  summary_row AS (
    SELECT
      COALESCE(SUM(sessions), 0) AS sessions,
      COALESCE(SUM(total_users), 0) AS total_users,
      COALESCE(SUM(page_views), 0) AS page_views,
      COALESCE(SUM(add_to_carts), 0) AS add_to_carts,
      COALESCE(SUM(begin_checkouts), 0) AS begin_checkouts,
      COALESCE(SUM(purchases), 0) AS purchases,
      COALESCE(SUM(purchase_revenue), 0) AS purchase_revenue
    FROM filtered_rows
  ),
  daily_series AS (
    SELECT
      date::TEXT AS date,
      SUM(sessions) AS sessions,
      SUM(total_users) AS total_users,
      SUM(add_to_carts) AS add_to_carts,
      SUM(begin_checkouts) AS begin_checkouts,
      SUM(purchases) AS purchases,
      SUM(purchase_revenue) AS purchase_revenue
    FROM filtered_rows
    GROUP BY date
  ),
  by_source AS (
    SELECT
      source_medium AS key,
      source_medium AS label,
      SUM(sessions) AS sessions,
      SUM(total_users) AS total_users,
      SUM(page_views) AS page_views,
      SUM(add_to_carts) AS add_to_carts,
      SUM(begin_checkouts) AS begin_checkouts,
      SUM(purchases) AS purchases,
      SUM(purchase_revenue) AS purchase_revenue
    FROM filtered_rows
    GROUP BY source_medium
    ORDER BY SUM(purchase_revenue) DESC, SUM(sessions) DESC, source_medium
    LIMIT 10
  ),
  by_campaign AS (
    SELECT
      campaign_name AS key,
      campaign_name AS label,
      SUM(sessions) AS sessions,
      SUM(total_users) AS total_users,
      SUM(page_views) AS page_views,
      SUM(add_to_carts) AS add_to_carts,
      SUM(begin_checkouts) AS begin_checkouts,
      SUM(purchases) AS purchases,
      SUM(purchase_revenue) AS purchase_revenue
    FROM filtered_rows
    GROUP BY campaign_name
    ORDER BY SUM(purchase_revenue) DESC, SUM(sessions) DESC, campaign_name
    LIMIT 10
  ),
  by_landing AS (
    SELECT
      landing_page AS key,
      landing_page AS label,
      SUM(sessions) AS sessions,
      SUM(total_users) AS total_users,
      SUM(page_views) AS page_views,
      SUM(add_to_carts) AS add_to_carts,
      SUM(begin_checkouts) AS begin_checkouts,
      SUM(purchases) AS purchases,
      SUM(purchase_revenue) AS purchase_revenue
    FROM filtered_rows
    GROUP BY landing_page
    ORDER BY SUM(purchase_revenue) DESC, SUM(sessions) DESC, landing_page
    LIMIT 10
  )
  SELECT JSONB_BUILD_OBJECT(
    'summary',
    (
      SELECT JSONB_BUILD_OBJECT(
        'sessions', sessions,
        'totalUsers', total_users,
        'pageViews', page_views,
        'addToCarts', add_to_carts,
        'beginCheckouts', begin_checkouts,
        'purchases', purchases,
        'purchaseRevenue', purchase_revenue,
        'sessionToCartRate', CASE WHEN sessions > 0 THEN add_to_carts::NUMERIC / sessions ELSE 0 END,
        'checkoutRate', CASE WHEN add_to_carts > 0 THEN begin_checkouts::NUMERIC / add_to_carts ELSE 0 END,
        'purchaseRate', CASE WHEN sessions > 0 THEN purchases::NUMERIC / sessions ELSE 0 END,
        'revenuePerSession', CASE WHEN sessions > 0 THEN purchase_revenue / sessions ELSE 0 END
      )
      FROM summary_row
    ),
    'dailySeries',
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'date', ds.date,
            'sessions', ds.sessions,
            'totalUsers', ds.total_users,
            'addToCarts', ds.add_to_carts,
            'beginCheckouts', ds.begin_checkouts,
            'purchases', ds.purchases,
            'purchaseRevenue', ds.purchase_revenue,
            'sessionToCartRate', CASE WHEN ds.sessions > 0 THEN ds.add_to_carts::NUMERIC / ds.sessions ELSE 0 END,
            'checkoutRate', CASE WHEN ds.add_to_carts > 0 THEN ds.begin_checkouts::NUMERIC / ds.add_to_carts ELSE 0 END,
            'purchaseRate', CASE WHEN ds.sessions > 0 THEN ds.purchases::NUMERIC / ds.sessions ELSE 0 END,
            'revenuePerSession', CASE WHEN ds.sessions > 0 THEN ds.purchase_revenue / ds.sessions ELSE 0 END
          )
          ORDER BY ds.date
        )
        FROM daily_series ds
      ),
      '[]'::JSONB
    ),
    'sources',
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'key', bs.key,
            'label', bs.label,
            'sessions', bs.sessions,
            'totalUsers', bs.total_users,
            'pageViews', bs.page_views,
            'addToCarts', bs.add_to_carts,
            'beginCheckouts', bs.begin_checkouts,
            'purchases', bs.purchases,
            'purchaseRevenue', bs.purchase_revenue,
            'purchaseRate', CASE WHEN bs.sessions > 0 THEN bs.purchases::NUMERIC / bs.sessions ELSE 0 END,
            'revenuePerSession', CASE WHEN bs.sessions > 0 THEN bs.purchase_revenue / bs.sessions ELSE 0 END
          )
          ORDER BY bs.purchase_revenue DESC, bs.sessions DESC, bs.label
        )
        FROM by_source bs
      ),
      '[]'::JSONB
    ),
    'campaigns',
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'key', bc.key,
            'label', bc.label,
            'sessions', bc.sessions,
            'totalUsers', bc.total_users,
            'pageViews', bc.page_views,
            'addToCarts', bc.add_to_carts,
            'beginCheckouts', bc.begin_checkouts,
            'purchases', bc.purchases,
            'purchaseRevenue', bc.purchase_revenue,
            'purchaseRate', CASE WHEN bc.sessions > 0 THEN bc.purchases::NUMERIC / bc.sessions ELSE 0 END,
            'revenuePerSession', CASE WHEN bc.sessions > 0 THEN bc.purchase_revenue / bc.sessions ELSE 0 END
          )
          ORDER BY bc.purchase_revenue DESC, bc.sessions DESC, bc.label
        )
        FROM by_campaign bc
      ),
      '[]'::JSONB
    ),
    'landingPages',
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'key', bl.key,
            'label', bl.label,
            'sessions', bl.sessions,
            'totalUsers', bl.total_users,
            'pageViews', bl.page_views,
            'addToCarts', bl.add_to_carts,
            'beginCheckouts', bl.begin_checkouts,
            'purchases', bl.purchases,
            'purchaseRevenue', bl.purchase_revenue,
            'purchaseRate', CASE WHEN bl.sessions > 0 THEN bl.purchases::NUMERIC / bl.sessions ELSE 0 END,
            'revenuePerSession', CASE WHEN bl.sessions > 0 THEN bl.purchase_revenue / bl.sessions ELSE 0 END
          )
          ORDER BY bl.purchase_revenue DESC, bl.sessions DESC, bl.label
        )
        FROM by_landing bl
      ),
      '[]'::JSONB
    ),
    'story',
    (
      SELECT CASE
        WHEN sessions = 0 THEN 'Ainda não há sessões suficientes no período para formar uma leitura gerencial do tráfego.'
        WHEN sessions > 0
          AND purchases::NUMERIC / sessions >= 0.012
          AND purchase_revenue / sessions >= 2
        THEN 'O tráfego do período já converte em um ritmo saudável. A prioridade agora é ampliar os canais e páginas que sustentam receita por sessão acima da média.'
        WHEN sessions > 0
          AND add_to_carts::NUMERIC / sessions >= 0.05
          AND purchases::NUMERIC / sessions < 0.01
        THEN 'Existe intenção de compra, mas a conversão final ainda está pressionada. Vale revisar PDP, checkout e alinhamento entre campanha e landing page.'
        WHEN sessions > 0
          AND add_to_carts::NUMERIC / sessions < 0.035
        THEN 'A loja está recebendo visitas, mas o tráfego ainda não está chegando com aderência suficiente. O foco deve estar em qualidade de canal, promessa criativa e curadoria da entrada.'
        ELSE 'O período ainda pede leitura com cautela. A recomendação é fortalecer amostra antes de mexer forte em mídia ou em decisões de catálogo.'
      END
      FROM summary_row
    ),
    'frictionSignal',
    (
      SELECT CASE
        WHEN sessions = 0 THEN 'Assim que houver tráfego, o sistema passa a comparar intenção, checkout e compra para localizar atritos do funil.'
        WHEN sessions > 0
          AND add_to_carts::NUMERIC / sessions >= 0.05
          AND purchases::NUMERIC / sessions < 0.01
        THEN 'A jornada mostra interesse, mas a conversão final não acompanha. Revise landing pages e aderência da oferta.'
        WHEN sessions > 0
          AND add_to_carts::NUMERIC / sessions < 0.035
        THEN 'O gargalo parece estar no topo do funil. Vale revisar a qualidade do tráfego e a promessa criativa.'
        ELSE 'O funil está coerente para o volume atual. O próximo passo é encontrar os canais e campanhas que sustentam esse padrão.'
      END
      FROM summary_row
    )
  )
  INTO result;

  RETURN COALESCE(
    result,
    JSONB_BUILD_OBJECT(
      'summary',
      JSONB_BUILD_OBJECT(
        'sessions', 0,
        'totalUsers', 0,
        'pageViews', 0,
        'addToCarts', 0,
        'beginCheckouts', 0,
        'purchases', 0,
        'purchaseRevenue', 0,
        'sessionToCartRate', 0,
        'checkoutRate', 0,
        'purchaseRate', 0,
        'revenuePerSession', 0
      ),
      'dailySeries', '[]'::JSONB,
      'sources', '[]'::JSONB,
      'campaigns', '[]'::JSONB,
      'landingPages', '[]'::JSONB,
      'story', 'Ainda não há sessões suficientes no período para formar uma leitura gerencial do tráfego.',
      'frictionSignal', 'Assim que houver tráfego, o sistema passa a comparar intenção, checkout e compra para localizar atritos do funil.'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_media_report(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_traffic_report(UUID, DATE, DATE) TO authenticated;

COMMIT;
