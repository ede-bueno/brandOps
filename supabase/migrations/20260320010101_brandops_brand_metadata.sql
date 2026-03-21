ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS website_url TEXT;
