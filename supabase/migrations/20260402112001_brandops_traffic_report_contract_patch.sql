BEGIN;

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
  ),
  top_source AS (
    SELECT jsonb_build_object(
      'key', bs.key,
      'label', bs.label,
      'sessions', bs.sessions,
      'purchases', bs.purchases,
      'purchaseRevenue', bs.purchase_revenue,
      'purchaseRate', CASE WHEN bs.sessions > 0 THEN bs.purchases::NUMERIC / bs.sessions ELSE 0 END,
      'revenuePerSession', CASE WHEN bs.sessions > 0 THEN bs.purchase_revenue / bs.sessions ELSE 0 END
    ) AS payload
    FROM by_source bs
    ORDER BY bs.purchase_revenue DESC, bs.sessions DESC, bs.label
    LIMIT 1
  ),
  top_campaign AS (
    SELECT jsonb_build_object(
      'key', bc.key,
      'label', bc.label,
      'sessions', bc.sessions,
      'purchases', bc.purchases,
      'purchaseRevenue', bc.purchase_revenue,
      'purchaseRate', CASE WHEN bc.sessions > 0 THEN bc.purchases::NUMERIC / bc.sessions ELSE 0 END,
      'revenuePerSession', CASE WHEN bc.sessions > 0 THEN bc.purchase_revenue / bc.sessions ELSE 0 END
    ) AS payload
    FROM by_campaign bc
    ORDER BY bc.purchase_revenue DESC, bc.sessions DESC, bc.label
    LIMIT 1
  ),
  top_landing AS (
    SELECT jsonb_build_object(
      'key', bl.key,
      'label', bl.label,
      'sessions', bl.sessions,
      'purchases', bl.purchases,
      'purchaseRevenue', bl.purchase_revenue,
      'purchaseRate', CASE WHEN bl.sessions > 0 THEN bl.purchases::NUMERIC / bl.sessions ELSE 0 END,
      'revenuePerSession', CASE WHEN bl.sessions > 0 THEN bl.purchase_revenue / bl.sessions ELSE 0 END
    ) AS payload
    FROM by_landing bl
    ORDER BY bl.purchase_revenue DESC, bl.sessions DESC, bl.label
    LIMIT 1
  ),
  top_revenue_landing AS (
    SELECT jsonb_build_object(
      'key', bl.key,
      'label', bl.label,
      'sessions', bl.sessions,
      'purchases', bl.purchases,
      'purchaseRevenue', bl.purchase_revenue,
      'purchaseRate', CASE WHEN bl.sessions > 0 THEN bl.purchases::NUMERIC / bl.sessions ELSE 0 END,
      'revenuePerSession', CASE WHEN bl.sessions > 0 THEN bl.purchase_revenue / bl.sessions ELSE 0 END
    ) AS payload
    FROM by_landing bl
    ORDER BY
      CASE WHEN bl.sessions > 0 THEN bl.purchase_revenue / bl.sessions ELSE 0 END DESC,
      bl.purchase_revenue DESC,
      bl.sessions DESC,
      bl.label
    LIMIT 1
  ),
  signals_payload AS (
    SELECT jsonb_build_object(
      'revenuePerSession', jsonb_build_object(
        'tone',
          CASE
            WHEN sessions = 0 THEN 'neutral'
            WHEN purchase_revenue / NULLIF(sessions, 0) >= 2 THEN 'positive'
            WHEN purchase_revenue / NULLIF(sessions, 0) < 1 THEN 'warning'
            ELSE 'neutral'
          END,
        'title',
          CASE
            WHEN sessions = 0 THEN 'Amostra insuficiente'
            WHEN purchase_revenue / NULLIF(sessions, 0) >= 2 THEN 'Receita por sessão saudável'
            WHEN purchase_revenue / NULLIF(sessions, 0) < 1 THEN 'Receita por sessão pressionada'
            ELSE 'Em observação'
          END,
        'description',
          CASE
            WHEN sessions = 0 THEN 'Ainda não há volume suficiente para uma leitura confiável.'
            WHEN purchase_revenue / NULLIF(sessions, 0) >= 2 THEN 'O tráfego está convertendo em valor por visita acima do piso saudável da operação.'
            WHEN purchase_revenue / NULLIF(sessions, 0) < 1 THEN 'O tráfego gera alguma receita, mas ainda abaixo do patamar desejável para ganhar escala.'
            ELSE 'O indicador ainda precisa de mais volume ou melhor eficiência para formar leitura conclusiva.'
          END
      ),
      'sessionToCartRate', jsonb_build_object(
        'tone',
          CASE
            WHEN sessions = 0 THEN 'neutral'
            WHEN add_to_carts::NUMERIC / NULLIF(sessions, 0) >= 0.05 THEN 'positive'
            WHEN add_to_carts::NUMERIC / NULLIF(sessions, 0) < 0.035 THEN 'warning'
            ELSE 'neutral'
          END,
        'title',
          CASE
            WHEN sessions = 0 THEN 'Amostra insuficiente'
            WHEN add_to_carts::NUMERIC / NULLIF(sessions, 0) >= 0.05 THEN 'Boa intenção de compra'
            WHEN add_to_carts::NUMERIC / NULLIF(sessions, 0) < 0.035 THEN 'Entrada com pouca aderência'
            ELSE 'Em observação'
          END,
        'description',
          CASE
            WHEN sessions = 0 THEN 'Ainda não há volume suficiente para uma leitura confiável.'
            WHEN add_to_carts::NUMERIC / NULLIF(sessions, 0) >= 0.05 THEN 'As sessões estão chegando com aderência suficiente para virar carrinho.'
            WHEN add_to_carts::NUMERIC / NULLIF(sessions, 0) < 0.035 THEN 'O topo do funil ainda entrega pouco interesse. Vale revisar qualidade do tráfego e da vitrine.'
            ELSE 'A taxa está em observação e ainda pede mais amostra para leitura segura.'
          END
      ),
      'checkoutRate', jsonb_build_object(
        'tone',
          CASE
            WHEN add_to_carts = 0 THEN 'neutral'
            WHEN begin_checkouts::NUMERIC / NULLIF(add_to_carts, 0) >= 0.4 THEN 'positive'
            WHEN begin_checkouts::NUMERIC / NULLIF(add_to_carts, 0) < 0.25 THEN 'warning'
            ELSE 'neutral'
          END,
        'title',
          CASE
            WHEN add_to_carts = 0 THEN 'Amostra insuficiente'
            WHEN begin_checkouts::NUMERIC / NULLIF(add_to_carts, 0) >= 0.4 THEN 'Checkout consistente'
            WHEN begin_checkouts::NUMERIC / NULLIF(add_to_carts, 0) < 0.25 THEN 'Atrito entre carrinho e checkout'
            ELSE 'Em observação'
          END,
        'description',
          CASE
            WHEN add_to_carts = 0 THEN 'Ainda não há volume suficiente para uma leitura confiável.'
            WHEN begin_checkouts::NUMERIC / NULLIF(add_to_carts, 0) >= 0.4 THEN 'Quem adiciona ao carrinho segue para checkout em ritmo coerente.'
            WHEN begin_checkouts::NUMERIC / NULLIF(add_to_carts, 0) < 0.25 THEN 'Existe fricção entre carrinho e checkout. Vale revisar preço, PDP e clareza da oferta.'
            ELSE 'A taxa segue estável, mas ainda sem sinal forte o bastante para diagnóstico definitivo.'
          END
      ),
      'purchaseRate', jsonb_build_object(
        'tone',
          CASE
            WHEN sessions = 0 THEN 'neutral'
            WHEN purchases::NUMERIC / NULLIF(sessions, 0) >= 0.01 THEN 'positive'
            WHEN purchases::NUMERIC / NULLIF(sessions, 0) < 0.006 THEN 'warning'
            ELSE 'neutral'
          END,
        'title',
          CASE
            WHEN sessions = 0 THEN 'Amostra insuficiente'
            WHEN purchases::NUMERIC / NULLIF(sessions, 0) >= 0.01 THEN 'Compra final em zona saudável'
            WHEN purchases::NUMERIC / NULLIF(sessions, 0) < 0.006 THEN 'Compra final abaixo do esperado'
            ELSE 'Em observação'
          END,
        'description',
          CASE
            WHEN sessions = 0 THEN 'Ainda não há volume suficiente para uma leitura confiável.'
            WHEN purchases::NUMERIC / NULLIF(sessions, 0) >= 0.01 THEN 'O funil está conseguindo transformar sessões em compra em um patamar saudável.'
            WHEN purchases::NUMERIC / NULLIF(sessions, 0) < 0.006 THEN 'A jornada final ainda não converte o suficiente. Revise checkout, confiança e aderência entre mídia e landing.'
            ELSE 'A compra por sessão ainda está em observação para o volume atual.'
          END
      )
    ) AS payload
    FROM summary_row
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
    ),
    'highlights',
    jsonb_build_object(
      'topSource', (SELECT payload FROM top_source),
      'topCampaign', (SELECT payload FROM top_campaign),
      'topLanding', (SELECT payload FROM top_landing),
      'topRevenueLanding', (SELECT payload FROM top_revenue_landing)
    ),
    'signals',
    COALESCE((SELECT payload FROM signals_payload), '{}'::jsonb),
    'meta',
    jsonb_build_object(
      'generatedAt', timezone('utc', now()),
      'from', p_from,
      'to', p_to,
      'hasData', EXISTS (SELECT 1 FROM filtered_rows)
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
      'frictionSignal', 'Assim que houver tráfego, o sistema passa a comparar intenção, checkout e compra para localizar atritos do funil.',
      'highlights', jsonb_build_object(
        'topSource', NULL,
        'topCampaign', NULL,
        'topLanding', NULL,
        'topRevenueLanding', NULL
      ),
      'signals', jsonb_build_object(
        'revenuePerSession', jsonb_build_object('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há volume suficiente para uma leitura confiável.'),
        'sessionToCartRate', jsonb_build_object('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há volume suficiente para uma leitura confiável.'),
        'checkoutRate', jsonb_build_object('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há volume suficiente para uma leitura confiável.'),
        'purchaseRate', jsonb_build_object('tone', 'neutral', 'title', 'Amostra insuficiente', 'description', 'Ainda não há volume suficiente para uma leitura confiável.')
      ),
      'meta', jsonb_build_object(
        'generatedAt', timezone('utc', now()),
        'from', p_from,
        'to', p_to,
        'hasData', FALSE
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_traffic_report(UUID, DATE, DATE) TO authenticated;

COMMIT;
