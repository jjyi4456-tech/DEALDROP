import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Backpack, Clock, CheckCircle2, Flame, Sparkles, Utensils, Ticket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import PullToRefresh from "@/components/user/PullToRefresh";
import RecipeCard from "@/components/user/RecipeCard";
import CraftingOverlay from "@/components/user/CraftingOverlay";
import CouponQrModal from "@/components/user/CouponQrModal";
import BounceBackStrip from "@/components/user/BounceBackStrip";
import { INGREDIENTS } from "@/lib/ingredients";

const rewardLabel = { percent: "ส่วนลด %", cash: "ลดเงินสด", menu: "แถมเมนู" };

export default function Bag() {
  const [topTab, setTopTab] = useState("coupon");
  const [tab, setTab] = useState("available");
  const [coupons, setCoupons] = useState([]);
  const [megaRewards, setMegaRewards] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crafting, setCrafting] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [qrCoupon, setQrCoupon] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [cpn, mega, inv, recs] = await Promise.all([
        base44.entities.Coupon.list("-created_date", 50),
        base44.entities.MegaReward.list("-awarded_date", 20),
        base44.entities.UserInventory.list(),
        base44.entities.Recipe.filter({ active: true }),
      ]);
      setCoupons(cpn);
      setMegaRewards(mega);
      setInventory(inv);
      setRecipes(recs);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const haveMap = {};
  inventory.forEach((i) => {
    haveMap[i.item_key] = i.quantity || 0;
  });
  const ingredientTotal = Object.values(haveMap).reduce((a, b) => a + b, 0);
  const canCraft = (r) =>
    (r.ingredients || []).length > 0 && (r.ingredients || []).every((ing) => (haveMap[ing.key] || 0) >= (Number(ing.quantity) || 1));

  const filtered = coupons.filter((c) => (tab === "available" ? c.status === "available" : c.status !== "available"));
  const count = {
    available: coupons.filter((c) => c.status === "available").length,
    used: coupons.filter((c) => c.status !== "available").length,
  };

  const redeem = async (c) => {
    await base44.entities.Coupon.update(c.id, { status: "used", redeemed_date: new Date().toISOString().slice(0, 10) });
    toast({ title: "ใช้สิทธิ์สำเร็จ แสดง QR ให้ร้านสแกน ✓" });
    load();
  };

  // Big "ผสมวัตถุดิบ" CTA: crafts the selected recipe if it's craftable,
  // otherwise the first craftable recipe. Opens the confetti CraftingOverlay.
  const startCraft = () => {
    const target = (selectedRecipe && canCraft(selectedRecipe)) ? selectedRecipe : recipes.find(canCraft);
    if (!target) {
      toast({ title: "วัตถุดิบยังไม่ครบ", description: "เช็คอินร้านเพื่อสะสมวัตถุดิบก่อนคราฟต์", variant: "destructive" });
      return;
    }
    setCrafting(target);
  };

  // Craft success → animation plays in the overlay, then auto-switch to the
  // voucher tab so the newly crafted coupon is visible immediately.
  const handleCraftSuccess = () => {
    setCrafting(null);
    setSelectedRecipe(null);
    setTopTab("coupon");
    setTab("available");
    load();
  };

  return (
    <PullToRefresh onRefresh={load}>
      <div>
        {/* RPG-style backpack header */}
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">🎒 กระเป๋าเป้ของฉัน</p>
              <p className="text-2xl font-bold">
                🎟️ คูปองพร้อมใช้ {count.available} ใบ · 🧪 วัตถุดิบ {ingredientTotal} ชิ้น
              </p>
            </div>
            <Backpack className="h-10 w-10 opacity-80" />
          </div>
        </div>

        {/* Mega Rewards */}
        {megaRewards.length > 0 && (
          <div className="mb-4 space-y-3">
            {megaRewards.map((m) => (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                className={`overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm ${
                  m.status === "claimed" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-3xl shadow">
                    🍲
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">MEGA REWARD</span>
                    </div>
                    <h3 className="mt-1 font-bold leading-tight">{m.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {m.goal_title ? `จากแคมเปญ ${m.goal_title}` : "รางวัลจากหม้อไฟรวมพลัง"} · {rewardLabel[m.reward_type]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">{m.reward_value}</p>
                    <p className="text-xs text-muted-foreground">{m.status === "claimed" ? "ใช้แล้ว" : "พร้อมใช้"}</p>
                  </div>
                </div>
                {m.status === "available" && (
                  <button
                    onClick={async () => {
                      await base44.entities.MegaReward.update(m.id, { status: "claimed" });
                      toast({ title: "ใช้สิทธิ์ Mega Reward แล้ว 🎉" });
                      load();
                    }}
                    className="mt-3 w-full rounded-xl bg-orange-500 py-2 text-sm font-bold text-white hover:bg-orange-600"
                  >
                    แลกใช้รางวัล
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab switcher: คูปอง | วัตถุดิบ & แล็บปรุงอาหาร */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-stone-100/80 p-1">
          <button
            onClick={() => setTopTab("coupon")}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold transition ${
              topTab === "coupon" ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25" : "text-stone-500"
            }`}
          >
            <Ticket className="h-4 w-4" /> 🎟️ คูปองของฉัน ({count.available})
          </button>
          <button
            onClick={() => setTopTab("craft")}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold transition ${
              topTab === "craft" ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25" : "text-stone-500"
            }`}
          >
            <Utensils className="h-4 w-4" /> 🧪 แล็บปรุงอาหาร ({ingredientTotal})
          </button>
        </div>

        {topTab === "coupon" ? (
          <>
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setTab("available")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                  tab === "available" ? "bg-foreground text-background" : "border bg-card hover:bg-accent"
                }`}
              >
                พร้อมใช้งาน ({count.available})
              </button>
              <button
                onClick={() => setTab("used")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                  tab === "used" ? "bg-foreground text-background" : "border bg-card hover:bg-accent"
                }`}
              >
                ใช้แล้ว/หมดอายุ ({count.used})
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((c) => {
                  const used = c.status === "used";
                  const expired = c.status === "expired";
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setQrCoupon(c)}
                      className={`cursor-pointer overflow-hidden rounded-3xl border border-stone-200/60 bg-card shadow-sm transition hover:shadow-md ${used || expired ? "opacity-60" : ""}`}
                    >
                      <div className="flex">
                        <div className="relative flex w-20 flex-shrink-0 flex-col items-center justify-center gap-1 border-r-2 border-dashed border-stone-200 bg-gradient-to-b from-amber-50 to-orange-50 py-4">
                          <span className="text-3xl">🎟️</span>
                          <span className="font-mono text-[10px] text-stone-400">{c.qr_code}</span>
                          <span className="absolute -right-[9px] top-0 h-4 w-4 -translate-y-1/2 rounded-full border border-stone-200/60 bg-[#FAF8F5]" />
                          <span className="absolute -right-[9px] bottom-0 h-4 w-4 translate-y-1/2 rounded-full border border-stone-200/60 bg-[#FAF8F5]" />
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold leading-tight">{c.title}</h3>
                              <p className="text-xs text-muted-foreground">{c.merchant_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-amber-600">{c.reward_value}</p>
                              <p className="text-xs text-muted-foreground">{rewardLabel[c.reward_type]}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" /> หมดอายุ {c.expiry_date}
                            </span>
                          </div>
                          {c.coupon_type === "bounce_back" && c.status === "available" && <BounceBackStrip coupon={c} />}
                        </div>
                      </div>

                      {tab === "available" && (
                        <div className="relative border-t bg-muted/30 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setQrCoupon(c); }}
                              className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 transition hover:bg-orange-100"
                            >
                              เปิด QR Code
                            </button>
                            <motion.button
                              drag="x"
                              dragConstraints={{ left: 0, right: 160 }}
                              dragElastic={0.05}
                              onDragEnd={(_, info) => {
                                if (info.offset.x > 140) redeem(c);
                              }}
                              whileTap={{ scale: 0.95 }}
                              className="flex h-11 w-11 cursor-grab items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg active:cursor-grabbing"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </motion.button>
                          </div>
                        </div>
                      )}
                      {used && (
                        <div className="border-t bg-emerald-50 px-4 py-2 text-center text-xs font-medium text-emerald-600">
                          ✓ ใช้สิทธิ์แล้วเมื่อ {c.redeemed_date}
                        </div>
                      )}
                      {expired && <div className="border-t bg-red-50 px-4 py-2 text-center text-xs font-medium text-red-500">หมดอายุแล้ว</div>}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
                    <Ticket className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {tab === "available" ? "ยังไม่มีคูปอง เช็คอินร้านเพื่อรับคูปองกัน!" : "ยังไม่มีคูปองที่ใช้แล้ว"}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // 🧪 วัตถุดิบ & แล็บปรุงอาหาร (Ingredients & Crafting)
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-bold">วัตถุดิบในคลัง</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {INGREDIENTS.map((ing) => {
                const qty = haveMap[ing.key] || 0;
                const has = qty > 0;
                return (
                  <div
                    key={ing.key}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                      has ? "border-orange-300 bg-orange-50" : "border-muted bg-card opacity-50"
                    }`}
                  >
                    <span className="text-3xl">{ing.emoji}</span>
                    <span className="mt-1 text-xs font-medium leading-tight">{ing.name}</span>
                    <span className={`mt-1 rounded-full px-2 py-0.5 text-xs font-bold ${has ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      ×{qty}
                    </span>
                  </div>
                );
              })}
            </div>

            <h2 className="mb-2 mt-6 text-sm font-bold text-muted-foreground">สูตรผสม ({recipes.length})</h2>
            <div className="space-y-3">
              {recipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} haveMap={haveMap} onSelect={setSelectedRecipe} selected={selectedRecipe?.id === r.id} />
              ))}
              {recipes.length === 0 && (
                <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">ยังไม่มีสูตรผสมในระบบ</div>
              )}
            </div>

            {/* Big full-width Craft CTA — fires the confetti CraftingOverlay */}
            <button
              onClick={startCraft}
              className="mt-6 w-full rounded-2xl bg-orange-500 py-4 text-base font-bold text-white shadow-lg transition hover:bg-orange-600 active:scale-95"
            >
              🧪 ผสมสูตรเพื่อรับคูปอง
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {crafting && (
          <CraftingOverlay
            recipe={crafting}
            onClose={() => {
              setCrafting(null);
              setSelectedRecipe(null);
            }}
            onSuccess={handleCraftSuccess}
          />
        )}
      </AnimatePresence>

      <CouponQrModal coupon={qrCoupon} onClose={() => setQrCoupon(null)} />
    </PullToRefresh>
  );
}