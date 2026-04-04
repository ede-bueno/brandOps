BEGIN;

DROP FUNCTION IF EXISTS public.get_financial_report(uuid, date, date);

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

  WITH filtered_daily AS (
    SELECT *
    FROM public.v_daily_metrics dm
    WHERE dm.brand_id = p_brand_id
      AND (p_from IS NULL OR dm.sale_day >= p_from)
      AND (p_to   IS NULL OR dm.sale_day <= p_to)
  ),
  filtered_orders AS (
    SELECT
      COALESCE(SUM(CASE WHEN COALESCE(o.coupon_name, '') <> '' THEN COALESCE(o.discount, 0) ELSE 0 END), 0) AS coupon_discounts
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
    WHERE be.brand_id = p_brand_id
      AND (p_from IS NULL OR DATE(be.incurred_on) >= p_from)
      AND (p_to   IS NULL OR DATE(be.incurred_on) <= p_to)
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
      COALESCE(SUM(order_count), 0) AS order_count
    FROM monthly_rows
  ),
  summary_payload AS (
    SELECT JSONB_BUILD_OBJECT(
      'grossRevenue', s.gross_revenue,
      'rob', s.gross_revenue,
      'netRevenue', s.rld,
      'rld', s.rld,
      'netAfterFees', s.rld,
      'discounts', s.discounts,
      'orderCount', s.order_count,
      'paidOrderCount', s.order_count,
      'unitsSold', s.units_sold,
      'averageTicket', CASE WHEN s.order_count > 0 THEN s.gross_revenue / s.order_count ELSE 0 END,
      'mediaSpend', s.media_spend,
      'grossRoas', CASE WHEN s.media_spend > 0 THEN s.gross_revenue / s.media_spend ELSE 0 END,
      'grossMargin', s.gross_margin,
      'contributionAfterMedia', s.contribution_after_media,
      'contributionMargin', CASE WHEN s.rld > 0 THEN s.contribution_after_media / s.rld ELSE 0 END,
      'commissionTotal', s.commission_total,
      'cmvTotal', s.cmv_total,
      'fixedExpensesTotal', s.fixed_expenses,
      'operatingExpensesTotal', s.fixed_expenses,
      'operatingResult', s.operating_result,
      'netResult', s.operating_result,
      'operatingMargin', CASE WHEN s.rld > 0 THEN s.operating_result / s.rld ELSE 0 END,
      'itemsPerOrder', CASE WHEN s.order_count > 0 THEN s.units_sold / s.order_count ELSE 0 END,
      'revenuePerUnit', CASE WHEN s.units_sold > 0 THEN s.gross_revenue / s.units_sold ELSE 0 END,
      'avgMarkup', CASE WHEN s.cmv_total > 0 THEN s.rld / s.cmv_total ELSE 0 END,
      'breakEvenPoint',
        CASE
          WHEN s.fixed_expenses > 0
            AND s.rld > 0
            AND (s.contribution_after_media / s.rld) >= 0.03
          THEN s.fixed_expenses / (s.contribution_after_media / s.rld)
          ELSE 0
        END,
      'breakEvenDisplay',
        CASE
          WHEN s.fixed_expenses <= 0 THEN NULL
          WHEN s.rld <= 0 THEN NULL
          WHEN (s.contribution_after_media / NULLIF(s.rld, 0)) <= 0 THEN NULL
          WHEN (s.contribution_after_media / NULLIF(s.rld, 0)) < 0.03 THEN NULL
          ELSE s.fixed_expenses / (s.contribution_after_media / s.rld)
        END,
      'breakEvenReliable',
        CASE
          WHEN s.fixed_expenses > 0
            AND s.rld > 0
            AND (s.contribution_after_media / s.rld) >= 0.03
          THEN TRUE
          ELSE FALSE
        END,
      'breakEvenReason',
        CASE
          WHEN s.fixed_expenses <= 0 THEN 'Sem despesas operacionais lançadas no período.'
          WHEN s.rld <= 0 THEN 'Não calculável com a margem de contribuição atual.'
          WHEN (s.contribution_after_media / NULLIF(s.rld, 0)) <= 0 THEN 'Não calculável com a margem de contribuição atual.'
          WHEN (s.contribution_after_media / NULLIF(s.rld, 0)) < 0.03 THEN 'Margem muito comprimida no recorte atual. O ponto de equilíbrio fica instável e não é exibido.'
          ELSE 'Valor de RLD necessário para cobrir as despesas fixas com a margem atual.'
        END,
      'couponDiscounts', c.coupon_discounts,
      'inkProfit', s.commission_total,
      'averageInkProfit',
        CASE
          WHEN s.units_sold > 0 THEN s.commission_total / s.units_sold
          WHEN s.order_count > 0 THEN s.commission_total / s.order_count
          ELSE 0
        END,
      'hasItemDetailCoverage', CASE WHEN s.qty_real > 0 THEN TRUE ELSE FALSE END
    ) AS payload
    FROM summary_row s
    CROSS JOIN filtered_orders c
  ),
  expense_breakdown AS (
    SELECT
      fe.category_id,
      fe.category_name,
      JSONB_OBJECT_AGG(fe.yearmonth, fe.amount ORDER BY fe.yearmonth) AS values_by_month,
      SUM(fe.amount) AS total
    FROM filtered_expenses fe
    GROUP BY fe.category_id, fe.category_name
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
    )
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
        'breakEvenPoint', 0,
        'breakEvenDisplay', NULL,
        'breakEvenReliable', FALSE,
        'breakEvenReason', 'Sem dados suficientes para calcular o ponto de equilíbrio.',
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
        'breakEvenPoint', 0,
        'breakEvenDisplay', NULL,
        'breakEvenReliable', FALSE,
        'breakEvenReason', 'Sem dados suficientes para calcular o ponto de equilíbrio.',
        'couponDiscounts', 0,
        'inkProfit', 0,
        'averageInkProfit', 0,
        'hasItemDetailCoverage', FALSE
      ),
      'months', '[]'::JSONB,
      'expenseBreakdown', '[]'::JSONB
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_report(UUID, DATE, DATE) TO authenticated;

COMMIT;
