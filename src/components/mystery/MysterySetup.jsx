import { Sparkles } from "lucide-react";
import { Image } from "@/components/ui/image";
import { MYSTERY_CATEGORIES } from "@/lib/mystery";

const MYSTERY_BOX_IMG = "https://media.base44.com/images/public/6a7dd4b225422a0bf36800b1/d71e2b865_generated_image.png";

// Step 1: two quick choices — category + distance — then roll.
export default function MysterySetup({ category, setCategory, radiusKm, setRadiusKm, onRoll }) {
  const chipClass = (on) =>
    `rounded-xl px-2 py-2.5 text-xs transition ${on ? "bg-primary font-bold text-white shadow-md shadow-primary/30" : "bg-muted font-medium text-muted-foreground hover:bg-muted/70"}`;

  return (
    <div>
      {/* Hero banner: gradient + dot pattern + 3D gacha box */}
      <div className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-primary to-amber-400 text-center text-white shadow-lg">
        <div className="h-40 w-full sm:h-48">
          <Image src={MYSTERY_BOX_IMG} alt="กล่องสมบัติสุ่มอาหาร" fittingType="fill" className="h-full w-full" />
        </div>
        <div className="relative p-5">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1.2px, transparent 1.2px)", backgroundSize: "18px 18px" }}
          />
          <h2 className="relative text-lg font-extrabold drop-shadow-sm">กล่องสุ่มมื้ออาหาร</h2>
          <p className="relative mt-1 text-xs opacity-95">คิดไม่ออกว่าจะกินอะไร? ให้ลูกเต๋าตัดสินใจแทน</p>
          <span className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 px-3.5 py-1 text-xs font-extrabold text-amber-900 shadow-md">
            <Sparkles className="h-3.5 w-3.5" /> โบนัสภารกิจลับ XP x2
          </span>
        </div>
      </div>

      <p className="mb-2 text-sm font-bold">เลือกหมวดหมู่</p>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {MYSTERY_CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCategory(c.key)} className={chipClass(category === c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-sm font-bold">ระยะทางที่ไหวเดินทาง</p>
      <div className="mb-7 grid grid-cols-2 gap-2">
        {[2, 5].map((km) => (
          <button key={km} onClick={() => setRadiusKm(km)} className={chipClass(radiusKm === km)}>
            ภายใน {km} กม.
          </button>
        ))}
      </div>

      <button
        onClick={onRoll}
        className="w-full rounded-2xl bg-gradient-to-r from-primary to-orange-400 py-4 text-base font-extrabold text-white shadow-[0_12px_32px_rgba(255,122,0,0.45)] transition active:scale-95"
      >
        🎲 ทอยลูกเต๋า · สุ่มร้านลับใน {radiusKm} กม.!
      </button>
    </div>
  );
}