"use client";

import { useState, useEffect } from "react";
import React from "react";
import { createRegistration } from "../../(dashboard)/an-ninh/actions";
import { CheckCircle2, ChevronRight, Truck, Phone, Award, ShieldCheck } from "lucide-react";

const PURPOSES = [
  "Giao nguyên liệu",
  "Giao hàng thành phẩm",
  "Lấy hàng",
  "Khác"
];

export default function DriverSelfRegistrationPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      if (window.location.pathname === "/an-ninh/tai-xe") {
        window.location.replace("/dk");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      licensePlate: (formData.get("licensePlate") as string)?.toUpperCase()?.trim(),
      driverName: (formData.get("driverName") as string)?.toUpperCase()?.trim(),
      idCardNumber: (formData.get("idCardNumber") as string)?.toUpperCase()?.trim() || "",
      phoneNumber: (formData.get("phoneNumber") as string)?.trim() || null,
      unit: (formData.get("unit") as string)?.toUpperCase()?.trim(),
      purpose: (formData.get("purpose") as string),
      note: (formData.get("note") as string)?.trim() || null,
      creator: "TÀI XẾ TỰ ĐĂNG KÝ",
    };

    if (!payload.licensePlate || !payload.driverName || !payload.unit) {
      setError("Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)");
      setLoading(false);
      return;
    }

    try {
      const res = await createRegistration(payload);
      if (res.success) {
        setRegistrationId(res.id || null);
        setIsSubmitted(true);
      } else {
        setError(res.error || "Có lỗi xảy ra khi gửi đăng ký.");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.");
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        padding: "1rem",
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          background: "white",
          width: "100%",
          maxWidth: "420px",
          borderRadius: "20px",
          padding: "1.75rem 1.25rem",
          boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)",
          textAlign: "center",
          border: "1px solid rgba(224, 242, 254, 0.5)"
        }}>
          <div style={{ display: "inline-flex", background: "#f0fdf4", padding: "0.85rem", borderRadius: "50%", marginBottom: "1rem" }}>
            <CheckCircle2 size={50} color="#15803d" />
          </div>
          <h1 style={{ fontSize: "1.4rem", color: "#1e293b", fontWeight: 800, margin: "0 0 0.5rem 0" }}>Đăng Ký Thành Công!</h1>
          <p style={{ color: "#64748b", lineHeight: 1.5, fontSize: "0.9rem", margin: 0 }}>
            Thông tin xe của bạn đã được gửi đến phòng bảo vệ. Vui lòng đỗ xe đúng nơi quy định và đợi bảo vệ hướng dẫn cân xe.
          </p>

          {/* QR Code Container for Live Queue Tracking */}
          {registrationId && origin && (
            <div style={{
              marginTop: "1.25rem",
              padding: "1rem 0.75rem",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                Mã QR Theo Dõi Thứ Tự
              </span>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${origin}/x/${registrationId}`)}`}
                alt="Mã QR Thứ tự"
                style={{
                  width: "140px",
                  height: "140px",
                  border: "4px solid white",
                  borderRadius: "8px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.25rem 0 0.5rem 0", textAlign: "center", lineHeight: 1.4 }}>
                Quét mã QR bằng điện thoại để xem trực tiếp thứ tự xếp hàng và tiến trình gọi xe của bạn
              </p>
              <a 
                href={`${origin}/x/${registrationId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#0284c7",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textDecoration: "underline"
                }}
              >
                Bấm vào đây để theo dõi và nhận thông báo
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
      padding: "0.5rem",
      paddingTop: "10px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <style jsx global>{`
        .driver-form input, .driver-form select {
          transition: all 0.2s ease-in-out;
          font-family: inherit;
        }
        .driver-form input:focus, .driver-form select:focus {
          border-color: #0284c7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15) !important;
          outline: none;
        }
      `}</style>

      {/* Main Form container */}
      <div style={{
        background: "white",
        width: "100%",
        maxWidth: "480px",
        borderRadius: "16px",
        boxShadow: "0 15px 30px -10px rgba(0, 0, 0, 0.05), 0 5px 15px -5px rgba(0, 0, 0, 0.03)",
        border: "1px solid #f1f5f9",
        overflow: "hidden"
      }}>
        {/* Banner guide */}
        <div style={{
          background: "linear-gradient(90deg, #0284c7 0%, #0369a1 100%)",
          color: "white",
          padding: "0.6rem 0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem"
        }}>
          <Truck size={18} />
          <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            CỔNG ĐĂNG KÝ TÀI XẾ
          </span>
        </div>

        <form className="driver-form" onSubmit={handleSubmit} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              borderRadius: "6px",
              padding: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: 500
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Row 1: Biển số xe & Tên tài xế */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 4 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.2rem" }}>Số xe *</label>
              <input 
                type="text" 
                name="licensePlate" 
                required 
                placeholder="29C-12345" 
                style={{
                  width: "100%",
                  height: "36px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0 0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textTransform: "uppercase"
                }}
              />
            </div>
            <div style={{ flex: 6 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.2rem" }}>Tên tài xế *</label>
              <input 
                type="text" 
                name="driverName" 
                required 
                placeholder="NGUYỄN VĂN A" 
                style={{
                  width: "100%",
                  height: "36px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0 0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "uppercase"
                }}
              />
            </div>
          </div>

          {/* Row 2: Đơn vị công tác */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.2rem" }}>Đơn vị công tác *</label>
            <input 
              type="text" 
              name="unit" 
              required 
              placeholder="VD: CÔNG TY LÂM PHÁT" 
              style={{
                width: "100%",
                height: "36px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0 0.5rem",
                fontSize: "0.85rem",
                fontWeight: 500,
                textTransform: "uppercase"
              }}
            />
          </div>

          {/* Row 3: Mục đích vào cổng */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.2rem" }}>Mục đích vào cổng *</label>
            <select 
              name="purpose" 
              defaultValue={PURPOSES[0]}
              required
              style={{
                width: "100%",
                height: "36px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0 0.5rem",
                fontSize: "0.85rem",
                background: "white"
              }}
            >
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Row 4: Số CCCD & Số điện thoại */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.2rem" }}>Số CCCD</label>
              <input 
                type="text" 
                name="idCardNumber" 
                placeholder="CMND / CCCD" 
                style={{
                  width: "100%",
                  height: "36px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0 0.5rem",
                  fontSize: "0.85rem",
                  textTransform: "uppercase"
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.2rem" }}>Số điện thoại</label>
              <input 
                type="tel" 
                name="phoneNumber" 
                placeholder="Số điện thoại" 
                style={{
                  width: "100%",
                  height: "36px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0 0.5rem",
                  fontSize: "0.85rem"
                }}
              />
            </div>
          </div>

          {/* Row 5: Ghi chú thêm */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.2rem" }}>Ghi chú thêm</label>
            <input 
              type="text"
              name="note" 
              placeholder="Nhập ghi chú hoặc thông tin bổ sung nếu có..." 
              style={{
                width: "100%",
                height: "36px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0 0.5rem",
                fontSize: "0.85rem"
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "linear-gradient(90deg, #0284c7 0%, #0369a1 100%)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "0.75rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              marginTop: "0.25rem",
              boxShadow: "0 4px 10px rgba(2, 132, 199, 0.2)",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Đang gửi thông tin..." : (
              <>
                Gửi Đăng Ký Ra Vào <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer copyright */}
      <div style={{ marginTop: "0.75rem", color: "#64748b", fontSize: "0.7rem", textAlign: "center" }}>
        © {new Date().getFullYear()} SAPO EMS. Bảo mật thông tin an ninh cổng.
      </div>
    </div>
  );
}
