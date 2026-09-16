import { motion } from "framer-motion";

const SEGMENTS = ["🍜", "🧋", "🍰", "☕", "🍖", "🍪", "🍩", "🥤"];

// Wheel-of-fortune graphic: conic-gradient wheel with prize emojis poking
// out beyond the rim (out-of-bounds design) + a pointer at the top.
export default function SpinWheel({ spinning, prize, rotation }) {
  const size = 168;
  const seg = 360 / SEGMENTS.length;
  const gradient = SEGMENTS.map(
    (_, i) => `${i % 2 === 0 ? "#FF7A00" : "#FFC078"} ${i * seg}deg ${(i + 1) * seg}deg`
  ).join(", ");

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute -top-3.5 left-1/2 z-20 -translate-x-1/2 text-2xl drop-shadow-md">🔻</div>
      <motion.div
        animate={{ rotate: rotation }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        className="relative h-full w-full rounded-full border-4 border-white shadow-[0_12px_28px_rgba(255,122,0,0.35)]"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        {SEGMENTS.map((emoji, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 -ml-3.5 -mt-3.5 text-2xl drop-shadow"
            style={{ transform: `rotate(${i * seg + seg / 2}deg) translateY(-${size / 2 + 10}px)` }}
          >
            {emoji}
          </span>
        ))}
        <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl shadow-lg ring-4 ring-primary/20">
          {spinning ? "🌀" : prize ? prize.emoji : "❓"}
        </div>
      </motion.div>
    </div>
  );
}