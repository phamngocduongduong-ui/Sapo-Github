"use client";

import { useState, useTransition, useEffect } from "react";
import { changePassword } from "./actions";
import { logout } from "@/app/login/actions";
import { ShieldCheck, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function DoiMatKhauPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isPending, startTransition] = useTransition();

  // Handle auto-logout countdown after success
  useEffect(() => {
    if (!success) return;

    if (countdown === 0) {
      handleLogout();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [success, countdown]);

  const handleLogout = async () => {
    await logout();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Vui lòng nhập mật khẩu mới.");
      return;
    }

    if (password.length < 3) {
      setError("Mật khẩu mới phải có ít nhất 3 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    startTransition(async () => {
      const result = await changePassword(password, confirmPassword);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  };

  return (
    <div style={{
      padding: "2rem 1rem",
      width: "100%",
      minHeight: "calc(100vh - 220px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '"Segoe UI", -apple-system, sans-serif',
      fontSize: "13px"
    }}>
      <div style={{ width: "100%", maxWidth: "450px" }}>
        
        {/* Page title */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#003466", marginBottom: "0.5rem", fontFamily: '"Segoe UI", -apple-system, sans-serif' }}>
            🔑 Đổi mật khẩu
          </h1>
          <p style={{ color: "#64748b", fontSize: "13px", fontFamily: '"Segoe UI", -apple-system, sans-serif' }}>
            Cập nhật mật khẩu mới để bảo vệ tài khoản của bạn
          </p>
        </div>

        {/* Form Card */}
        <div className="card" style={{ padding: "2rem", border: "1px solid #e2e8f0", borderRadius: "8px", position: "relative", backgroundColor: "#ffffff" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            {error && (
              <div style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fee2e2",
                color: "#991b1b",
                fontSize: "13px",
                fontFamily: '"Segoe UI", -apple-system, sans-serif',
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Input Mật khẩu mới */}
            <div>
              <label className="filter-label" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "13px", fontFamily: '"Segoe UI", -apple-system, sans-serif' }}>
                Mật khẩu mới *
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  placeholder="Nhập mật khẩu mới"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending || success}
                  required
                  style={{ paddingRight: "45px", fontSize: "13px", fontFamily: '"Segoe UI", -apple-system, sans-serif' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: 0,
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Input Nhập lại mật khẩu */}
            <div>
              <label className="filter-label" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "13px", fontFamily: '"Segoe UI", -apple-system, sans-serif' }}>
                Nhập lại mật khẩu mới *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="input"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending || success}
                required
                style={{ fontSize: "13px", fontFamily: '"Segoe UI", -apple-system, sans-serif' }}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending || success}
              style={{
                width: "100%",
                padding: "8px 16px",
                borderRadius: "4px",
                backgroundColor: isPending || success ? "#cbd5e1" : "#003466",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                fontFamily: '"Segoe UI", -apple-system, sans-serif',
                cursor: isPending || success ? "not-allowed" : "pointer",
                transition: "background-color 0.2s, transform 0.1s",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.5rem"
              }}
              onMouseEnter={(e) => {
                if (!isPending && !success) {
                  e.currentTarget.style.backgroundColor = "#002244";
                }
              }}
              onMouseLeave={(e) => {
                if (!isPending && !success) {
                  e.currentTarget.style.backgroundColor = "#003466";
                }
              }}
            >
              {isPending ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </form>
        </div>
      </div>

      {/* Success Logout Modal */}
      {success && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "#ffffff",
            padding: "2.5rem 2rem",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            width: "100%",
            maxWidth: "400px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#ecfdf5",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <CheckCircle size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#065f46", marginBottom: "0.5rem" }}>
                Đổi mật khẩu thành công!
              </h3>
              <p style={{ color: "#475569", fontSize: "13px", fontFamily: '"Segoe UI", -apple-system, sans-serif', lineHeight: "1.5" }}>
                Mật khẩu của bạn đã được thay đổi. Hệ thống sẽ tự động đăng xuất sau <strong>{countdown}</strong> giây để bạn đăng nhập lại.
              </p>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "8px 16px",
                borderRadius: "4px",
                backgroundColor: "#003466",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                fontFamily: '"Segoe UI", -apple-system, sans-serif',
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#002244";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#003466";
              }}
            >
              Đăng xuất ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
