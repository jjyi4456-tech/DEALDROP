import { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, ScanLine } from "lucide-react";

// Full-screen camera QR scanner (Double Lock step 2). Calls onResult with decoded text.
export default function ShopQrScanner({ onClose, onResult }) {
  const elId = "shop-qr-reader";
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let scanner;
    (async () => {
      try {
        scanner = new Html5Qrcode(elId, { verbose: false });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decoded) => {
            if (!active) return;
            active = false;
            scanner.stop().then(() => scanner.clear()).catch(() => {});
            onResult(decoded);
          },
          () => {}
        );
      } catch {
        if (active) setError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์กล้องแล้วลองใหม่");
      }
    })();
    return () => {
      active = false;
      if (scanner) {
        try { scanner.stop().then(() => scanner.clear()).catch(() => {}); } catch {}
      }
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white">
        <X className="h-6 w-6" />
      </button>
      <div className="flex flex-1 items-center justify-center p-4">
        {error ? (
          <div className="text-center text-white">
            <p className="text-sm">{error}</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-primary px-5 py-2 text-sm font-medium">ปิด</button>
          </div>
        ) : (
          <div id={elId} className="w-full max-w-sm overflow-hidden rounded-2xl" />
        )}
      </div>
      {!error && (
        <p className="pb-8 text-center text-sm text-white/80">
          <ScanLine className="mr-1 inline h-4 w-4" /> ชี้กล้องไปที่ QR Code ประจำร้านบนเคาน์เตอร์
        </p>
      )}
    </div>
  );
}