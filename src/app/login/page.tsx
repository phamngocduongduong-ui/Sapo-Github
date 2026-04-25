"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";
import { useState } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
      {pending ? "Đang xử lý..." : "Đăng nhập"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6fa" }}>
      <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "2.5rem" }}>
        <h1 style={{ textAlign: "center", marginBottom: "0.5rem", fontSize: "1.75rem", color: "#2c3e50" }}>Chào mừng trở lại</h1>
        <p style={{ textAlign: "center", color: "#888", marginBottom: "2rem" }}>Đăng nhập để vào hệ thống EMS</p>

        {state?.error && (
          <div style={{ background: "rgba(231,76,60,0.1)", color: "#e74c3c", padding: "0.75rem", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "0.9rem", textAlign: "center", border: "1px solid rgba(231,76,60,0.2)" }}>
            ⚠️ {state.error}
          </div>
        )}

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Tài khoản</label>
            <input
              type="text"
              name="username"
              className="input"
              placeholder="Nhập tài khoản"
              required
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Mật khẩu</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              className="input"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
            <input 
              type="checkbox" 
              id="show-password" 
              checked={showPassword} 
              onChange={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer" }}
            />
            <label htmlFor="show-password" style={{ cursor: "pointer", userSelect: "none" }}>Hiện mật khẩu</label>
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
