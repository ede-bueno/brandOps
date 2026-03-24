BEGIN;

-- Mantém marcas e regras estruturais, mas limpa a base operacional
-- para reimportação controlada dos CSVs.

DELETE FROM public.import_logs;
DELETE FROM public.media_performance;
DELETE FROM public.sales_lines;
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.products;
DELETE FROM public.brand_expenses;
DELETE FROM public.cmv_checkpoints;

-- Mantém categorias globais do sistema e remove categorias específicas de marcas
DELETE FROM public.expense_categories
WHERE brand_id IS NOT NULL;

-- Mantém apenas vínculos de marcas de usuários superadmin
DELETE FROM public.brand_members
WHERE user_id IN (
  SELECT id
  FROM public.user_profiles
  WHERE role <> 'SUPER_ADMIN'
);

-- Remove perfis não administrativos da camada pública
DELETE FROM public.user_profiles
WHERE role <> 'SUPER_ADMIN';

COMMIT;
