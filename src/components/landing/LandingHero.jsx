const CHIPS = [
  { emoji: "🎯", label: "ภารกิจลดช่วงโต๊ะว่าง" },
  { emoji: "🦊", label: "เลี้ยงน้องมะพร้าวสะสมแต้ม" },
  { emoji: "👥", label: "ชวนเพื่อนตั้งตี้ลดเพิ่ม" },
];

export default function LandingHero() {
  return (
    <section className="bg-gradient-to-b from-orange-50 via-amber-50/60 to-background">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-10 text-center sm:pb-14 sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary">
          🔥 เกมล่าอาหารรอบมหาวิทยาลัย
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          ล่าภารกิจร้านเด็ดรอบ ม.
          <br />
          กินอร่อยได้ส่วนลดทุกวัน
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          เปลี่ยนมื้ออาหารให้เป็นเกม เลี้ยงสัตว์เสมือนจริง สะสมแต้ม และชวนเพื่อนเปิดตี้รับส่วนลดสูงสุด 30%
          จากร้านโปรดใกล้คุณ
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CHIPS.map((c) => (
            <span
              key={c.label}
              className="flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-xs font-semibold shadow-sm"
            >
              <span aria-hidden="true">{c.emoji}</span>
              {c.label}
            </span>
          ))}
        </div>
        <a
          href="#quests"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-95 sm:text-base"
        >
          ดูภารกิจสดตอนนี้ 🎯
        </a>
      </div>
    </section>
  );
}