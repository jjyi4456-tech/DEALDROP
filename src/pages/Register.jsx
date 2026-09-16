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
  const [shop, setShop] = useState({ name: "", category: "cafe", phone: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const isMerchant = mode === "merchant";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
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

  const submitShop = async () => {
    if (!shop.name.trim()) {
      setError("กรุณากรอกชื่อร้าน");
      return;
    }
    if (!termsAccepted) {
      setError("กรุณาอ่านและยอมรับข้อตกลงพาร์ทเนอร์และเงื่อนไขค่าคอมมิชชันก่อนส่งคำขอ");
      return;
    }
    setLoading(true);
    try {
      await base44.functions.invoke("applyMerchant", {
        name: shop.name,
        category: shop.category,
        phone: shop.phone,
      });
      toast({ title: "ส่งคำขอพาร์ทเนอร์แล้ว", description: "กรุณารอการอนุมัติจากผู้ดูแลระบบ" });
      window.location.href = "/pending-approval";
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || err?.message || "ส่งคำขอไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 (merchant): shop info form
  if (showShopForm) {
    return (
      <AuthLayout icon={Store} title="ข้อมูลร้านค้า" subtitle="กรอกข้อมูลร้านเพื่อขออนุมัติเป็นพาร์ทเนอร์">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>ชื่อร้าน</Label>
            <Input
              value={shop.name}
              onChange={(e) => setShop({ ...shop, name: e.target.value })}
              placeholder="ชื่อร้านอาหาร/คาเฟ่"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>หมวดหมู่</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setShop({ ...shop, category: c.value })}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    shop.category === c.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>เบอร์โทรร้าน (ไม่บังคับ)</Label>
            <Input
              value={shop.phone}
              onChange={(e) => setShop({ ...shop, phone: e.target.value })}
              className="h-12"
            />
          </div>
          {/* Partner Agreement consent (PDPA / commission terms) */}
          <div className={`rounded-xl border p-3 ${termsAccepted ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start justify-between gap-2">
              <p className={`text-xs font-medium ${termsAccepted ? "text-emerald-700" : "text-amber-800"}`}>
                {termsAccepted ? (
                  <span className="flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4" /> ยอมรับข้อตกลงพาร์ทเนอร์แล้ว (เวอร์ชัน {MERCHANT_TERMS_VERSION})
                  </span>
                ) : (
                  "ต้องอ่านและยอมรับข้อตกลงค่าคอมมิชชันและรอบการชำระเงินก่อนส่งคำขอ"
                )}
              </p>
            </div>
            {!termsAccepted && (
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="mt-2 w-full rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                เปิดข้อตกลงพาร์ทเนอร์
              </button>
            )}
          </div>
          <MerchantTermsModal
            open={termsOpen}
            onOpenChange={setTermsOpen}
            onAccepted={() => setTermsAccepted(true)}
          />
          <Button onClick={submitShop} className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังส่งคำขอ...
              </>
            ) : (
              "ส่งคำขอพาร์ทเนอร์"
            )}
          </Button>
        </div>
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