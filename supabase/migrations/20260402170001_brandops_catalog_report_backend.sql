BEGIN;

CREATE INDEX IF NOT EXISTS idx_order_items_brand_date_sku_active
  ON public.order_items (brand_id, order_date, sku)
  WHERE COALESCE(is_ignored, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_products_brand_sku
  ON public.products (brand_id, sku);

CREATE INDEX IF NOT EXISTS idx_brand_integrations_brand_provider
  ON public.brand_integrations (brand_id, provider);

DROP FUNCTION IF EXISTS public.get_catalog_report(uuid, date, date, text, text, text, text);

CREATE OR REPLACE FUNCTION public.get_catalog_report(
  p_brand_id UUID,
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'all',
  p_product_type TEXT DEFAULT 'all',
  p_collection TEXT DEFAULT 'all'
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
      COALESCE(MAX(NULLIF(settings->>'catalogId', '')), '') AS catalog_id
    FROM public.brand_integrations
    WHERE brand_id = p_brand_id
      AND provider = 'meta'
  ),
  sales_by_sku AS (
    SELECT
      COALESCE(NULLIF(TRIM(oi.sku), ''), '__sem_sku__') AS sku,
      SUM(COALESCE(oi.quantity, 0)) AS units_sold
    FROM public.order_items oi
    WHERE oi.brand_id = p_brand_id
      AND COALESCE(oi.is_ignored, FALSE) = FALSE
      AND (p_from IS NULL OR DATE(oi.order_date) >= p_from)
      AND (p_to   IS NULL OR DATE(oi.order_date) <= p_to)
    GROUP BY COALESCE(NULLIF(TRIM(oi.sku), ''), '__sem_sku__')
  ),
  catalog_base AS (
    SELECT
      p.sku,
      p.title,
      p.image_url,
      p.product_url,
      COALESCE(p.price, 0) AS price,
      p.sale_price,
      p.attributes,
      COALESCE(s.units_sold, 0) AS units_sold,
      COALESCE(
        CASE
          WHEN jsonb_typeof(p.attributes->'additionalImageUrls') = 'array'
            THEN jsonb_array_length(p.attributes->'additionalImageUrls')
          ELSE 0
        END,
        0
      ) + CASE WHEN p.image_url IS NOT NULL AND TRIM(p.image_url) <> '' THEN 1 ELSE 0 END AS gallery_count,
      COALESCE(NULLIF(TRIM(p.attributes->>'productType'), ''), 'Sem tipo') AS product_type,
      COALESCE(p.attributes->'collections', '[]'::jsonb) AS collections_json,
      COALESCE(p.attributes->'keywords', '[]'::jsonb) AS keywords_json,
      COALESCE(
        (p.attributes->'sourcePresence'->>'manualFeed')::boolean,
        COALESCE(p.attributes->>'catalogSource', 'manual_feed') <> 'meta_catalog'
      ) AS source_manual_feed,
      COALESCE(
        (p.attributes->'sourcePresence'->>'metaCatalog')::boolean,
        COALESCE(p.attributes->>'catalogSource', 'manual_feed') = 'meta_catalog'
      ) AS source_meta_catalog,
      COALESCE(p.attributes->>'catalogSource', 'manual_feed') AS data_source
    FROM public.products p
    LEFT JOIN sales_by_sku s
      ON s.sku = COALESCE(NULLIF(TRIM(p.sku), ''), '__sem_sku__')
    WHERE p.brand_id = p_brand_id
  ),
  filtered_rows AS (
    SELECT *
    FROM catalog_base cb
    WHERE (
      p_status = 'all'
      OR (p_status = 'sold' AND cb.units_sold > 0)
      OR (p_status = 'unsold' AND cb.units_sold <= 0)
    )
      AND (
        p_product_type IS NULL
        OR p_product_type = ''
        OR p_product_type = 'all'
        OR cb.product_type = p_product_type
      )
      AND (
        p_collection IS NULL
        OR p_collection = ''
        OR p_collection = 'all'
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(cb.collections_json) AS collection_item(value)
          WHERE collection_item.value = p_collection
        )
      )
      AND (
        p_search IS NULL
        OR TRIM(p_search) = ''
        OR LOWER(
          CONCAT_WS(
            ' ',
            cb.title,
            cb.product_type,
            COALESCE(
              (
                SELECT string_agg(value, ' ')
                FROM jsonb_array_elements_text(cb.collections_json) AS collection_item(value)
              ),
              ''
            ),
            COALESCE(
              (
                SELECT string_agg(value, ' ')
                FROM jsonb_array_elements_text(cb.keywords_json) AS keyword_item(value)
              ),
              ''
            )
          )
        ) LIKE '%' || LOWER(TRIM(p_search)) || '%'
      )
  ),
  source_mode AS (
    SELECT
      CASE
        WHEN EXISTS (SELECT 1 FROM catalog_base WHERE source_manual_feed)
         AND EXISTS (SELECT 1 FROM catalog_base WHERE source_meta_catalog) THEN 'mixed'
        WHEN EXISTS (SELECT 1 FROM catalog_base WHERE source_meta_catalog) THEN 'meta_catalog'
        WHEN EXISTS (SELECT 1 FROM meta_config WHERE catalog_id <> '') THEN 'mixed'
        ELSE 'manual_feed'
      END AS mode
  ),
  top_sellers AS (
    SELECT *
    FROM filtered_rows
    WHERE units_sold > 0
    ORDER BY units_sold DESC, price DESC, title
    LIMIT 6
  ),
  uncovered AS (
    SELECT *
    FROM filtered_rows
    WHERE gallery_count <= 1 OR units_sold <= 0
    ORDER BY units_sold ASC, gallery_count ASC, title
    LIMIT 6
  ),
  playbook_scale AS (
    SELECT *
    FROM filtered_rows
    WHERE units_sold > 0 AND gallery_count >= 2
    ORDER BY units_sold DESC, gallery_count DESC, title
    LIMIT 6
  ),
  playbook_review AS (
    SELECT *
    FROM filtered_rows
    WHERE units_sold <= 0 OR gallery_count <= 1
    ORDER BY units_sold ASC, gallery_count ASC, title
    LIMIT 6
  ),
  playbook_monitor AS (
    SELECT *
    FROM filtered_rows
    WHERE NOT (units_sold > 0 AND gallery_count >= 2)
      AND NOT (units_sold <= 0 OR gallery_count <= 1)
    ORDER BY units_sold DESC, title
    LIMIT 6
  ),
  playbook_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE units_sold > 0 AND gallery_count >= 2) AS scale_count,
      COUNT(*) FILTER (WHERE units_sold <= 0 OR gallery_count <= 1) AS review_count,
      COUNT(*) FILTER (
        WHERE NOT (units_sold > 0 AND gallery_count >= 2)
          AND NOT (units_sold <= 0 OR gallery_count <= 1)
      ) AS monitor_count
    FROM filtered_rows
  ),
  analysis AS (
    SELECT
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM filtered_rows) THEN 'Catálogo sem base no recorte'
        WHEN (SELECT scale_count FROM playbook_counts) > (SELECT review_count FROM playbook_counts)
          THEN 'Catálogo com base para acelerar vencedores'
        ELSE 'Catálogo ainda concentrado em gargalos de cobertura'
      END AS narrative_title,
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM filtered_rows) THEN 'Ainda não há produtos suficientes neste recorte para formar uma leitura operacional do catálogo.'
        WHEN (SELECT scale_count FROM playbook_counts) > (SELECT review_count FROM playbook_counts)
          THEN 'O recorte mostra um núcleo de produtos já validados, com venda e cobertura visual suficiente para ganhar mais exposição sem depender apenas de descoberta orgânica.'
        ELSE 'A principal oportunidade está em corrigir produtos sem venda ou com pouca galeria antes de ampliar a distribuição do catálogo como um todo.'
      END AS narrative_body,
      (SELECT title FROM top_sellers LIMIT 1) AS top_opportunity,
      (SELECT title FROM uncovered LIMIT 1) AS top_risk
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalProducts', COALESCE((SELECT COUNT(*) FROM filtered_rows), 0),
      'soldProducts', COALESCE((SELECT COUNT(*) FROM filtered_rows WHERE units_sold > 0), 0),
      'totalUnitsSold', COALESCE((SELECT SUM(units_sold) FROM filtered_rows), 0),
      'productsWithGallery', COALESCE((SELECT COUNT(*) FROM filtered_rows WHERE gallery_count > 0), 0),
      'metaCatalogProducts', COALESCE((SELECT COUNT(*) FROM filtered_rows WHERE source_meta_catalog), 0),
      'manualFeedProducts', COALESCE((SELECT COUNT(*) FROM filtered_rows WHERE source_manual_feed), 0)
    ),
    'rows', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', sku,
          'title', title,
          'description', attributes->>'description',
          'imageUrl', image_url,
          'additionalImageUrls', COALESCE(attributes->'additionalImageUrls', '[]'::jsonb),
          'link', product_url,
          'price', price,
          'salePrice', sale_price,
          'availability', attributes->>'availability',
          'condition', attributes->>'condition',
          'mpn', attributes->>'mpn',
          'googleProductCategory', attributes->>'googleProductCategory',
          'fbProductCategory', attributes->>'fbProductCategory',
          'brand', attributes->>'brand',
          'productType', NULLIF(product_type, 'Sem tipo'),
          'collections', collections_json,
          'keywords', keywords_json,
          'color', attributes->>'color',
          'gender', attributes->>'gender',
          'material', attributes->>'material',
          'ageGroup', attributes->>'ageGroup',
          'size', attributes->>'size',
          'dataSource', data_source,
          'externalCatalogId', attributes->>'externalCatalogId',
          'sourcePresence', jsonb_build_object(
            'manualFeed', source_manual_feed,
            'metaCatalog', source_meta_catalog
          ),
          'unitsSold', units_sold,
          'printName', title,
          'galleryCount', gallery_count
        )
        ORDER BY units_sold DESC, title
      )
      FROM filtered_rows
    ), '[]'::jsonb),
    'options', jsonb_build_object(
      'productTypes', COALESCE((
        SELECT jsonb_agg(product_type ORDER BY product_type)
        FROM (
          SELECT DISTINCT product_type
          FROM catalog_base
          WHERE product_type <> 'Sem tipo'
        ) t
      ), '[]'::jsonb),
      'collections', COALESCE((
        SELECT jsonb_agg(value ORDER BY value)
        FROM (
          SELECT DISTINCT collection_item.value
          FROM catalog_base cb,
          LATERAL jsonb_array_elements_text(cb.collections_json) AS collection_item(value)
          WHERE TRIM(collection_item.value) <> ''
        ) t
      ), '[]'::jsonb)
    ),
    'highlights', jsonb_build_object(
      'topSellers', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sku,
            'title', title,
            'imageUrl', image_url,
            'link', product_url,
            'price', price,
            'salePrice', sale_price,
            'productType', NULLIF(product_type, 'Sem tipo'),
            'dataSource', data_source,
            'unitsSold', units_sold,
            'printName', title,
            'galleryCount', gallery_count,
            'sourcePresence', jsonb_build_object(
              'manualFeed', source_manual_feed,
              'metaCatalog', source_meta_catalog
            )
          )
          ORDER BY units_sold DESC, title
        )
        FROM top_sellers
      ), '[]'::jsonb),
      'uncovered', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sku,
            'title', title,
            'imageUrl', image_url,
            'link', product_url,
            'price', price,
            'salePrice', sale_price,
            'productType', NULLIF(product_type, 'Sem tipo'),
            'dataSource', data_source,
            'unitsSold', units_sold,
            'printName', title,
            'galleryCount', gallery_count,
            'sourcePresence', jsonb_build_object(
              'manualFeed', source_manual_feed,
              'metaCatalog', source_meta_catalog
            )
          )
          ORDER BY units_sold ASC, gallery_count ASC, title
        )
        FROM uncovered
      ), '[]'::jsonb)
    ),
    'playbook', jsonb_build_object(
      'scale', jsonb_build_object(
        'title', 'Escalar exposição',
        'description', 'Produtos que já vendem e contam com galeria suficiente para ganhar mais tração.',
        'count', COALESCE((SELECT scale_count FROM playbook_counts), 0),
        'items', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', sku,
              'title', title,
              'imageUrl', image_url,
              'link', product_url,
              'price', price,
              'salePrice', sale_price,
              'productType', NULLIF(product_type, 'Sem tipo'),
              'dataSource', data_source,
              'unitsSold', units_sold,
              'printName', title,
              'galleryCount', gallery_count,
              'sourcePresence', jsonb_build_object(
                'manualFeed', source_manual_feed,
                'metaCatalog', source_meta_catalog
              )
            )
            ORDER BY units_sold DESC, gallery_count DESC, title
          )
          FROM playbook_scale
        ), '[]'::jsonb)
      ),
      'review', jsonb_build_object(
        'title', 'Revisar cobertura',
        'description', 'Produtos sem venda ou com pouca galeria, pedindo revisão visual ou de distribuição.',
        'count', COALESCE((SELECT review_count FROM playbook_counts), 0),
        'items', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', sku,
              'title', title,
              'imageUrl', image_url,
              'link', product_url,
              'price', price,
              'salePrice', sale_price,
              'productType', NULLIF(product_type, 'Sem tipo'),
              'dataSource', data_source,
              'unitsSold', units_sold,
              'printName', title,
              'galleryCount', gallery_count,
              'sourcePresence', jsonb_build_object(
                'manualFeed', source_manual_feed,
                'metaCatalog', source_meta_catalog
              )
            )
            ORDER BY units_sold ASC, gallery_count ASC, title
          )
          FROM playbook_review
        ), '[]'::jsonb)
      ),
      'monitor', jsonb_build_object(
        'title', 'Monitorar',
        'description', 'Produtos com sinais intermediários, ainda sem motivo forte para acelerar ou cortar.',
        'count', COALESCE((SELECT monitor_count FROM playbook_counts), 0),
        'items', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', sku,
              'title', title,
              'imageUrl', image_url,
              'link', product_url,
              'price', price,
              'salePrice', sale_price,
              'productType', NULLIF(product_type, 'Sem tipo'),
              'dataSource', data_source,
              'unitsSold', units_sold,
              'printName', title,
              'galleryCount', gallery_count,
              'sourcePresence', jsonb_build_object(
                'manualFeed', source_manual_feed,
                'metaCatalog', source_meta_catalog
              )
            )
            ORDER BY units_sold DESC, title
          )
          FROM playbook_monitor
        ), '[]'::jsonb)
      )
    ),
    'analysis', (
      SELECT jsonb_build_object(
        'narrativeTitle', narrative_title,
        'narrativeBody', narrative_body,
        'nextActions', to_jsonb(ARRAY_REMOVE(ARRAY[
          CASE WHEN EXISTS (SELECT 1 FROM top_sellers)
            THEN 'Usar ' || (SELECT title FROM top_sellers LIMIT 1) || ' como referência de vitrine e distribuição para produtos parecidos.'
            ELSE NULL
          END,
          CASE WHEN EXISTS (SELECT 1 FROM uncovered)
            THEN 'Revisar a galeria e a exposição de ' || (SELECT title FROM uncovered LIMIT 1) || ', que aparece como gargalo do recorte.'
            ELSE NULL
          END,
          CASE WHEN EXISTS (SELECT 1 FROM meta_config WHERE catalog_id <> '')
            THEN 'Aproveitar a integração Meta Catalog para ampliar a base visual sem depender só do feed manual.'
            ELSE NULL
          END
        ], NULL)),
        'topOpportunity', top_opportunity,
        'topRisk', top_risk
      )
      FROM analysis
    ),
    'filters', jsonb_build_object(
      'search', COALESCE(p_search, ''),
      'status', COALESCE(p_status, 'all'),
      'productType', COALESCE(NULLIF(p_product_type, ''), 'all'),
      'collection', COALESCE(NULLIF(p_collection, ''), 'all')
    ),
    'meta', jsonb_build_object(
      'generatedAt', now(),
      'from', p_from,
      'to', p_to,
      'sourceMode', (SELECT mode FROM source_mode),
      'sourceLabel', CASE (SELECT mode FROM source_mode)
        WHEN 'meta_catalog' THEN 'Meta Catalog'
        WHEN 'mixed' THEN 'Meta + feed manual'
        ELSE 'Feed manual'
      END,
      'metaCatalogReady', EXISTS (SELECT 1 FROM meta_config WHERE catalog_id <> ''),
      'hasData', EXISTS (SELECT 1 FROM filtered_rows)
    )
  ) INTO result;

  RETURN COALESCE(result, jsonb_build_object(
    'summary', jsonb_build_object(
      'totalProducts', 0,
      'soldProducts', 0,
      'totalUnitsSold', 0,
      'productsWithGallery', 0,
      'metaCatalogProducts', 0,
      'manualFeedProducts', 0
    ),
    'rows', '[]'::jsonb,
    'options', jsonb_build_object(
      'productTypes', '[]'::jsonb,
      'collections', '[]'::jsonb
    ),
    'highlights', jsonb_build_object(
      'topSellers', '[]'::jsonb,
      'uncovered', '[]'::jsonb
    ),
    'playbook', jsonb_build_object(
      'scale', jsonb_build_object('title', 'Escalar exposição', 'description', '', 'count', 0, 'items', '[]'::jsonb),
      'review', jsonb_build_object('title', 'Revisar cobertura', 'description', '', 'count', 0, 'items', '[]'::jsonb),
      'monitor', jsonb_build_object('title', 'Monitorar', 'description', '', 'count', 0, 'items', '[]'::jsonb)
    ),
    'analysis', jsonb_build_object(
      'narrativeTitle', 'Catálogo sem base no recorte',
      'narrativeBody', 'Ainda não há produtos suficientes neste recorte para formar uma leitura operacional do catálogo.',
      'nextActions', '[]'::jsonb,
      'topOpportunity', null,
      'topRisk', null
    ),
    'filters', jsonb_build_object(
      'search', '',
      'status', 'all',
      'productType', 'all',
      'collection', 'all'
    ),
    'meta', jsonb_build_object(
      'generatedAt', now(),
      'from', p_from,
      'to', p_to,
      'sourceMode', 'manual_feed',
      'sourceLabel', 'Feed manual',
      'metaCatalogReady', false,
      'hasData', false
    )
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_catalog_report(UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
