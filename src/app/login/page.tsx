"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, getActiveBranches } from "./actions";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn, Eye, EyeOff } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-submit-blue">
      {pending ? "Đang xử lý..." : "Đăng nhập"}
    </button>
  );
}

function LoginContent() {
  const [state, formAction] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [branches, setBranches] = useState<{ id: string; code: string; name: string }[]>([
    { id: "1", code: "HCM", name: "Hồ Chí Minh" },
    { id: "2", code: "HN", name: "Hà Nội" },
    { id: "3", code: "DT", name: "Đồng Tháp" }
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      setIsMobileDevice(mobile);
    }
    fetch("/api/branches")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setBranches(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch branches from API:", err);
      });
  }, []);

  return (
    <div className="login-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .login-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          margin: 0;
          padding: 16px 20px;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
          background-color: #ffffff;
        }
        .login-box {
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 auto;
          transform: translateY(-24px);
        }
        .icon-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
          margin-bottom: 16px;
        }
        .login-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 24px 0;
          text-align: center;
          letter-spacing: -0.2px;
        }
        .form-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .input-group {
          position: relative;
          width: 100%;
        }
        .input-field, .select-field {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 400;
          color: #0f172a;
          background-color: #ffffff;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .select-field {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 16px;
          padding-right: 36px;
          cursor: pointer;
        }
        .input-field:focus, .select-field:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .input-field::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }
        .toggle-pwd-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
        }
        .toggle-pwd-btn:hover {
          color: #64748b;
        }
        .btn-submit-blue {
          width: 100%;
          height: 42px;
          background: #2563eb;
          color: #ffffff;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14.5px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, transform 0.1s;
          margin-top: 2px;
        }
        .btn-submit-blue:hover {
          background: #1d4ed8;
        }
        .btn-submit-blue:active {
          transform: scale(0.99);
        }
        .btn-submit-blue:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }
        .forgot-password-link {
          margin-top: 20px;
          font-size: 14px;
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
          text-align: center;
        }
        .forgot-password-link:hover {
          text-decoration: underline;
        }
      ` }} />

      <div className="login-box">
        {/* Centered LogIn Icon Avatar */}
        <div className="icon-avatar">
          <LogIn size={34} color="#ffffff" strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h1 className="login-title">Đăng nhập hệ thống EMS</h1>

        {/* Error Notifications */}
        {errorParam === "inactive" && (
          <div style={{ width: "100%", background: "#fef2f2", color: "#ef4444", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", textAlign: "center", border: "1px solid #fee2e2", fontWeight: 600, marginBottom: "16px" }}>
            ⚠️ Tài khoản của bạn bị tạm khóa.
          </div>
        )}

        {errorParam === "perm_changed" && (
          <div style={{ width: "100%", background: "#eff6ff", color: "#1d4ed8", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", textAlign: "center", border: "1px solid #dbeafe", fontWeight: 600, marginBottom: "16px" }}>
            ℹ️ Phân quyền tài khoản đã được điều chỉnh. Vui lòng đăng nhập lại.
          </div>
        )}

        {state?.error && (
          <div style={{ width: "100%", background: "#fef2f2", color: "#ef4444", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", textAlign: "center", border: "1px solid #fee2e2", fontWeight: 600, marginBottom: "16px" }}>
            ⚠️ {state.error}
          </div>
        )}

        {/* Login Form */}
        <form action={formAction} className="form-wrapper">
          <input type="hidden" name="isMobile" value={isMobileDevice ? "true" : "false"} />
          {/* Tên đăng nhập / Email */}
          <div className="input-group">
            <input
              type="text"
              name="username"
              className="input-field"
              placeholder="Tên đăng nhập / Email"
              required
            />
          </div>

          {/* Mật khẩu */}
          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              className="input-field"
              placeholder="Mật khẩu"
              style={{ paddingRight: "42px" }}
              required
            />
            <button
              type="button"
              className="toggle-pwd-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Chọn Chi nhánh hoạt động (Bản gốc) */}
          <div className="input-group">
            <select
              name="branch"
              className="select-field"
              required
            >
              {branches.length === 0 ? (
                <option value="">Đang tải chi nhánh...</option>
              ) : (
                branches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Submit Button */}
          <SubmitButton />
        </form>

        {/* Quên mật khẩu */}
        <a 
          href="#" 
          className="forgot-password-link" 
          onClick={(e) => { e.preventDefault(); alert("Vui lòng liên hệ Admin để khôi phục mật khẩu."); }}
        >
          Quên mật khẩu?
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", color: "#64748b", fontFamily: "inherit" }}>
        Đang tải...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
