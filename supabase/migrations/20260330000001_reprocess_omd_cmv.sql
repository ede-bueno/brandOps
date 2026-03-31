-- ============================================================
-- REPROCESSAMENTO DE CMV — Oh My Dog
-- Objetivo: Aplicar CMV histórico para registros anteriores a 2026-03-01
-- ============================================================

DO $$
DECLARE
  v_brand_id UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE NOTICE 'Migração executada sem sessão autenticada. Reprocessamento de CMV da OMD foi pulado nesta etapa.';
    RETURN;
  END IF;

  -- 1. Localizar o ID da marca Oh My Dog
  SELECT id INTO v_brand_id
  FROM public.brands
  WHERE lower(name) = 'oh my dog'
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE NOTICE 'Marca "Oh My Dog" não encontrada. Pulando reprocessamento.';
    RETURN;
  END IF;

  -- 2. Executar o checkpoint de CMV para aplicar as regras de cmv_history
  -- Isso irá preencher cmv_unit_applied e cmv_total_applied baseando-se na data do pedido
  -- e no product_type detectado ou SKU.
  SELECT public.apply_cmv_checkpoint(
    v_brand_id, 
    'Reprocessamento histórico automático (Antigravity - Correção OMD < 2026-03-01)',
    NULL::timestamp with time zone
  ) INTO v_result;

  RAISE NOTICE 'Reprocessamento concluído para OMD: %', v_result;
END;
$$;
