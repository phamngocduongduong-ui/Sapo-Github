"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, getActiveBranches } from "./actions";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [branches, setBranches] = useState<{ id: string; code: string; name: string }[]>([]);

  useEffect(() => {
    getActiveBranches().then(res => {
      setBranches(res);
    });
  }, []);

  return (
    <div className="login-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .login-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          margin: 0;
          padding: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          background-color: #f5f6fa;
        }
        .login-header {
          height: 140px;
          background-image: linear-gradient(rgba(0, 52, 102, 0.6), rgba(0, 52, 102, 0.6)), url('/images/login_banner.png?v=2');
          background-size: 100% 100%;
          background-position: center;
          background-repeat: no-repeat;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          color: white;
          position: relative;
          border-bottom: 4px solid #ff5c00;
          width: 100%;
          margin: 0;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .logo-img {
          width: 75px;
          height: 75px;
          object-fit: contain;
          border-radius: 50%;
          border: 2px solid white;
          background: white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.15);
        }
        .header-titles h1 {
          font-size: 1.45rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
        }
        .header-titles p {
          font-size: 0.9rem;
          margin: 4px 0 0 0;
          opacity: 0.9;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        .header-right {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .header-right-title {
          font-size: 2.1rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: 1.5px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.6);
        }
        .header-right-sub {
          font-size: 0.85rem;
          margin: 4px 0 0 0;
          font-style: italic;
          opacity: 0.85;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        .content-layout {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: calc(100vh - 140px);
          background-color: transparent;
          padding: 2rem;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .login-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.2), 0 12px 12px -5px rgba(0, 0, 0, 0.15);
        }
        .login-card-header {
          background-color: #003466;
          padding: 1rem;
          font-weight: 700;
          font-size: 1.05rem;
          color: #ffffff;
          text-align: center;
          border-bottom: 2px solid #ff5c00;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .login-card-body {
          padding: 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .form-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #003466;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .login-card .input, .login-card .form-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #000000;
          background-color: #ffffff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-card .input:focus, .login-card .form-select:focus {
          outline: none;
          border-color: #2b6cb0;
          box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.15);
        }
        .btn-submit-blue {
          background-color: #003466;
          color: white;
          padding: 9px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          text-align: center;
          transition: background-color 0.2s, transform 0.1s;
          margin-top: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          width: 100%;
        }
        .btn-submit-blue:hover {
          background-color: #002244;
        }
        .btn-submit-blue:active {
          transform: scale(0.98);
        }
        .btn-submit-blue:disabled {
          background-color: #cbd5e1;
          cursor: not-allowed;
        }
        .forgot-password-link {
          display: block;
          font-size: 0.82rem;
          color: #2b6cb0;
          text-decoration: none;
          font-weight: 600;
        }
        .forgot-password-link:hover {
          text-decoration: underline;
        }
        @media (max-width: 768px) {
          .login-header {
            height: auto;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 1.5rem 1rem;
            gap: 1rem;
          }
          .header-left {
            flex-direction: column;
            gap: 0.75rem;
            align-items: center;
          }
          .header-titles h1 {
            font-size: 1.25rem;
            text-align: center;
          }
          .header-titles p {
            font-size: 0.85rem;
            text-align: center;
          }
          .header-right {
            text-align: center;
            margin-top: 0.25rem;
          }
          .header-right-title {
            font-size: 1.6rem;
          }
          .content-layout {
            padding: 1.5rem 1rem;
            height: calc(100vh - 200px);
            min-height: 380px;
          }
          .login-card {
            max-width: 100%;
          }
        }
      ` }} />

      {/* Top Header */}
      <header className="login-header">
        <div className="header-left">
          <img src="/images/sapo_logo.png" alt="Sapo Logo" className="logo-img" />
          <div className="header-titles">
            <h1>HỆ THỐNG QUẢN LÝ SAPO GROUP</h1>
            <p>Chào mừng bạn đến với hệ thống quản lý doanh nghiệp</p>
          </div>
        </div>
        <div className="header-right">
          <div className="header-right-title">SAPO GROUP</div>
          <div className="header-right-sub">Reputation-Quality-Safety</div>
        </div>
      </header>

      {/* Bottom Centered Login Form */}
      <div className="content-layout">
        <div className="login-card">
          <div className="login-card-header">Đăng nhập hệ thống</div>
          <div className="login-card-body">
            {errorParam === "inactive" && (
              <div style={{ background: "rgba(231,76,60,0.1)", color: "#e74c3c", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem", textAlign: "center", border: "1px solid rgba(231,76,60,0.2)", fontWeight: 600 }}>
                ⚠️ Tài khoản của bạn bị tạm khóa.
              </div>
            )}

            {state?.error && (
              <div style={{ background: "rgba(231,76,60,0.1)", color: "#e74c3c", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem", textAlign: "center", border: "1px solid rgba(231,76,60,0.2)", fontWeight: 600 }}>
                ⚠️ {state.error}
              </div>
            )}

            <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label className="form-label">Tài khoản</label>
                <input
                  type="text"
                  name="username"
                  className="input"
                  placeholder="Nhập tài khoản"
                  required
                />
              </div>
              <div>
                <label className="form-label">Mật khẩu</label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="input"
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>

              <div>
                <label className="form-label">Chi nhánh</label>
                <select
                  name="branch"
                  className="form-select"
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

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem", color: "#000000", fontWeight: 600, marginTop: "0.1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input 
                    type="checkbox" 
                    id="show-password" 
                    checked={showPassword} 
                    onChange={() => setShowPassword(!showPassword)}
                    style={{ cursor: "pointer", width: "15px", height: "15px" }}
                  />
                  <label htmlFor="show-password" style={{ cursor: "pointer", userSelect: "none" }}>Hiện mật khẩu</label>
                </div>
                <a href="#" className="forgot-password-link" onClick={(e) => { e.preventDefault(); alert("Vui lòng liên hệ Admin để khôi phục mật khẩu."); }}>Quên mật khẩu?</a>
              </div>

              <SubmitButton />
            </form>
          </div>
        </div>
      </div>

      {/* Floating Zalo Chat Button */}
      <div className="zalo-float" title="Liên hệ hỗ trợ Zalo" onClick={() => alert("Hỗ trợ kỹ thuật qua Zalo chat: 090xxxxxxx")}>
        Zalo
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6fa", color: "#888", fontFamily: "inherit" }}>
        Đang tải...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
