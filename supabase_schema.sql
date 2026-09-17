-- =====================================================
-- Migration generated automatically from Base44 Entities
-- Target: Supabase (PostgreSQL)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------
-- Table: rescuedeals (Rescue Deals / Food Waste Clearance)
-- -----------------------------------------------------
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
-- -----------------------------------------------------
-- Table: adslots (from AdSlot.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.adslots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "slot_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "price" NUMERIC NOT NULL,
    "duration_days" BIGINT DEFAULT 3,
    "active" BOOLEAN DEFAULT true
);

ALTER TABLE public.adslots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.adslots;
CREATE POLICY "Allow authenticated read" ON public.adslots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.adslots;
CREATE POLICY "Allow public read" ON public.adslots FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.adslots;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.adslots FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: badges (from Badge.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "condition" TEXT,
    "threshold" BIGINT DEFAULT 1
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.badges;
CREATE POLICY "Allow authenticated read" ON public.badges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.badges;
CREATE POLICY "Allow public read" ON public.badges FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.badges;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.badges FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: bannerads (from BannerAd.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bannerads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT,
    "merchant_name" TEXT,
    "title" TEXT NOT NULL,
    "image_url" TEXT,
    "quest_id" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "tier" TEXT NOT NULL,
    "price" NUMERIC,
    "status" TEXT DEFAULT 'pending',
    "position" TEXT DEFAULT 'top',
    "paid" BOOLEAN DEFAULT false,
    "reject_reason" TEXT
);

ALTER TABLE public.bannerads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.bannerads;
CREATE POLICY "Allow authenticated read" ON public.bannerads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.bannerads;
CREATE POLICY "Allow public read" ON public.bannerads FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.bannerads;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.bannerads FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: checkins (from CheckIn.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "user_id" TEXT,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "merchant_owner_id" TEXT,
    "quest_id" TEXT,
    "xp_earned" BIGINT DEFAULT 50,
    "lat" NUMERIC,
    "lng" NUMERIC
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.checkins;
CREATE POLICY "Allow authenticated read" ON public.checkins FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.checkins;
CREATE POLICY "Allow public read" ON public.checkins FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.checkins;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.checkins FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: coupons (from Coupon.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "user_id" TEXT,
    "merchant_id" TEXT,
    "merchant_name" TEXT,
    "quest_id" TEXT,
    "title" TEXT NOT NULL,
    "reward_type" TEXT,
    "reward_value" TEXT,
    "coupon_type" TEXT DEFAULT 'standard',
    "status" TEXT DEFAULT 'available',
    "qr_code" TEXT,
    "expiry_date" DATE,
    "expires_at" TEXT,
    "box_opened" BOOLEAN DEFAULT false,
    "redeemed_date" TEXT
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.coupons;
CREATE POLICY "Allow authenticated read" ON public.coupons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.coupons;
CREATE POLICY "Allow public read" ON public.coupons FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.coupons;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.coupons FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: foodiebuddys (from FoodieBuddy.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foodiebuddys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "user_id" TEXT,
    "pet_name" TEXT NOT NULL,
    "pet_type" TEXT DEFAULT 'fox',
    "hunger_level" BIGINT DEFAULT 80,
    "happiness" BIGINT DEFAULT 80,
    "level" BIGINT DEFAULT 1,
    "xp" BIGINT DEFAULT 0
);

ALTER TABLE public.foodiebuddys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.foodiebuddys;
CREATE POLICY "Allow authenticated read" ON public.foodiebuddys FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.foodiebuddys;
CREATE POLICY "Allow public read" ON public.foodiebuddys FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.foodiebuddys;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.foodiebuddys FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: gamificationconfigs (from GamificationConfig.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gamificationconfigs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "xp_multiplier" BIGINT DEFAULT 1,
    "double_xp_active" BOOLEAN DEFAULT false,
    "leaderboard_cycle" TEXT DEFAULT 'weekly',
    "last_reset_date" DATE
);

ALTER TABLE public.gamificationconfigs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.gamificationconfigs;
CREATE POLICY "Allow authenticated read" ON public.gamificationconfigs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.gamificationconfigs;
CREATE POLICY "Allow public read" ON public.gamificationconfigs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.gamificationconfigs;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.gamificationconfigs FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: globalgoals (from GlobalGoal.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.globalgoals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_count" BIGINT DEFAULT 100,
    "current_count" BIGINT DEFAULT 0,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" TEXT DEFAULT 'active',
    "mega_reward_title" TEXT NOT NULL,
    "mega_reward_type" TEXT NOT NULL,
    "mega_reward_value" TEXT NOT NULL,
    "completed_date" TEXT
);

ALTER TABLE public.globalgoals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.globalgoals;
CREATE POLICY "Allow authenticated read" ON public.globalgoals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.globalgoals;
CREATE POLICY "Allow public read" ON public.globalgoals FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.globalgoals;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.globalgoals FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: legalconsentlogs (from LegalConsentLog.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legalconsentlogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "user_id" TEXT,
    "user_name" TEXT,
    "merchant_id" TEXT,
    "merchant_name" TEXT,
    "document_type" TEXT NOT NULL,
    "version" TEXT DEFAULT 'v1.0',
    "accepted_at" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT
);

ALTER TABLE public.legalconsentlogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.legalconsentlogs;
CREATE POLICY "Allow authenticated read" ON public.legalconsentlogs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.legalconsentlogs;
CREATE POLICY "Allow public read" ON public.legalconsentlogs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.legalconsentlogs;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.legalconsentlogs FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: megarewards (from MegaReward.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.megarewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "user_id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "goal_title" TEXT,
    "title" TEXT NOT NULL,
    "reward_type" TEXT NOT NULL,
    "reward_value" TEXT NOT NULL,
    "status" TEXT DEFAULT 'available',
    "awarded_date" DATE
);

ALTER TABLE public.megarewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.megarewards;
CREATE POLICY "Allow authenticated read" ON public.megarewards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.megarewards;
CREATE POLICY "Allow public read" ON public.megarewards FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.megarewards;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.megarewards FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: menuitems (from MenuItem.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menuitems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" NUMERIC NOT NULL,
    "category" TEXT DEFAULT 'food',
    "image_url" TEXT,
    "available" BOOLEAN DEFAULT true
);

ALTER TABLE public.menuitems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.menuitems;
CREATE POLICY "Allow authenticated read" ON public.menuitems FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.menuitems;
CREATE POLICY "Allow public read" ON public.menuitems FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.menuitems;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.menuitems FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: merchants (from Merchant.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "name" TEXT NOT NULL,
    "owner_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'pending',
    "reject_reason" TEXT,
    "tier" TEXT DEFAULT 'starter',
    "address" TEXT,
    "lat" NUMERIC,
    "lng" NUMERIC,
    "geofence_radius" BIGINT DEFAULT 50,
    "quest_quota" BIGINT DEFAULT 30,
    "quest_used" BIGINT DEFAULT 0,
    "push_quota" BIGINT DEFAULT 0,
    "push_used" BIGINT DEFAULT 0,
    "logo_url" TEXT,
    "cover_url" TEXT,
    "open_time" TEXT,
    "close_time" TEXT,
    "slack_webhook_url" TEXT,
    "subscription_expires_at" TEXT,
    "mystery_boost" BIGINT DEFAULT 0,
    "current_mayor_user_id" TEXT,
    "current_mayor_count" BIGINT DEFAULT 0,
    "mayor_updated_date" TEXT,
    "wallet_balance" BIGINT DEFAULT 100,
    "commission_rate" NUMERIC DEFAULT 0.06,
    "is_pro" BOOLEAN DEFAULT false,
    "active_plan_id" TEXT,
    "stripe_subscription_id" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "story_boost_enabled" BOOLEAN DEFAULT false,
    "story_boost_percent" BIGINT DEFAULT 5
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.merchants;
CREATE POLICY "Allow authenticated read" ON public.merchants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.merchants;
CREATE POLICY "Allow public read" ON public.merchants FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.merchants;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.merchants FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: merchantbillingconfigs (from MerchantBillingConfig.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchantbillingconfigs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "merchant_owner_id" TEXT,
    "default_commission_rate" BIGINT DEFAULT 5,
    "voucher_rate" BIGINT DEFAULT 10,
    "custom_rates" JSONB,
    "payment_terms" TEXT DEFAULT 'monthly_invoice',
    "wallet_balance" BIGINT DEFAULT 0,
    "bank_account" JSONB,
    "is_commission_active" BOOLEAN DEFAULT true
);

ALTER TABLE public.merchantbillingconfigs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.merchantbillingconfigs;
CREATE POLICY "Allow authenticated read" ON public.merchantbillingconfigs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.merchantbillingconfigs;
CREATE POLICY "Allow public read" ON public.merchantbillingconfigs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.merchantbillingconfigs;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.merchantbillingconfigs FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: merchantledgers (from MerchantLedger.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchantledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "merchant_owner_id" TEXT,
    "type" TEXT DEFAULT 'commission_deduct',
    "amount" BIGINT DEFAULT 0,
    "balance_after" BIGINT DEFAULT 0,
    "coupon_id" TEXT,
    "bill_amount" NUMERIC,
    "discount_amount" NUMERIC,
    "final_customer_paid" NUMERIC,
    "story_shared" BOOLEAN DEFAULT false,
    "description" TEXT
);

ALTER TABLE public.merchantledgers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.merchantledgers;
CREATE POLICY "Allow authenticated read" ON public.merchantledgers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.merchantledgers;
CREATE POLICY "Allow public read" ON public.merchantledgers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.merchantledgers;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.merchantledgers FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: orders (from Order.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "merchant_owner_id" TEXT,
    "user_id" TEXT,
    "user_name" TEXT,
    "table_no" TEXT,
    "items" JSONB NOT NULL,
    "total" NUMERIC NOT NULL,
    "total_amount" NUMERIC,
    "discount_amount" BIGINT DEFAULT 0,
    "net_paid" NUMERIC,
    "coupon_id" TEXT,
    "commission_fee" BIGINT DEFAULT 0,
    "note" TEXT,
    "status" TEXT DEFAULT 'pending'
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.orders;
CREATE POLICY "Allow authenticated read" ON public.orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.orders;
CREATE POLICY "Allow public read" ON public.orders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.orders;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.orders FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: platformconfigs (from PlatformConfig.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platformconfigs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "commission_percent" BIGINT DEFAULT 0
);

ALTER TABLE public.platformconfigs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.platformconfigs;
CREATE POLICY "Allow authenticated read" ON public.platformconfigs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.platformconfigs;
CREATE POLICY "Allow public read" ON public.platformconfigs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.platformconfigs;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.platformconfigs FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: qrtokenusages (from QrTokenUsage.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qrtokenusages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "token_hash" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "user_id" TEXT
);

ALTER TABLE public.qrtokenusages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.qrtokenusages;
CREATE POLICY "Allow authenticated read" ON public.qrtokenusages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.qrtokenusages;
CREATE POLICY "Allow public read" ON public.qrtokenusages FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.qrtokenusages;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.qrtokenusages FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: quests (from Quest.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT,
    "merchant_name" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reward_type" TEXT NOT NULL,
    "reward_value" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "quest_date" DATE,
    "capacity" BIGINT DEFAULT 10,
    "participants" BIGINT DEFAULT 0,
    "status" TEXT DEFAULT 'active',
    "xp_reward" BIGINT DEFAULT 50,
    "squad_size" BIGINT DEFAULT 0,
    "is_flash" BOOLEAN DEFAULT false,
    "expires_at" TEXT,
    "flash_badge" TEXT
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.quests;
CREATE POLICY "Allow authenticated read" ON public.quests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.quests;
CREATE POLICY "Allow public read" ON public.quests FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.quests;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.quests FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: recipes (from Recipe.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "ingredients" JSONB,
    "result_title" TEXT NOT NULL,
    "result_reward_type" TEXT NOT NULL,
    "result_reward_value" TEXT NOT NULL,
    "active" BOOLEAN DEFAULT true
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.recipes;
CREATE POLICY "Allow authenticated read" ON public.recipes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.recipes;
CREATE POLICY "Allow public read" ON public.recipes FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.recipes;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.recipes FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: securityauditlogs (from SecurityAuditLog.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.securityauditlogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "user_id" TEXT,
    "user_name" TEXT,
    "merchant_id" TEXT,
    "event_type" TEXT DEFAULT 'checkin_approved',
    "reason_code" TEXT NOT NULL,
    "details" JSONB
);

ALTER TABLE public.securityauditlogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.securityauditlogs;
CREATE POLICY "Allow authenticated read" ON public.securityauditlogs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.securityauditlogs;
CREATE POLICY "Allow public read" ON public.securityauditlogs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.securityauditlogs;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.securityauditlogs FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: settlementbatchs (from SettlementBatch.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlementbatchs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "merchant_owner_id" TEXT,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_gmv" BIGINT DEFAULT 0,
    "total_commission" BIGINT DEFAULT 0,
    "net_payout" BIGINT DEFAULT 0,
    "transaction_count" BIGINT DEFAULT 0,
    "payout_status" TEXT DEFAULT 'pending',
    "slip_url" TEXT,
    "paid_date" DATE
);

ALTER TABLE public.settlementbatchs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.settlementbatchs;
CREATE POLICY "Allow authenticated read" ON public.settlementbatchs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.settlementbatchs;
CREATE POLICY "Allow public read" ON public.settlementbatchs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.settlementbatchs;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.settlementbatchs FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: squads (from Squad.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "quest_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "leader_id" TEXT,
    "leader_name" TEXT,
    "squad_code" TEXT NOT NULL,
    "required_count" BIGINT DEFAULT 4,
    "members" JSONB,
    "member_names" JSONB,
    "checked_in" JSONB,
    "status" TEXT DEFAULT 'recruiting',
    "reward_title" TEXT,
    "reward_type" TEXT,
    "reward_value" TEXT
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.squads;
CREATE POLICY "Allow authenticated read" ON public.squads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.squads;
CREATE POLICY "Allow public read" ON public.squads FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.squads;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.squads FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: subscriptionplans (from SubscriptionPlan.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptionplans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" NUMERIC NOT NULL,
    "quest_quota" BIGINT DEFAULT 30,
    "quest_unlimited" BOOLEAN DEFAULT false,
    "geofence_radius" BIGINT DEFAULT 50,
    "push_quota" BIGINT DEFAULT 0,
    "banner_days" BIGINT DEFAULT 0,
    "foodie_buddy" BOOLEAN DEFAULT false,
    "data_export" BOOLEAN DEFAULT false,
    "multi_geofence" BOOLEAN DEFAULT false,
    "color" TEXT,
    "description" TEXT,
    "features" JSONB,
    "active" BOOLEAN DEFAULT true,
    "stripe_price_id" TEXT,
    "discounted_commission_rate" NUMERIC DEFAULT 0.03,
    "boost_credits_per_month" BIGINT DEFAULT 0
);

ALTER TABLE public.subscriptionplans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.subscriptionplans;
CREATE POLICY "Allow authenticated read" ON public.subscriptionplans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.subscriptionplans;
CREATE POLICY "Allow public read" ON public.subscriptionplans FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.subscriptionplans;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.subscriptionplans FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: transactions (from Transaction.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "type" TEXT NOT NULL,
    "merchant_id" TEXT,
    "merchant_name" TEXT,
    "merchant_owner_id" TEXT,
    "user_id" TEXT,
    "user_name" TEXT,
    "gross_amount" NUMERIC NOT NULL,
    "platform_rate" BIGINT DEFAULT 5,
    "platform_fee" BIGINT DEFAULT 0,
    "gateway_fee" BIGINT DEFAULT 0,
    "net_merchant_amount" BIGINT DEFAULT 0,
    "status" TEXT DEFAULT 'pending',
    "payment_method" TEXT,
    "receipt_image_url" TEXT,
    "ai_verification_data" JSONB,
    "receipt_hash" TEXT,
    "bill_number" TEXT,
    "transaction_date" DATE,
    "settlement_batch_id" TEXT
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.transactions;
CREATE POLICY "Allow authenticated read" ON public.transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.transactions;
CREATE POLICY "Allow public read" ON public.transactions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.transactions;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.transactions FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: users (from User.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "role" TEXT NOT NULL,
    "xp" BIGINT DEFAULT 0,
    "level" BIGINT DEFAULT 1,
    "total_checkins" BIGINT DEFAULT 0,
    "avatar" TEXT,
    "phone" TEXT,
    "badges" JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.users;
CREATE POLICY "Allow authenticated read" ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.users;
CREATE POLICY "Allow public read" ON public.users FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.users;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.users FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: userinventorys (from UserInventory.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.userinventorys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "user_id" TEXT,
    "item_key" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "emoji" TEXT,
    "quantity" BIGINT DEFAULT 1
);

ALTER TABLE public.userinventorys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.userinventorys;
CREATE POLICY "Allow authenticated read" ON public.userinventorys FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.userinventorys;
CREATE POLICY "Allow public read" ON public.userinventorys FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.userinventorys;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.userinventorys FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: vouchers (from Voucher.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "merchant_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "merchant_owner_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "price" NUMERIC NOT NULL,
    "original_value" NUMERIC,
    "take_rate" BIGINT DEFAULT 10,
    "stock" BIGINT DEFAULT 0,
    "sold" BIGINT DEFAULT 0,
    "valid_until" DATE,
    "status" TEXT DEFAULT 'active'
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.vouchers;
CREATE POLICY "Allow authenticated read" ON public.vouchers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.vouchers;
CREATE POLICY "Allow public read" ON public.vouchers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.vouchers;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.vouchers FOR ALL TO authenticated USING (true);
-- -----------------------------------------------------
-- Table: voucherorders (from VoucherOrder.jsonc)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voucherorders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT,
    "voucher_id" TEXT NOT NULL,
    "voucher_title" TEXT,
    "merchant_id" TEXT,
    "merchant_name" TEXT,
    "merchant_owner_id" TEXT,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT,
    "amount" NUMERIC NOT NULL,
    "take_rate" BIGINT DEFAULT 10,
    "platform_fee" BIGINT DEFAULT 0,
    "net_merchant_amount" BIGINT DEFAULT 0,
    "payment_method" TEXT,
    "status" TEXT DEFAULT 'pending',
    "order_date" DATE
);

ALTER TABLE public.voucherorders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.voucherorders;
CREATE POLICY "Allow authenticated read" ON public.voucherorders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.voucherorders;
CREATE POLICY "Allow public read" ON public.voucherorders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.voucherorders;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.voucherorders FOR ALL TO authenticated USING (true);

