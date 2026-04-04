BEGIN;

CREATE OR REPLACE FUNCTION public.get_financial_report(
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

  WITH filter_scope AS (
    SELECT
      CASE
        WHEN p_from IS NOT NULL THEN date_trunc('month', p_from::timestamp)::date
        WHEN p_to IS NOT NULL THEN date_trunc('month', p_to::timestamp)::date
        ELSE NULL
      END AS expense_from_month,
      CASE
        WHEN p_to IS NOT NULL THEN date_trunc('month', p_to::timestamp)::date
        WHEN p_from IS NOT NULL THEN date_trunc('month', p_from::timestamp)::date
        ELSE NULL
      END AS expense_to_month
  ),
  filtered_daily AS (
    SELECT *
    FROM public.v_daily_metrics dm
    WHERE dm.brand_id = p_brand_id
      AND (p_from IS NULL OR dm.sale_day >= p_from)
      AND (p_to   IS NULL OR dm.sale_day <= p_to)
  ),
  filtered_orders AS (
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN COALESCE(o.coupon_name, '') <> '' THEN COALESCE(o.discount, 0)
            ELSE 0
          END
        ),
        0
      ) AS coupon_discounts
    FROM public.orders o
    WHERE o.brand_id = p_brand_id
      AND o.is_ignored = FALSE
      AND COALESCE(o.payment_status, '') = 'Pago'
      AND (p_from IS NULL OR DATE(o.order_date) >= p_from)
      AND (p_to   IS NULL OR DATE(o.order_date) <= p_to)
  ),
  filtered_expenses AS (
    SELECT
      to_char((be.incurred_on)::timestamp with time zone, 'YYYY-MM'::text) AS yearmonth,
      be.category_id,
      COALESCE(ec.name, 'Sem categoria') AS category_name,
      SUM(COALESCE(be.amount, 0)) AS amount
    FROM public.brand_expenses be
    LEFT JOIN public.expense_categories ec
      ON ec.id = be.category_id
    CROSS JOIN filter_scope fs
    WHERE be.brand_id = p_brand_id
      AND (
        fs.expense_from_month IS NULL
        OR date_trunc('month', be.incurred_on::timestamp)::date >= fs.expense_from_month
      )
      AND (
        fs.expense_to_month IS NULL
        OR date_trunc('month', be.incurred_on::timestamp)::date <= fs.expense_to_month
      )
    GROUP BY
      to_char((be.incurred_on)::timestamp with time zone, 'YYYY-MM'::text),
      be.category_id,
      COALESCE(ec.name, 'Sem categoria')
  ),
  expense_months AS (
    SELECT
      yearmonth,
      SUM(amount) AS fixed_expenses
    FROM filtered_expenses
    GROUP BY yearmonth
  ),
  monthly_daily AS (
    SELECT
      to_char((sale_day)::timestamp with time zone, 'YYYY-MM'::text) AS yearmonth,
      SUM(COALESCE(gross_revenue, 0)) AS gross_revenue,
      SUM(COALESCE(discount_value, 0)) AS discount_value,
      SUM(COALESCE(net_revenue, 0)) AS net_revenue,
      SUM(COALESCE(commission_total, 0)) AS commission_total,
      SUM(COALESCE(cmv_total, 0)) AS cmv_total,
      SUM(COALESCE(gross_margin, 0)) AS gross_margin,
      SUM(COALESCE(adcost, 0)) AS adcost,
      SUM(COALESCE(contribution_margin, 0)) AS contribution_after_media,
      SUM(COALESCE(items_sold, 0)) AS items_sold,
      SUM(COALESCE(qty_real, 0)) AS qty_real,
      SUM(COALESCE(order_count, 0)) AS order_count
    FROM filtered_daily
    GROUP BY to_char((sale_day)::timestamp with time zone, 'YYYY-MM'::text)
  ),
  month_keys AS (
    SELECT yearmonth FROM monthly_daily
    UNION
    SELECT yearmonth FROM expense_months
  ),
  monthly_rows AS (
    SELECT
      mk.yearmonth,
      COALESCE(md.gross_revenue, 0) AS gross_revenue,
      COALESCE(md.discount_value, 0) AS discount_value,
      COALESCE(md.net_revenue, 0) AS net_revenue,
      COALESCE(md.commission_total, 0) AS commission_total,
      COALESCE(md.cmv_total, 0) AS cmv_total,
      COALESCE(md.gross_margin, 0) AS gross_margin,
      COALESCE(md.adcost, 0) AS adcost,
      COALESCE(md.contribution_after_media, 0) AS contribution_after_media,
      COALESCE(em.fixed_expenses, 0) AS fixed_expenses,
      COALESCE(md.contribution_after_media, 0) - COALESCE(em.fixed_expenses, 0) AS operating_result,
      COALESCE(NULLIF(md.items_sold, 0), md.qty_real, 0) AS units_sold,
      COALESCE(md.qty_real, 0) AS qty_real,
      COALESCE(md.order_count, 0) AS order_count
    FROM month_keys mk
    LEFT JOIN monthly_daily md
      ON md.yearmonth = mk.yearmonth
    LEFT JOIN expense_months em
      ON em.yearmonth = mk.yearmonth
  ),
  ranked_months AS (
    SELECT
      mr.*,
      CASE
        WHEN mr.net_revenue > 0 THEN mr.contribution_after_media / mr.net_revenue
        ELSE 0
      END AS contribution_margin_pct,
      CASE
        WHEN mr.net_revenue > 0 THEN mr.operating_result / mr.net_revenue
        ELSE 0
      END AS operating_margin_pct,
      ROW_NUMBER() OVER (ORDER BY mr.yearmonth DESC) AS recency_rank
    FROM monthly_rows mr
  ),
  summary_row AS (
    SELECT
      COALESCE(SUM(gross_revenue), 0) AS gross_revenue,
      COALESCE(SUM(discount_value), 0) AS discounts,
      COALESCE(SUM(net_revenue), 0) AS rld,
      COALESCE(SUM(commission_total), 0) AS commission_total,
      COALESCE(SUM(cmv_total), 0) AS cmv_total,
      COALESCE(SUM(gross_margin), 0) AS gross_margin,
      COALESCE(SUM(adcost), 0) AS media_spend,
      COALESCE(SUM(contribution_after_media), 0) AS contribution_after_media,
      COALESCE(SUM(fixed_expenses), 0) AS fixed_expenses,
      COALESCE(SUM(operating_result), 0) AS operating_result,
      COALESCE(SUM(units_sold), 0) AS units_sold,
      COALESCE(SUM(qty_real), 0) AS qty_real,
      COALESCE(SUM(order_count), 0) AS order_count,
      COUNT(*) FILTER (
        WHERE gross_revenue <> 0
           OR discount_value <> 0
           OR net_revenue <> 0
           OR commission_total <> 0
           OR cmv_total <> 0
           OR gross_margin <> 0
           OR adcost <> 0
           OR contribution_after_media <> 0
           OR fixed_expenses <> 0
      ) AS active_month_count
    FROM monthly_rows
  ),
  summary_metrics AS (
    SELECT
      s.*,
      CASE
        WHEN s.rld > 0 THEN s.contribution_after_media / s.rld
        ELSE 0
      END AS contribution_margin_pct,
      CASE
        WHEN s.rld > 0 THEN s.operating_result / s.rld
        ELSE 0
      END AS operating_margin_pct,
      CASE
        WHEN COALESCE(s.active_month_count, 0) > 0 THEN s.fixed_expenses / s.active_month_count
        ELSE 0
      END AS average_monthly_fixed_expenses
    FROM summary_row s
  ),
  expense_breakdown AS (
    SELECT
      fe.category_id,
      fe.category_name,
      JSONB_OBJECT_AGG(fe.yearmonth, fe.amount ORDER BY fe.yearmonth) AS values_by_month,
      SUM(fe.amount) AS total
    FROM filtered_expenses fe
    GROUP BY fe.category_id, fe.category_name
  ),
  best_month AS (
    SELECT
      jsonb_build_object(
        'monthKey', rm.yearmonth,
        'label', rm.yearmonth,
        'contributionAfterMedia', rm.contribution_after_media,
        'netResult', rm.operating_result,
        'rld', rm.net_revenue,
        'fixedExpensesTotal', rm.fixed_expenses,
        'contributionMargin', rm.contribution_margin_pct,
        'operatingMargin', rm.operating_margin_pct
      ) AS payload
    FROM ranked_months rm
    ORDER BY rm.contribution_after_media DESC, rm.yearmonth DESC
    LIMIT 1
  ),
  worst_month AS (
    SELECT
      jsonb_build_object(
        'monthKey', rm.yearmonth,
        'label', rm.yearmonth,
        'contributionAfterMedia', rm.contribution_after_media,
        'netResult', rm.operating_result,
        'rld', rm.net_revenue,
        'fixedExpensesTotal', rm.fixed_expenses,
        'contributionMargin', rm.contribution_margin_pct,
        'operatingMargin', rm.operating_margin_pct
      ) AS payload
    FROM ranked_months rm
    ORDER BY rm.contribution_after_media ASC, rm.yearmonth DESC
    LIMIT 1
  ),
  latest_month AS (
    SELECT
      jsonb_build_object(
        'monthKey', rm.yearmonth,
        'label', rm.yearmonth,
        'contributionAfterMedia', rm.contribution_after_media,
        'netResult', rm.operating_result,
        'rld', rm.net_revenue,
        'fixedExpensesTotal', rm.fixed_expenses,
        'contributionMargin', rm.contribution_margin_pct,
        'operatingMargin', rm.operating_margin_pct
      ) AS payload
    FROM ranked_months rm
    ORDER BY rm.yearmonth DESC
    LIMIT 1
  ),
  top_expense AS (
    SELECT
      jsonb_build_object(
        'categoryId', eb.category_id,
        'categoryName', eb.category_name,
        'total', eb.total
      ) AS payload
    FROM expense_breakdown eb
    ORDER BY eb.total DESC, eb.category_name
    LIMIT 1
  ),
  momentum_stats AS (
    SELECT
      AVG(CASE WHEN recency_rank <= 3 THEN contribution_after_media END) AS current_average,
      COUNT(*) FILTER (WHERE recency_rank <= 3) AS current_count,
      AVG(CASE WHEN recency_rank BETWEEN 4 AND 6 THEN contribution_after_media END) AS previous_average,
      COUNT(*) FILTER (WHERE recency_rank BETWEEN 4 AND 6) AS previous_count
    FROM ranked_months
  ),
  analysis_payload AS (
    SELECT jsonb_build_object(
      'bestContributionMonth', (SELECT payload FROM best_month),
      'worstContributionMonth', (SELECT payload FROM worst_month),
      'latestMonth', (SELECT payload FROM latest_month),
      'topExpenseCategory', (SELECT payload FROM top_expense),
      'shares', jsonb_build_object(
        'cmvShare', CASE WHEN sm.rld > 0 THEN sm.cmv_total / sm.rld ELSE 0 END,
        'mediaShare', CASE WHEN sm.rld > 0 THEN sm.media_spend / sm.rld ELSE 0 END,
        'expenseShare', CASE WHEN sm.rld > 0 THEN sm.fixed_expenses / sm.rld ELSE 0 END,
        'variableCostShare', CASE WHEN sm.rld > 0 THEN (sm.cmv_total + sm.media_spend) / sm.rld ELSE 0 END
      ),
      'momentum', jsonb_build_object(
        'tone',
          CASE
            WHEN ms.current_count = 0 THEN 'neutral'
            WHEN ms.previous_count = 0 THEN 'neutral'
            WHEN COALESCE(ms.current_average, 0) - COALESCE(ms.previous_average, 0) > 0 THEN 'positive'
            WHEN COALESCE(ms.current_average, 0) - COALESCE(ms.previous_average, 0) < 0 THEN 'warning'
            ELSE 'neutral'
          END,
        'title',
          CASE
            WHEN ms.current_count = 0 THEN 'Série insuficiente'
            WHEN ms.previous_count = 0 THEN 'Janela inicial em formação'
            WHEN COALESCE(ms.current_average, 0) - COALESCE(ms.previous_average, 0) > 0 THEN 'Margem em expansão'
            WHEN COALESCE(ms.current_average, 0) - COALESCE(ms.previous_average, 0) < 0 THEN 'Margem pressionada'
            ELSE 'Margem estável'
          END,
        'description',
          CASE
            WHEN ms.current_count = 0 THEN 'Ainda não há meses suficientes para comparar a tendência da margem.'
            WHEN ms.previous_count = 0 THEN 'Ainda não há histórico suficiente para comparar a tendência da margem entre duas janelas equivalentes.'
            WHEN COALESCE(ms.current_average, 0) - COALESCE(ms.previous_average, 0) > 0 THEN 'Os últimos meses mostram ganho de contribuição antes das despesas. Vale revisar o que sustentou essa evolução para repetir o padrão.'
            WHEN COALESCE(ms.current_average, 0) - COALESCE(ms.previous_average, 0) < 0 THEN 'A contribuição caiu na janela mais recente. O foco deve ir para mix de produto, gasto de mídia e despesas fixas que comprimiram o resultado.'
            ELSE 'A margem ficou próxima do mesmo patamar recente. O ganho agora depende de melhorar eficiência ou elevar a receita líquida disponível.'
          END,
        'delta', COALESCE(ms.current_average, 0) - COALESCE(ms.previous_average, 0),
        'currentAverage', COALESCE(ms.current_average, 0),
        'previousAverage', COALESCE(ms.previous_average, 0),
        'hasComparison', CASE WHEN ms.previous_count > 0 THEN TRUE ELSE FALSE END
      )
    ) AS payload
    FROM summary_metrics sm
    CROSS JOIN momentum_stats ms
  ),
  summary_payload AS (
    SELECT JSONB_BUILD_OBJECT(
      'grossRevenue', sm.gross_revenue,
      'rob', sm.gross_revenue,
      'netRevenue', sm.rld,
      'rld', sm.rld,
      'netAfterFees', sm.rld,
      'discounts', sm.discounts,
      'orderCount', sm.order_count,
      'paidOrderCount', sm.order_count,
      'unitsSold', sm.units_sold,
      'averageTicket', CASE WHEN sm.order_count > 0 THEN sm.gross_revenue / sm.order_count ELSE 0 END,
      'mediaSpend', sm.media_spend,
      'grossRoas', CASE WHEN sm.media_spend > 0 THEN sm.gross_revenue / sm.media_spend ELSE 0 END,
      'grossMargin', sm.gross_margin,
      'contributionAfterMedia', sm.contribution_after_media,
      'contributionMargin', sm.contribution_margin_pct,
      'commissionTotal', sm.commission_total,
      'cmvTotal', sm.cmv_total,
      'fixedExpensesTotal', sm.fixed_expenses,
      'operatingExpensesTotal', sm.fixed_expenses,
      'operatingResult', sm.operating_result,
      'netResult', sm.operating_result,
      'operatingMargin', sm.operating_margin_pct,
      'itemsPerOrder', CASE WHEN sm.order_count > 0 THEN sm.units_sold / sm.order_count ELSE 0 END,
      'revenuePerUnit', CASE WHEN sm.units_sold > 0 THEN sm.gross_revenue / sm.units_sold ELSE 0 END,
      'avgMarkup', CASE WHEN sm.cmv_total > 0 THEN sm.rld / sm.cmv_total ELSE 0 END,
      'activeMonthCount', sm.active_month_count,
      'averageMonthlyFixedExpenses', sm.average_monthly_fixed_expenses,
      'breakEvenPoint',
        CASE
          WHEN sm.average_monthly_fixed_expenses > 0
            AND sm.rld > 0
            AND sm.contribution_margin_pct >= 0.03
          THEN sm.average_monthly_fixed_expenses / sm.contribution_margin_pct
          ELSE 0
        END,
      'breakEvenDisplay',
        CASE
          WHEN sm.average_monthly_fixed_expenses <= 0 THEN NULL
          WHEN sm.active_month_count <= 0 THEN NULL
          WHEN sm.rld <= 0 THEN NULL
          WHEN sm.contribution_margin_pct <= 0 THEN NULL
          WHEN sm.contribution_margin_pct < 0.03 THEN NULL
          ELSE sm.average_monthly_fixed_expenses / sm.contribution_margin_pct
        END,
      'breakEvenReliable',
        CASE
          WHEN sm.average_monthly_fixed_expenses > 0
            AND sm.active_month_count > 0
            AND sm.rld > 0
            AND sm.contribution_margin_pct >= 0.03
          THEN TRUE
          ELSE FALSE
        END,
      'breakEvenReason',
        CASE
          WHEN sm.average_monthly_fixed_expenses <= 0 THEN 'Sem média mensal de despesas fixas suficiente para estimar o ponto de equilíbrio.'
          WHEN sm.active_month_count <= 0 THEN 'Sem meses ativos suficientes para estimar o ponto de equilíbrio.'
          WHEN sm.rld <= 0 THEN 'Não calculável com a margem de contribuição atual.'
          WHEN sm.contribution_margin_pct <= 0 THEN 'Não calculável com a margem de contribuição atual.'
          WHEN sm.contribution_margin_pct < 0.03 THEN 'Margem muito comprimida no recorte atual. A meta mensal de RLD fica instável e não é exibida.'
          ELSE 'Meta mensal de RLD necessária para cobrir a média de despesas fixas com a margem atual.'
        END,
      'couponDiscounts', c.coupon_discounts,
      'inkProfit', sm.commission_total,
      'averageInkProfit',
        CASE
          WHEN sm.units_sold > 0 THEN sm.commission_total / sm.units_sold
          WHEN sm.order_count > 0 THEN sm.commission_total / sm.order_count
          ELSE 0
        END,
      'hasItemDetailCoverage', CASE WHEN sm.qty_real > 0 THEN TRUE ELSE FALSE END
    ) AS payload
    FROM summary_metrics sm
    CROSS JOIN filtered_orders c
  )
  SELECT JSONB_BUILD_OBJECT(
    'summary',
    COALESCE((SELECT payload FROM summary_payload), '{}'::JSONB),
    'total',
    COALESCE((SELECT payload FROM summary_payload), '{}'::JSONB),
    'months',
    COALESCE(
      (
        SELECT JSONB_AGG(month_payload ORDER BY yearmonth)
        FROM (
          SELECT
            mr.yearmonth,
            JSONB_BUILD_OBJECT(
              'monthKey', mr.yearmonth,
              'label', mr.yearmonth,
              'metrics', JSONB_BUILD_OBJECT(
                'grossRevenue', mr.gross_revenue,
                'rob', mr.gross_revenue,
                'netRevenue', mr.net_revenue,
                'rld', mr.net_revenue,
                'netAfterFees', mr.net_revenue,
                'discounts', mr.discount_value,
                'orderCount', mr.order_count,
                'paidOrderCount', mr.order_count,
                'unitsSold', mr.units_sold,
                'averageTicket', CASE WHEN mr.order_count > 0 THEN mr.gross_revenue / mr.order_count ELSE 0 END,
                'mediaSpend', mr.adcost,
                'grossRoas', CASE WHEN mr.adcost > 0 THEN mr.gross_revenue / mr.adcost ELSE 0 END,
                'grossMargin', mr.gross_margin,
                'contributionAfterMedia', mr.contribution_after_media,
                'contributionMargin', CASE WHEN mr.net_revenue > 0 THEN mr.contribution_after_media / mr.net_revenue ELSE 0 END,
                'commissionTotal', mr.commission_total,
                'cmvTotal', mr.cmv_total,
                'fixedExpensesTotal', mr.fixed_expenses,
                'operatingExpensesTotal', mr.fixed_expenses,
                'operatingResult', mr.operating_result,
                'netResult', mr.operating_result,
                'operatingMargin', CASE WHEN mr.net_revenue > 0 THEN mr.operating_result / mr.net_revenue ELSE 0 END,
                'itemsPerOrder', CASE WHEN mr.order_count > 0 THEN mr.units_sold / mr.order_count ELSE 0 END,
                'revenuePerUnit', CASE WHEN mr.units_sold > 0 THEN mr.gross_revenue / mr.units_sold ELSE 0 END,
                'avgMarkup', CASE WHEN mr.cmv_total > 0 THEN mr.net_revenue / mr.cmv_total ELSE 0 END,
                'breakEvenPoint',
                  CASE
                    WHEN mr.fixed_expenses > 0
                      AND mr.net_revenue > 0
                      AND (mr.contribution_after_media / mr.net_revenue) >= 0.03
                    THEN mr.fixed_expenses / (mr.contribution_after_media / mr.net_revenue)
                    ELSE 0
                  END,
                'couponDiscounts', 0,
                'inkProfit', mr.commission_total,
                'averageInkProfit',
                  CASE
                    WHEN mr.units_sold > 0 THEN mr.commission_total / mr.units_sold
                    WHEN mr.order_count > 0 THEN mr.commission_total / mr.order_count
                    ELSE 0
                  END,
                'hasItemDetailCoverage', CASE WHEN mr.qty_real > 0 THEN TRUE ELSE FALSE END
              )
            ) AS month_payload
          FROM monthly_rows mr
        ) payload
      ),
      '[]'::JSONB
    ),
    'expenseBreakdown',
    COALESCE(
      (
        SELECT JSONB_AGG(expense_payload ORDER BY total DESC, category_name)
        FROM (
          SELECT
            eb.total,
            eb.category_name,
            JSONB_BUILD_OBJECT(
              'categoryId', eb.category_id,
              'categoryName', eb.category_name,
              'valuesByMonth', eb.values_by_month,
              'total', eb.total
            ) AS expense_payload
          FROM expense_breakdown eb
        ) expense_items
      ),
      '[]'::JSONB
    ),
    'analysis',
    COALESCE((SELECT payload FROM analysis_payload), '{}'::JSONB)
  )
  INTO result;

  RETURN COALESCE(
    result,
    JSONB_BUILD_OBJECT(
      'summary',
      JSONB_BUILD_OBJECT(
        'grossRevenue', 0,
        'rob', 0,
        'netRevenue', 0,
        'rld', 0,
        'netAfterFees', 0,
        'discounts', 0,
        'orderCount', 0,
        'paidOrderCount', 0,
        'unitsSold', 0,
        'averageTicket', 0,
        'mediaSpend', 0,
        'grossRoas', 0,
        'grossMargin', 0,
        'contributionAfterMedia', 0,
        'contributionMargin', 0,
        'commissionTotal', 0,
        'cmvTotal', 0,
        'fixedExpensesTotal', 0,
        'operatingExpensesTotal', 0,
        'operatingResult', 0,
        'netResult', 0,
        'operatingMargin', 0,
        'itemsPerOrder', 0,
        'revenuePerUnit', 0,
        'avgMarkup', 0,
        'activeMonthCount', 0,
        'averageMonthlyFixedExpenses', 0,
        'breakEvenPoint', 0,
        'breakEvenDisplay', NULL,
        'breakEvenReliable', FALSE,
        'breakEvenReason', 'Sem dados suficientes para calcular a meta mensal de RLD.',
        'couponDiscounts', 0,
        'inkProfit', 0,
        'averageInkProfit', 0,
        'hasItemDetailCoverage', FALSE
      ),
      'total',
      JSONB_BUILD_OBJECT(
        'grossRevenue', 0,
        'rob', 0,
        'netRevenue', 0,
        'rld', 0,
        'netAfterFees', 0,
        'discounts', 0,
        'orderCount', 0,
        'paidOrderCount', 0,
        'unitsSold', 0,
        'averageTicket', 0,
        'mediaSpend', 0,
        'grossRoas', 0,
        'grossMargin', 0,
        'contributionAfterMedia', 0,
        'contributionMargin', 0,
        'commissionTotal', 0,
        'cmvTotal', 0,
        'fixedExpensesTotal', 0,
        'operatingExpensesTotal', 0,
        'operatingResult', 0,
        'netResult', 0,
        'operatingMargin', 0,
        'itemsPerOrder', 0,
        'revenuePerUnit', 0,
        'avgMarkup', 0,
        'activeMonthCount', 0,
        'averageMonthlyFixedExpenses', 0,
        'breakEvenPoint', 0,
        'breakEvenDisplay', NULL,
        'breakEvenReliable', FALSE,
        'breakEvenReason', 'Sem dados suficientes para calcular a meta mensal de RLD.',
        'couponDiscounts', 0,
        'inkProfit', 0,
        'averageInkProfit', 0,
        'hasItemDetailCoverage', FALSE
      ),
      'months', '[]'::JSONB,
      'expenseBreakdown', '[]'::JSONB,
      'analysis', JSONB_BUILD_OBJECT(
        'bestContributionMonth', NULL,
        'worstContributionMonth', NULL,
        'latestMonth', NULL,
        'topExpenseCategory', NULL,
        'shares', JSONB_BUILD_OBJECT(
          'cmvShare', 0,
          'mediaShare', 0,
          'expenseShare', 0,
          'variableCostShare', 0
        ),
        'momentum', JSONB_BUILD_OBJECT(
          'tone', 'neutral',
          'title', 'Série insuficiente',
          'description', 'Ainda não há meses suficientes para comparar a tendência da margem.',
          'delta', 0,
          'currentAverage', 0,
          'previousAverage', 0,
          'hasComparison', FALSE
        )
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_report(UUID, DATE, DATE) TO authenticated;

COMMIT;
