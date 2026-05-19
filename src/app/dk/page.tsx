"use client";

import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Suspense } from "react";
import DriverSelfRegistrationPage from "../an-ninh/tai-xe/page";

const SECURE_GATE_TOKEN = "sapo-gate-secure-token-2026";

function SecureRegistrationContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  if (token !== SECURE_GATE_TOKEN) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          background: "white",
          width: "100%",
          maxWidth: "400px",
          borderRadius: "16px",
          padding: "2rem 1.5rem",
          textAlign: "center",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{
            display: "inline-flex",
            background: "#fef2f2",
            color: "#ef4444",
            padding: "1rem",
            borderRadius: "50%",
            marginBottom: "1.25rem"
          }}>
            <Lock size={40} />
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.5rem 0" }}>
            CỔNG ĐĂNG KÝ ĐÃ BỊ KHÓA
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5, margin: "0 0 1.5rem 0" }}>
            Đường dẫn truy cập không hợp lệ hoặc đã hết hạn. Để đảm bảo an ninh, vui lòng quét mã QR trực tiếp tại quầy bảo vệ của nhà máy để đăng ký vào cổng.
          </p>
          <div style={{
            fontSize: "0.75rem",
            color: "#94a3b8",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "1rem"
          }}>
            © SAPO EMS • Mã bảo mật cổng an ninh
          </div>
        </div>
      </div>
    );
  }

  return <DriverSelfRegistrationPage />;
}

export default function SecureDriverSelfRegistrationPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        Đang tải cổng đăng ký an ninh...
      </div>
    }>
      <SecureRegistrationContent />
    </Suspense>
  );
}
