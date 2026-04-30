"use client";

import { useState, useTransition, useRef } from "react";
import { createUser, updateUser, updateUserStatus, resetPassword } from "./actions";

type User = {
  id: string;
  username: string;
  employeeName: string | null;
  branch: string | null;
  role: string;
  status: string;
  createdAt: string;
};

const ROLES = ["Admin", "Nhân viên kinh doanh", "Trưởng phòng kinh doanh", "Nhân viên thu mua", "Trưởng phòng thu mua", "Trưởng phòng sản xuất", "Trưởng phòng nhân sự", "Nhân viên nhân sự"];

export default function UserTable({ users, activeEmployees, branches, availablePermissions }: { 
  users: any[], 
  activeEmployees: string[], 
  branches: string[],
  availablePermissions: { id: string, name: string }[]
}) {
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setShowModal(false);
    setShowPwModal(false);
    setEditingUser(null);
    setSelectedBranches([]);
    setError(null);
  }

  function handleEdit(user: any) {
    if (user.username === "admin") return;
    setEditingUser(user);
    setSelectedBranches(user.branch ? user.branch.split(",") : []);
    setShowModal(true);
  }

  function handleResetPw(user: any) {
    if (user.username === "admin") return;
    setEditingUser(user);
    setShowPwModal(true);
  }

  function toggleBranch(name: string) {
    setSelectedBranches(prev => 
      prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]
    );
  }

  function handleStatusToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Bạn có chắc chắn muốn ${newStatus === "ACTIVE" ? "kích hoạt" : "hủy kích hoạt"} tài khoản này?`)) return;
    startTransition(async () => {
      try { await updateUserStatus(id, newStatus); } catch (e: any) { alert(e.message); }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("branch", selectedBranches.join(","));
    
    startTransition(async () => {
      try {
        if (editingUser) await updateUser(editingUser.id, formData);
        else await createUser(formData);
        handleClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  function handlePwSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await resetPassword(editingUser.id, formData);
        handleClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Tài khoản</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thêm mới tài khoản</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th>Nhân viên</th>
              <th>Tài khoản</th>
              <th>Chi nhánh</th>
              <th>Mục quyền</th>
              <th>Trạng thái</th>
              <th style={{ width: "180px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{user.employeeName}</td>
                <td>{user.username}</td>
                <td style={{ fontSize: "0.85rem", maxWidth: "200px" }}>{user.branch?.split(",").join(", ")}</td>
                <td><span className="badge badge-warning">{user.permission?.name || "—"}</span></td>
                <td>
                   <span className={`badge ${user.status === "ACTIVE" ? "badge-success" : "badge-danger"}`}>
                     {user.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}
                   </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                    <button onClick={() => handleEdit(user)} className="btn-icon" title="Sửa" disabled={user.username === "admin"}>✏️</button>
                    <button onClick={() => handleResetPw(user)} className="btn-icon" title="Tạo lại mật khẩu" disabled={user.username === "admin"}>🔑</button>
                    {user.username !== "admin" && (
                      user.status === "ACTIVE" 
                        ? <button onClick={() => handleStatusToggle(user.id, user.status)} className="btn-icon" title="Hủy kích hoạt" style={{ color: "#e67e22" }}>🚫</button>
                        : <button onClick={() => handleStatusToggle(user.id, user.status)} className="btn-icon" title="Kích hoạt" style={{ color: "#27ae60" }}>✔️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showModal || showPwModal) && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", margin: "1rem" }}>
            <h3>{showPwModal ? "🔑 Tạo lại mật khẩu" : editingUser ? "✏️ Sửa tài khoản" : "🛡️ Thêm tài khoản"}</h3>
            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}
            
            {showPwModal ? (
              <form onSubmit={handlePwSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <p>Tạo lại mật khẩu cho tài khoản: <strong>{editingUser.username}</strong></p>
                <div>
                  <label>Mật khẩu mới *</label>
                  <input type="password" name="password" className="input" required placeholder="••••••••" />
                </div>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button type="button" className="btn" onClick={handleClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={isPending}>Cập nhật mật khẩu</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label>Nhân viên *</label>
                  <select name="employeeName" className="input" required defaultValue={editingUser?.employeeName ?? ""}>
                    <option value="">-- Chọn nhân viên --</option>
                    {activeEmployees.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label>Tài khoản *</label>
                    <input type="text" name="username" className="input" required defaultValue={editingUser?.username} disabled={!!editingUser} />
                  </div>
                  {!editingUser && (
                    <div>
                      <label>Mật khẩu *</label>
                      <input type="password" name="password" className="input" required />
                    </div>
                  )}
                </div>
                  <div>
                    <label>Mục quyền *</label>
                    <select name="permissionId" className="input" required defaultValue={editingUser?.permissionId ?? ""}>
                      <option value="">-- Chọn mục quyền --</option>
                      {availablePermissions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>Chi nhánh (Chọn nhiều) *</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
                    {branches.map(b => (
                      <button key={b} type="button" 
                        onClick={() => toggleBranch(b)}
                        style={{ padding: "4px 10px", borderRadius: "15px", border: "1px solid", fontSize: "0.8rem", cursor: "pointer",
                          background: selectedBranches.includes(b) ? "#3498db" : "none",
                          color: selectedBranches.includes(b) ? "#fff" : "#888",
                          borderColor: selectedBranches.includes(b) ? "#3498db" : "#ddd"
                        }}>{b}</button>
                    ))}
                    {branches.length === 0 && <span style={{ color: "#888", fontSize: "0.8rem" }}>Chưa có chi nhánh nào</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button type="button" className="btn" onClick={handleClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu lại"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <style>{`
        .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 4px; transition: background 0.2s; }
        .btn-icon:hover:not(:disabled) { background: rgba(0,0,0,0.05); }
        .btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>
    </>
  );
}

