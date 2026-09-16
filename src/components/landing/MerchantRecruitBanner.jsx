import { Link } from "react-router-dom";
import { Store, ArrowRight, CheckCircle2 } from "lucide-react";

const POINTS = ["ค่าคอมมิชชันแบบจ่ายต่อสำเร็จ โปร่งใสตรวจสอบได้", "ระบบพาลูกค้าใหม่มาถึงหน้าร้านช่วงบ่าย", "อนุมัติร้านรวดเร็ว เริ่มโปรโมตได้ทันที"];

export default function MerchantRecruitBanner() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-14">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-orange-500 p-6 text-white shadow-lg sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <Store className="h-3.5 w-3.5" /> สำหรับเจ้าของร้าน
            </span>
            <h2 className="mt-3 text-xl font-extrabold leading-snug sm:text-2xl">
              คุณเป็นเจ้าของร้านอาหารรอบมหาวิทยาลัยใช่ไหม?
            </h2>
            <p className="mt-2 text-sm leading-relaxed opacity-90">
              เพิ่มยอดขายช่วงบ่าย เปลี่ยนโต๊ะว่างให้เป็นลูกค้าประจำ ไม่มีค่าบริการรายเดือน สมัครพาร์ทเนอร์ฟรีวันนี้
            </p>
            <ul className="mt-4 space-y-1.5 text-xs sm:text-sm">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 opacity-90" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <Link
            to="/register?role=merchant"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-violet-700 shadow-lg transition hover:bg-white/90 active:scale-95"
          >
            สมัครเป็นพาร์ทเนอร์ร้านค้า <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}