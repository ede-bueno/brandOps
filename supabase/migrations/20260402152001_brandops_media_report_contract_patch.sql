BEGIN;

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
      COALESCE(SUM(link_clicks), 0) AS link_clicks,
      COUNT(*) AS row_count
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
      CASE WHEN impressions > 0 THEN clicks_all::NUMERIC / impressions ELSE 0 END AS ctr_all,
      CASE WHEN impressions > 0 THEN link_clicks::NUMERIC / impressions ELSE 0 END AS ctr_link,
      CASE WHEN link_clicks > 0 THEN spend / link_clicks ELSE 0 END AS cpc,
      CASE WHEN purchases > 0 THEN spend / purchases ELSE 0 END AS cpa,
      CASE
        WHEN spend >= 150
          AND (CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END) >= 1.6
          AND (CASE WHEN impressions > 0 THEN clicks_all::NUMERIC / impressions ELSE 0 END) >= 0.025
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
          AND (CASE WHEN impressions > 0 THEN clicks_all::NUMERIC / impressions ELSE 0 END) >= 0.025
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
  best_scale_row AS (
    SELECT *
    FROM campaign_enriched
    WHERE spend > 0
    ORDER BY roas DESC, spend DESC, campaign_name
    LIMIT 1
  ),
  priority_review_row AS (
    SELECT *
    FROM campaign_enriched
    WHERE action = 'review'
    ORDER BY spend DESC, campaign_name
    LIMIT 1
  ),
  top_campaign_by_spend AS (
    SELECT *
    FROM campaign_enriched
    ORDER BY spend DESC, campaign_name
    LIMIT 1
  ),
  command_room AS (
    SELECT JSONB_BUILD_OBJECT(
      'bestScale',
      (
        SELECT JSONB_BUILD_OBJECT(
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
        FROM best_scale_row
      ),
      'priorityReview',
      (
        SELECT JSONB_BUILD_OBJECT(
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
        FROM priority_review_row
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
  ),
  signals_payload AS (
    SELECT JSONB_BUILD_OBJECT(
      'attributedRoas',
      CASE
        WHEN spend <= 0 AND impressions <= 0 THEN JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Amostra insuficiente',
          'description', 'Ainda não há investimento suficiente no período para leitura confiável.'
        )
        WHEN (CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END) >= 1 THEN JSONB_BUILD_OBJECT(
          'tone', 'positive',
          'title', 'ROAS em zona saudável',
          'description', 'A receita atribuída já cobre o investimento com folga mínima para operar.'
        )
        WHEN (CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END) > 0
          AND (CASE WHEN spend > 0 THEN purchase_value / spend ELSE 0 END) < 0.8 THEN JSONB_BUILD_OBJECT(
          'tone', 'warning',
          'title', 'ROAS pressionado',
          'description', 'O retorno atribuído ainda está abaixo do patamar desejável antes de escalar verba.'
        )
        ELSE JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Em observação',
          'description', 'O ROAS ainda está em observação para o volume investido.'
        )
      END,
      'ctrAll',
      CASE
        WHEN spend <= 0 AND impressions <= 0 THEN JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Amostra insuficiente',
          'description', 'Ainda não há impressões suficientes para leitura confiável do CTR.'
        )
        WHEN (CASE WHEN impressions > 0 THEN clicks_all::NUMERIC / impressions ELSE 0 END) >= 0.02 THEN JSONB_BUILD_OBJECT(
          'tone', 'positive',
          'title', 'CTR geral saudável',
          'description', 'A campanha está gerando clique total em ritmo coerente com a entrega.'
        )
        WHEN (CASE WHEN impressions > 0 THEN clicks_all::NUMERIC / impressions ELSE 0 END) > 0
          AND (CASE WHEN impressions > 0 THEN clicks_all::NUMERIC / impressions ELSE 0 END) < 0.012 THEN JSONB_BUILD_OBJECT(
          'tone', 'warning',
          'title', 'CTR geral fraco',
          'description', 'O criativo ou a segmentação podem não estar despertando interesse suficiente.'
        )
        ELSE JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Em observação',
          'description', 'O CTR geral segue em observação no volume atual.'
        )
      END,
      'ctrLink',
      CASE
        WHEN spend <= 0 AND impressions <= 0 THEN JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Amostra insuficiente',
          'description', 'Ainda não há impressões suficientes para leitura confiável do CTR link.'
        )
        WHEN (CASE WHEN impressions > 0 THEN link_clicks::NUMERIC / impressions ELSE 0 END) >= 0.01 THEN JSONB_BUILD_OBJECT(
          'tone', 'positive',
          'title', 'CTR link saudável',
          'description', 'Os anúncios estão levando clique qualificado para o destino em ritmo consistente.'
        )
        WHEN (CASE WHEN impressions > 0 THEN link_clicks::NUMERIC / impressions ELSE 0 END) > 0
          AND (CASE WHEN impressions > 0 THEN link_clicks::NUMERIC / impressions ELSE 0 END) < 0.006 THEN JSONB_BUILD_OBJECT(
          'tone', 'warning',
          'title', 'CTR link pressionado',
          'description', 'A promessa criativa ou o CTA podem estar fracos para gerar clique no link.'
        )
        ELSE JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Em observação',
          'description', 'O CTR link ainda está em observação para o volume atual.'
        )
      END,
      'cpc',
      CASE
        WHEN spend <= 0 AND impressions <= 0 THEN JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Amostra insuficiente',
          'description', 'Ainda não há cliques suficientes para leitura confiável do CPC.'
        )
        WHEN (CASE WHEN link_clicks > 0 THEN spend / link_clicks ELSE 0 END) > 0
          AND (CASE WHEN link_clicks > 0 THEN spend / link_clicks ELSE 0 END) <= 1.5 THEN JSONB_BUILD_OBJECT(
          'tone', 'positive',
          'title', 'CPC controlado',
          'description', 'O custo por clique está controlado para o padrão atual da conta.'
        )
        WHEN (CASE WHEN link_clicks > 0 THEN spend / link_clicks ELSE 0 END) > 2.2 THEN JSONB_BUILD_OBJECT(
          'tone', 'warning',
          'title', 'CPC elevado',
          'description', 'O clique está caro demais para o retorno atual. Vale revisar criativo e público.'
        )
        ELSE JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Em observação',
          'description', 'O CPC ainda não aponta pressão forte no recorte atual.'
        )
      END,
      'cpa',
      CASE
        WHEN spend <= 0 AND impressions <= 0 THEN JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Amostra insuficiente',
          'description', 'Ainda não há compras suficientes para leitura confiável do CPA.'
        )
        WHEN purchases > 0 AND (spend / purchases) <= 80 THEN JSONB_BUILD_OBJECT(
          'tone', 'positive',
          'title', 'CPA controlado',
          'description', 'O custo por compra atribuída está em uma zona saudável para a leitura da conta.'
        )
        WHEN purchases > 0 AND (spend / purchases) > 120 THEN JSONB_BUILD_OBJECT(
          'tone', 'warning',
          'title', 'CPA elevado',
          'description', 'A compra atribuída está saindo cara demais para sustentar escala com conforto.'
        )
        ELSE JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Em observação',
          'description', 'O CPA segue em observação no volume atual.'
        )
      END
    ) AS payload
    FROM summary_row
  ),
  highlights_payload AS (
    SELECT JSONB_BUILD_OBJECT(
      'topCampaignBySpend',
      (
        SELECT JSONB_BUILD_OBJECT(
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
        FROM top_campaign_by_spend
      )
    ) AS payload
  ),
  meta_payload AS (
    SELECT JSONB_BUILD_OBJECT(
      'generatedAt', NOW() AT TIME ZONE 'UTC',
      'from', p_from,
      'to', p_to,
      'mode', scope.mode,
      'manualFallback', scope.manual_fallback,
      'hasData', CASE WHEN sr.row_count > 0 THEN TRUE ELSE FALSE END
    ) AS payload
    FROM media_scope scope
    CROSS JOIN summary_row sr
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
        'ctrAll', CASE WHEN impressions > 0 THEN clicks_all::NUMERIC / impressions ELSE 0 END,
        'ctrLink', CASE WHEN impressions > 0 THEN link_clicks::NUMERIC / impressions ELSE 0 END,
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
            'ctrAll', CASE WHEN ds.impressions > 0 THEN ds.clicks_all::NUMERIC / ds.impressions ELSE 0 END,
            'ctrLink', CASE WHEN ds.impressions > 0 THEN ds.link_clicks::NUMERIC / ds.impressions ELSE 0 END,
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
    'commandRoom', (SELECT payload FROM command_room),
    'highlights', COALESCE((SELECT payload FROM highlights_payload), JSONB_BUILD_OBJECT('topCampaignBySpend', NULL)),
    'signals', COALESCE((SELECT payload FROM signals_payload), '{}'::JSONB),
    'meta', COALESCE((SELECT payload FROM meta_payload), '{}'::JSONB)
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
      ),
      'highlights', JSONB_BUILD_OBJECT('topCampaignBySpend', NULL),
      'signals', JSONB_BUILD_OBJECT(
        'attributedRoas', JSONB_BUILD_OBJECT('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há investimento suficiente no período para leitura confiável.'),
        'ctrAll', JSONB_BUILD_OBJECT('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há impressões suficientes para leitura confiável do CTR.'),
        'ctrLink', JSONB_BUILD_OBJECT('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há impressões suficientes para leitura confiável do CTR link.'),
        'cpc', JSONB_BUILD_OBJECT('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há cliques suficientes para leitura confiável do CPC.'),
        'cpa', JSONB_BUILD_OBJECT('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há compras suficientes para leitura confiável do CPA.')
      ),
      'meta', JSONB_BUILD_OBJECT(
        'generatedAt', NOW() AT TIME ZONE 'UTC',
        'from', p_from,
        'to', p_to,
        'mode', 'manual_csv',
        'manualFallback', FALSE,
        'hasData', FALSE
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_media_report(UUID, DATE, DATE) TO authenticated;

COMMIT;
