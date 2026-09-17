-- =====================================================
-- Migration: Add RescueDeals Table & Policies
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rescuedeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "menu_item_id" TEXT,
    "item_name" TEXT NOT NULL,
    "item_image" TEXT,
    "original_price" NUMERIC NOT NULL,
    "deal_price" NUMERIC NOT NULL,
    "initial_qty" BIGINT DEFAULT 1,
    "remaining_qty" BIGINT DEFAULT 1,
    "pickup_deadline" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active',
    "eco_xp" BIGINT DEFAULT 100
);

ALTER TABLE public.rescuedeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.rescuedeals;
CREATE POLICY "Allow authenticated read" ON public.rescuedeals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.rescuedeals;
CREATE POLICY "Allow public read" ON public.rescuedeals FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.rescuedeals;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.rescuedeals FOR ALL TO authenticated USING (true);
