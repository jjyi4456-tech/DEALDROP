import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import confetti from "canvas-confetti";
import { Users, Share2, MapPin, Check, Loader2, Copy, Crown, Gift, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { squadShareLink } from "@/lib/squadCode";

// "Squad กินแหลก" lobby: the leader shares the link here, friends join, and
// every member checks in (geofenced) at the shop. The backend grants the big
// reward coupon + 3x XP to all members the moment the last one checks in.
export default function SquadLobby() {
  const { code } = useParams();
  const [squad, setSquad] = useState(null);
  const [quest, setQuest] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [meUser, squads] = await Promise.all([
      base44.auth.me(),
      base44.entities.Squad.filter({ squad_code: code }),
    ]);
    setMe(meUser);
    const s = squads[0] || null;
    setSquad(s);
    if (s?.quest_id) {
      const q = await base44.entities.Quest.get(s.quest_id).catch(() => null);
      setQuest(q);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Squad.subscribe((event) => {
      const d = event.data;
      if (d && d.squad_code === code) setSquad((prev) => (prev ? { ...prev, ...d } : d));
    });
    return unsub;
  }, [code]);

  // Confetti burst the instant the squad completes.
  useEffect(() => {
    if (squad?.status !== "completed") return;
    const colors = ["#FF7A00", "#FFB347", "#FFD580", "#ffffff"];
    confetti({ particleCount: 140, spread: 100, origin: { y: 0.5 }, colors });
  }, [squad?.status]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!squad) return <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">ไม่พบ Squad นี้ (อาจถูกลบแล้ว)</div>;

  const isMember = me && (squad.members || []).includes(me.id);
  const myCheckedIn = me && (squad.checked_in || []).includes(me.id);
  const required = squad.required_count;
  const memberCount = (squad.members || []).length;
  const checkedCount = (squad.checked_in || []).length;
  const link = squadShareLink(code);

  const join = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("joinSquad", { squad_code: code });
      toast({ title: "เข้าร่วม Squad แล้ว! 🎉" });
      await load();
    } catch (e) {
      toast({ title: e?.response?.data?.error || "เข้าร่วมไม่สำเร็จ", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const checkIn = () => {
    if (!navigator.geolocation) { toast({ title: "อุปกรณ์ไม่รองรับ GPS", variant: "destructive" }); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await base44.functions.invoke("squadCheckIn", { squad_id: squad.id, lat: pos.coords.latitude, lng: pos.coords.longitude });
        const data = res?.data ?? res;
        if (data?.ok) {
          toast({ title: data.completedNow ? "Squad สำเร็จ! รับรางวัลใหญ่แล้ว 🎉" : `เช็คอินแล้ว (${(data.checked_in || []).length}/${required}) +${data.xp_earned} XP` });
          await load();
        } else {
          toast({ title: data?.error || "เช็คอินไม่สำเร็จ", variant: "destructive" });
        }
      } catch (e) {
        toast({ title: e?.response?.data?.error || "เช็คอินไม่สำเร็จ", variant: "destructive" });
      } finally { setBusy(false); }
    }, () => { setBusy(false); toast({ title: "ไม่สามารถรับพิกัดได้", variant: "destructive" }); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const share = async () => {
    const text = `ชวนเข้า Squad กินแหลก ที่ ${squad.merchant_name} — ครบ ${required} คนเช็คอินพร้อมกันรับ ${squad.reward_value || "รางวัลใหญ่"} + XP x3!`;
    if (navigator.share) {
      try { await navigator.share({ title: "Squad กินแหลก", text, url: link }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} ${link}`);
      toast({ title: "คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย!" });
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    toast({ title: "คัดลอกลิงก์แล้ว" });
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold"><Users className="h-4 w-4" /> SQUAD กินแหลก</div>
        <h2 className="mt-2 text-xl font-bold leading-tight">{squad.merchant_name}</h2>
        <p className="mt-1 text-sm opacity-90">{squad.reward_title || "รางวัล Squad"}</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold">
          <Gift className="h-4 w-4" /> รางวัลใหญ่: {squad.reward_value || "ฟรีเมนูทานเล่น"} + XP x3
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs opacity-90">
          {quest && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {quest.start_time}-{quest.end_time}</span>}
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> ต้องเช็คอินที่ร้าน</span>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="flex items-center gap-1"><Users className="h-4 w-4 text-primary" /> สมาชิก {memberCount}/{required}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${squad.status === "completed" ? "bg-emerald-500" : squad.status === "ready" ? "bg-orange-500" : "bg-muted-foreground"}`}>
            {squad.status === "completed" ? "สำเร็จ!" : squad.status === "ready" ? "พร้อมเช็คอิน" : "กำลังรวม Squad"}
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${Math.min(100, (memberCount / required) * 100)}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>เช็คอินแล้ว {checkedCount}/{required}</span>
          <span>โค้ด: {code}</span>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold">สมาชิก Squad</p>
        <div className="space-y-2">
          {(squad.members || []).map((mId, i) => {
            const name = (squad.member_names || [])[i] || "เพื่อน";
            const checked = (squad.checked_in || []).includes(mId);
            const isLeader = mId === squad.leader_id;
            return (
              <div key={mId} className={`flex items-center gap-3 rounded-xl p-2 ${checked ? "bg-emerald-50" : "bg-muted/40"}`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-sm font-bold text-orange-700">{name.charAt(0)}</div>
                <span className="flex-1 truncate text-sm font-medium">{name} {isLeader && <Crown className="ml-1 inline h-3 w-3 text-amber-500" />}{mId === me?.id && <span className="text-xs text-muted-foreground"> (คุณ)</span>}</span>
                {checked ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><Check className="h-4 w-4" /> เช็คอินแล้ว</span> : <span className="text-xs text-muted-foreground">รอเช็คอิน</span>}
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, required - memberCount) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 rounded-xl border border-dashed p-2 text-sm text-muted-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed">?</div>
              <span>ว่าง — ชวนเพื่อนเข้าร่วม</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {!isMember ? (
        <button onClick={join} disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 text-base font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60">
          {busy ? "กำลังเข้าร่วม..." : "🎉 เข้าร่วม Squad"}
        </button>
      ) : squad.status === "completed" ? (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
          <p className="text-lg font-bold text-emerald-700">🏆 Squad สำเร็จ!</p>
          <p className="mt-1 text-sm text-emerald-600">ทุกคนได้รับ {squad.reward_value || "รางวัลใหญ่"} + XP x3 ไปที่กระเป๋ารางวัลแล้ว</p>
          <Link to="/user/bag" className="mt-3 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">ดูคูปองของฉัน</Link>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={share} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background transition active:scale-95">
            <Share2 className="h-4 w-4" /> แชร์ลิงก์ชวนเพื่อน
          </button>
          <button onClick={copyLink} className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium text-muted-foreground hover:bg-accent">
            <Copy className="h-4 w-4" /> คัดลอกลิงก์
          </button>
          {myCheckedIn ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3.5 text-sm font-bold text-emerald-600"><Check className="h-5 w-5" /> คุณเช็คอินแล้ว — รอเพื่อนที่เหลือ</div>
          ) : (
            <button onClick={checkIn} disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 text-base font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60">
              {busy ? "กำลังตรวจพิกัด..." : "📍 เช็คอิน Squad (ยืนยันพิกัดที่ร้าน)"}
            </button>
          )}
          <p className="text-center text-xs text-muted-foreground">ต้องอยู่ในรัศมีร้านจึงจะเช็คอินได้ · เมื่อครบ {required} คนเช็คอิน ระบบแจกรางวัลใหญ่อัตโนมัติ</p>
        </div>
      )}

      <Link to="/user" className="block text-center text-xs text-muted-foreground hover:text-primary">← กลับหน้าแรก</Link>
    </div>
  );
}