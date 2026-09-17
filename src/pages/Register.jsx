import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Store } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import MerchantTermsModal from "@/components/legal/MerchantTermsModal";
import { MERCHANT_TERMS_VERSION } from "@/lib/legalContent";
import { FileCheck2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

const CATEGORIES = [
  { value: "cafe", label: "คาเฟ่" },
  { value: "restaurant", label: "อาหารตามสั่ง" },
  { value: "beverage", label: "เครื่องดื่ม" },
  { value: "dessert", label: "ของหวาน" },
  { value: "bakery", label: "เบเกอรี่" },
];

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  // Preselect partner mode when arriving from the landing CTA (?role=merchant)
  const [mode, setMode] = useState(() =>
    new URLSearchParams(window.location.search).get("role") === "merchant" ? "merchant" : "user"
  ); // user | merchant
  const [showShopForm, setShowShopForm] = useState(false);
  const [shop, setShop] = useState({ name: "", category: "cafe", phone: "", address: "", owner_name: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const isMerchant = mode === "merchant";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน (Passwords do not match)");
      return;
    }
    setLoading(true);
    try {
      // Register account in Supabase
      const regResult = await base44.auth.register({ email, password, role: isMerchant ? "pending_merchant" : "user" });
      
      // Auto sign-in if session was not automatically established
      let currentSession = base44.supabase?.auth?.getUser?.();
      if (!currentSession) {
        try {
          await base44.auth.loginViaEmailPassword(email, password);
        } catch (loginErr) {
          console.warn("Auto-login note:", loginErr);
        }
      }

      if (isMerchant) {
        // If merchant mode, immediately proceed to the merchant application form
        setShowShopForm(true);
      } else {
        // Consumer registration flow
        window.location.href = safeReturnTo();
      }
    } catch (err) {
      // If user already registered, try logging in to allow them to continue their merchant application
      if (isMerchant && (err?.message?.includes("already registered") || err?.message?.includes("User already registered"))) {
        try {
          await base44.auth.loginViaEmailPassword(email, password);
          setShowShopForm(true);
          return;
        } catch (loginErr) {
          setError("อีเมลนี้ถูกลงทะเบียนแล้ว กรุณาเข้าสู่ระบบหรือใช้รหัสผ่านที่ถูกต้อง");
          return;
        }
      }
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      if (isMerchant) {
        // Stay on page to collect shop info for the partner application.
        setShowShopForm(true);
      } else {
        window.location.href = safeReturnTo();
      }
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  const submitShop = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    if (!shop.name.trim()) {
      setError("กรุณากรอกชื่อร้านค้า");
      return;
    }
    if (!shop.owner_name.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุลเจ้าของร้าน");
      return;
    }
    if (!shop.address.trim()) {
      setError("กรุณากรอกที่ตั้ง/ที่อยู่ของร้าน");
      return;
    }
    if (!termsAccepted) {
      setError("กรุณาอ่านและยอมรับข้อตกลงพาร์ทเนอร์และเงื่อนไขค่าคอมมิชชันก่อนส่งคำขอ");
      return;
    }
    setLoading(true);
    try {
      await base44.functions.invoke("applyMerchant", {
        name: shop.name.trim(),
        owner_name: shop.owner_name.trim(),
        category: shop.category,
        phone: shop.phone.trim(),
        address: shop.address.trim(),
      });
      toast({ title: "ส่งใบสมัครพาร์ทเนอร์แล้ว 🎉", description: "ระบบกำลังส่งข้อมูลให้แอดมินตรวจสอบ" });
      window.location.href = "/pending-approval";
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || err?.message || "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 (merchant): Complete shop application form
  if (showShopForm) {
    return (
      <AuthLayout icon={Store} title="ข้อมูลใบสมัครร้านค้าพาร์ทเนอร์" subtitle="กรอกข้อมูลร้านค้าให้ครบถ้วนเพื่อส่งให้แอดมินตรวจสอบ">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm leading-relaxed">{error}</div>
        )}
        <form onSubmit={submitShop} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">ชื่อร้านค้า <span className="text-destructive">*</span></Label>
            <Input
              value={shop.name}
              onChange={(e) => setShop({ ...shop, name: e.target.value })}
              placeholder="เช่น ข้าวแกงป้าพร, Roast Coffee & Bakery"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">ชื่อ-นามสกุล เจ้าของร้าน / ผู้มีอำนาจ <span className="text-destructive">*</span></Label>
            <Input
              value={shop.owner_name}
              onChange={(e) => setShop({ ...shop, owner_name: e.target.value })}
              placeholder="เช่น นายสมชาย ใจดี"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">หมวดหมู่ร้านค้า <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setShop({ ...shop, category: c.value })}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    shop.category === c.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">เบอร์โทรศัพท์ติดต่อร้าน / แคชเชียร์ <span className="text-destructive">*</span></Label>
            <Input
              value={shop.phone}
              onChange={(e) => setShop({ ...shop, phone: e.target.value })}
              placeholder="08X-XXX-XXXX"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">ที่ตั้งร้าน / โซนรอบมหาวิทยาลัย <span className="text-destructive">*</span></Label>
            <Input
              value={shop.address}
              onChange={(e) => setShop({ ...shop, address: e.target.value })}
              placeholder="เช่น ประตู 1 ม.เกษตรฯ ซอยงามวงศ์วาน 54"
              className="h-11"
              required
            />
          </div>

          {/* Partner Agreement consent (PDPA & commission terms) */}
          <div className={`rounded-xl border p-3.5 transition ${termsAccepted ? "border-emerald-300 bg-emerald-50/80" : "border-amber-300 bg-amber-50/80"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className={`text-xs font-bold ${termsAccepted ? "text-emerald-800" : "text-amber-900"}`}>
                  {termsAccepted ? (
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <FileCheck2 className="h-4 w-4 text-emerald-600" /> ยอมรับสัญญาพาร์ทเนอร์และเงื่อนไขค่าคอมมิชชันแล้ว (ฉบับ {MERCHANT_TERMS_VERSION})
                    </span>
                  ) : (
                    "⚠️ ต้องอ่านและยอมรับข้อตกลงพาร์ทเนอร์ก่อนส่งใบสมัคร"
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  อัตราคอมมิชชัน Starter 6% · รอบโอนเงินสุทธิ 3-5 วันทำการหลังปิดรอบ
                </p>
              </div>
            </div>
            {!termsAccepted && (
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="mt-2.5 w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
              >
                📜 กดเพื่ออ่านและยอมรับข้อตกลงพาร์ทเนอร์
              </button>
            )}
          </div>

          <MerchantTermsModal
            open={termsOpen}
            onOpenChange={setTermsOpen}
            merchantName={shop.name}
            onAccepted={() => setTermsAccepted(true)}
          />

          <Button type="submit" className="w-full h-12 text-sm font-bold" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังส่งใบสมัคร...
              </>
            ) : (
              "ส่งใบสมัครและรอการอนุมัติ 🚀"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            เมื่อส่งใบสมัครแล้ว เจ้าหน้าที่จะตรวจสอบและอนุมัติร้านค้าของคุณเพื่อเริ่มสร้างภารกิจ
          </p>
        </form>
      </AuthLayout>
    );
  }

  // Step 2: OTP
  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`We sent a code to ${email}`}>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">Resend</button>
        </p>
      </AuthLayout>
    );
  }

  // Step 1: register form (with role toggle)
  return (
    <AuthLayout
      icon={isMerchant ? Store : UserPlus}
      title={isMerchant ? "สมัครเป็นพาร์ทเนอร์ร้านค้า" : "Create your account"}
      subtitle={isMerchant ? "สำหรับร้านอาหารและเครื่องดื่ม" : "Sign up to get started"}
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
            className="text-primary font-medium hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      {/* Role toggle */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode("user")}
          className={`rounded-lg py-2 text-sm font-medium transition ${!isMerchant ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          นักศึกษา/ผู้ใช้
        </button>
        <button
          type="button"
          onClick={() => setMode("merchant")}
          className={`rounded-lg py-2 text-sm font-medium transition ${isMerchant ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          พาร์ทเนอร์ร้านค้า
        </button>
      </div>

      <Button variant="outline" className="w-full h-12 text-sm font-medium mb-6" onClick={handleGoogle}>
        <GoogleIcon className="w-5 h-5 mr-2" /> Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...
            </>
          ) : isMerchant ? (
            "สมัครพาร์ทเนอร์ร้านค้า"
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}