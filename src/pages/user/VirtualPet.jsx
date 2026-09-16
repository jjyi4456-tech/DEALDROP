import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Cat, UtensilsCrossed, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import SpinWheel from "@/components/user/SpinWheel";

const FOODS = [
  { emoji: "🍜", name: "บะหมี่", xp: 20 },
  { emoji: "🧋", name: "ชานม", xp: 15 },
  { emoji: "🍰", name: "เค้ก", xp: 25 },
  { emoji: "☕", name: "กาแฟ", xp: 10 },
  { emoji: "🍖", name: "เนื้อย่าง", xp: 40 },
  { emoji: "🍪", name: "คุกกี้", xp: 15 },
];

const XP_PER_LEVEL = 200;

export default function VirtualPet() {
  const [pet, setPet] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [prize, setPrize] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [hearts, setHearts] = useState([]);
  const { toast } = useToast();

  const load = async () => {
    const list = await base44.entities.FoodieBuddy.list();
    if (list[0]) setPet(list[0]);
    else {
      const created = await base44.entities.FoodieBuddy.create({ pet_name: "มะพร้าว", pet_type: "fox", hunger_level: 45, happiness: 60, level: 3, xp: 540 });
      setPet(created);
    }
  };
  useEffect(() => { load(); }, []);

  const feed = async (food) => {
    if (!pet) return;
    const snapshot = pet;
    const hunger = Math.min(100, pet.hunger_level + 25);
    const happy = Math.min(100, pet.happiness + 10);
    const newXp = pet.xp + food.xp;
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
    // Optimistic: reflect hunger/happiness immediately, before the DB write resolves
    setPet({ ...pet, hunger_level: hunger, happiness: happy, xp: newXp, level: newLevel });
    setSelectedFood(food.name);
    setTimeout(() => setSelectedFood(null), 700);
    const burst = Array.from({ length: 5 }, (_, i) => ({ id: `${Date.now()}-${i}`, left: 25 + Math.random() * 50 }));
    setHearts((prev) => [...prev, ...burst]);
    setTimeout(() => setHearts((prev) => prev.filter((h) => !burst.includes(h))), 1500);
    toast({ title: `ให้${food.name}กับมะพร้าวแล้ว 🐾`, description: `+${food.xp} XP · ความหิวลดลง` });
    try {
      await base44.entities.FoodieBuddy.update(pet.id, { hunger_level: hunger, happiness: happy, xp: newXp, level: newLevel });
    } catch {
      setPet(snapshot);
      toast({ title: "บันทึกไม่สำเร็จ กรุณาลองใหม่", variant: "destructive" });
    }
  };

  const spin = () => {
    setSpinning(true);
    setPrize(null);
    setSpinCount((c) => c + 1);
    setTimeout(() => {
      const win = FOODS[Math.floor(Math.random() * FOODS.length)];
      setPrize(win);
      setSpinning(false);
    }, 1800);
  };

  if (!pet) return <div className="h-64 animate-pulse rounded-3xl bg-muted" />;

  const xpIntoLevel = pet.xp % XP_PER_LEVEL;

  return (
    <div>
      {/* Pet + hunger/happiness grouped in one card */}
      <div className="mb-5 rounded-3xl bg-card p-6 text-center shadow-sm">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Cat className="h-3.5 w-3.5" /> สัตว์เลี้ยงของคุณ</div>
        <div className="relative z-10 mx-auto mb-2 mt-3 w-fit rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-200/60">
          {pet.hunger_level < 30 ? "หิวจังเลย... หาอาหารให้หน่อยนะ 🥺" : pet.happiness >= 70 ? "อิ่มแล้ว มีความสุขมาก! ✨" : "วันนี้ออกไปผจญภัยกันไหม?"}
        </div>
        <div className="relative mx-auto mt-3 h-32 w-32">
          <div className="absolute inset-0 scale-125 rounded-full bg-primary/20 blur-2xl" />
          <motion.div
            animate={pet.hunger_level < 30 ? { rotate: [0, -5, 5, 0] } : { y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: pet.hunger_level < 30 ? 0.5 : 2 }}
            className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 text-7xl"
          >
            🦊
          </motion.div>
          <AnimatePresence>
            {hearts.map((h) => (
              <motion.span
                key={h.id}
                initial={{ opacity: 0, y: 24, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], y: -70, scale: 1.2 }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                className="pointer-events-none absolute bottom-0 text-2xl"
                style={{ left: `${h.left}%` }}
              >
                💖
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <h2 className="mt-3 text-2xl font-bold">{pet.pet_name}</h2>
        <p className="mt-0.5 text-sm font-medium text-muted-foreground">เลเวล {pet.level}</p>
        {/* XP progress bar toward next level */}
        <div className="mx-auto mt-2 max-w-xs">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-2 rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all" style={{ width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{xpIntoLevel}/{XP_PER_LEVEL} XP ถึงเลเวลถัดไป</p>
        </div>
        {pet.hunger_level < 30 && <p className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600 animate-pulse">🚨 หิวจัง! รีบหาอาหารให้สัตว์เลี้ยงเถอะ</p>}
        <div className="mt-5 space-y-3 text-left">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm font-semibold">
              <span>🍗 ความหิว</span>
              <span className="text-muted-foreground">{pet.hunger_level}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-stone-100">
              <div className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all" style={{ width: `${pet.hunger_level}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm font-semibold">
              <span>❤️ ความสุข</span>
              <span className="text-muted-foreground">{pet.happiness}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-stone-100">
              <div className="h-3 rounded-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all" style={{ width: `${pet.happiness}%` }} />
            </div>
          </div>
        </div>
      </div>

      <h3 className="mb-3 flex items-center gap-2 font-semibold"><UtensilsCrossed className="h-5 w-5 text-primary" /> ป้อนอาหาร</h3>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {FOODS.map((f) => {
          const on = selectedFood === f.name;
          return (
            <button
              key={f.name}
              onClick={() => feed(f)}
              className={`rounded-2xl border p-4 text-center shadow-sm transition active:scale-95 ${
                on ? "border-transparent bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30" : "border-stone-200/60 bg-white text-foreground hover:bg-stone-50"
              }`}
            >
              <div className="text-3xl">{f.emoji}</div>
              <p className="mt-1 text-xs font-medium">{f.name}</p>
              <p className={`text-xs ${on ? "text-white/80" : "text-orange-500"}`}>+{f.xp} XP</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-primary/10 to-transparent p-6 pb-8 text-center">
        <h3 className="mb-1 flex items-center justify-center gap-2 font-semibold"><Sparkles className="h-5 w-5 text-primary" /> วงล้อเสี่ยงโชค (Daily)</h3>
        <p className="mb-5 text-xs text-muted-foreground">หมุน 1 ครั้ง/วัน เพื่อหาไอเทมอาหารไปป้อนสัตว์เลี้ยง</p>
        <SpinWheel spinning={spinning} prize={prize} rotation={spinCount * 1080} />
        {prize && !spinning && <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 font-bold text-primary">ได้ {prize.emoji} {prize.name}!</motion.p>}
        <button
          onClick={spin}
          disabled={spinning}
          className="relative mt-5 w-full overflow-hidden rounded-3xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(255,122,0,0.4)] hover:bg-primary/90 disabled:opacity-50"
        >
          <motion.span
            initial={{ x: "-150%" }}
            animate={{ x: "450%" }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
            className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
          {spinning ? "กำลังหมุน..." : prize ? "หมุนอีกครั้ง" : "หมุนวงล้อ"}
        </button>
      </div>
    </div>
  );
}