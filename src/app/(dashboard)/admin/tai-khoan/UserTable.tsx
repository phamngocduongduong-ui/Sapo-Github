"use client";

import React, { useState, useTransition } from "react";
import { createUser, updateUser, updateUserStatus, resetPassword, deleteUser } from "./actions";
import HistoryModal from "../../HistoryModal";
import { Clock } from "lucide-react";

type User = {
  id: string;
  username: string;
  employeeName: string | null;
  branch: string | null;
  role: string;
  status: string;
  createdAt: string;
  permission: { id: string, name: string }[];
};


const ROLES = ["Admin", "Nhân viên kinh doanh", "Trưởng phòng kinh doanh", "Nhân viên thu mua", "Trưởng phòng thu mua", "Trưởng phòng sản xuất", "Trưởng phòng nhân sự", "Nhân viên nhân sự"];

export default function UserTable({ users, activeEmployees, branches, availablePermissions }: { 
  users: any[], 
  activeEmployees: string[], 
  branches: string[],
  availablePermissions: { id: string, name: string }[]
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  function handleClose() {
    setShowModal(false);
    setEditingUser(null);
    setSelectedBranches([]);
    setSelectedPermissions([]);
    setError(null);
    setShowPassword(false);
  }

  function handleEdit(user: any) {
    if (user.username === "admin") return;
    if (user.status === "INACTIVE") {
      alert("Không thể sửa tài khoản đang bị ngưng hoạt động.");
      return;
    }
    setEditingUser(user);
    setSelectedBranches(user.branch ? user.branch.split(",") : []);
    setSelectedPermissions(user.permission ? user.permission.map((p: any) => p.id) : []);
    setShowModal(true);
  }

  function handleResetPw(user: any) {
    if (user.username === "admin") return;
    if (user.status === "INACTIVE") {
      alert("Không thể cấp lại mật khẩu cho tài khoản đang bị ngưng hoạt động.");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản "${user.username}" về mặc định (123)?`)) return;
    startTransition(async () => {
      try {
        await resetPassword(user.id);
        alert("Đã đặt lại mật khẩu về 123 thành công.");
      } catch (e: any) { alert(e.message); }
    });
  }

  function handleDelete(user: any) {
    if (user.username === "admin") return;
    if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${user.username}"? Hành động này không thể hoàn tác.`)) return;
    startTransition(async () => {
      try {
        await deleteUser(user.id);
      } catch (e: any) { alert(e.message); }
    });
  }

  function toggleBranch(name: string) {
    setSelectedBranches(prev => 
      prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]
    );
  }

  function togglePermission(id: string) {
    setSelectedPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  function handleStatusToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const msg = newStatus === "ACTIVE" 
      ? "Kích hoạt lại tài khoản này?" 
      : "Hủy kích hoạt tài khoản này? Người dùng sẽ bị đăng xuất ngay lập tức và không thể truy cập hệ thống.";
    
    if (!confirm(msg)) return;
    startTransition(async () => {
      try { await updateUserStatus(id, newStatus); } catch (e: any) { alert(e.message); }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("branch", selectedBranches.join(","));
    formData.append("permissionIds", selectedPermissions.join(","));
    
    startTransition(async () => {
      try {
        if (editingUser) await updateUser(editingUser.id, formData);
        else await createUser(formData);
        handleClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  const existingUserEmployees = users.map(u => u.employeeName);
  const filteredEmployees = activeEmployees.filter(name => !existingUserEmployees.includes(name));

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
              <th style={{ width: "450px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{user.employeeName}</td>
                <td>{user.username}</td>
                <td style={{ fontSize: "0.85rem", maxWidth: "200px" }}>
                  {user.username === "admin" ? (
                    <span style={{ color: "var(--primary-color)", fontWeight: 600 }}>🌍 Toàn bộ chi nhánh</span>
                  ) : (
                    user.branch?.split(",").join(", ") || "—"
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
                    {(user as any).permission?.length > 0 ? (
                      (user as any).permission.map((p: any) => (
                        <span key={p.id} className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{p.name}</span>
                      ))
                    ) : (
                      "—"
                    )}
                  </div>
                </td>
                <td>
                   <span className={`badge ${user.status === "ACTIVE" ? "badge-success" : "badge-danger"}`}>
                     {user.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}
                   </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                    <button 
                      onClick={() => handleEdit(user)} 
                      className="btn btn-sm btn-outline" 
                      disabled={user.username === "admin" || user.status === "INACTIVE"}
                    >
                      Sửa
                    </button>
                    <button 
                      onClick={() => handleResetPw(user)} 
                      className="btn btn-sm btn-outline" 
                      disabled={user.username === "admin" || user.status === "INACTIVE"}
                    >
                      Cấp lại MK
                    </button>
                    {user.username !== "admin" && (
                      user.status === "ACTIVE" 
                        ? <button onClick={() => handleStatusToggle(user.id, user.status)} className="btn btn-sm btn-danger">Hủy kích hoạt</button>
                        : <button onClick={() => handleStatusToggle(user.id, user.status)} className="btn btn-sm btn-success">Kích hoạt</button>
                    )}
                    {user.username !== "admin" && (
                      <button 
                        onClick={() => handleDelete(user)} 
                        className="btn btn-sm btn-outline" 
                        style={{ color: "#c0392b", borderColor: "#c0392b" }}
                      >
                        Xóa
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => setHistoryRecordId(user.id)}
                      title="Lịch sử thay đổi"
                    >
                      Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="User" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {showModal && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", margin: "1rem" }}>
            <h3>{editingUser ? "✏️ Sửa tài khoản" : "🛡️ Thêm tài khoản"}</h3>
            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label>Nhân viên *</label>
                <select name="employeeName" className="input" required defaultValue={editingUser?.employeeName ?? ""} disabled={!!editingUser}>
                  {editingUser ? (
                    <option value={editingUser.employeeName}>{editingUser.employeeName}</option>
                  ) : (
                    <>
                      <option value="">-- Chọn nhân viên (Chỉ hiện người chưa có TK) --</option>
                      {filteredEmployees.map(name => <option key={name} value={name}>{name}</option>)}
                    </>
                  )}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label>Tài khoản *</label>
                  <input type="text" name="username" className="input" required defaultValue={editingUser?.username ?? ""} disabled={!!editingUser} placeholder="Nhập tài khoản" />
                </div>
                {!editingUser && (
                  <div>
                    <label>Mật khẩu *</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        name="password" 
                        className="input" 
                        required 
                        defaultValue="123" 
                        style={{ paddingRight: "40px" }}
                      />
                      <div style={{ position: "absolute", right: "10px", display: "flex", alignItems: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={showPassword} 
                          onChange={() => setShowPassword(!showPassword)}
                          title="Hiện mật khẩu"
                          style={{ cursor: "pointer" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>Mục quyền (Chọn nhiều) *</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
                    {availablePermissions.map(p => (
                      <button key={p.id} type="button" 
                        onClick={() => togglePermission(p.id)}
                        style={{ padding: "4px 10px", borderRadius: "15px", border: "1px solid", fontSize: "0.8rem", cursor: "pointer",
                          background: selectedPermissions.includes(p.id) ? "#f39c12" : "none",
                          color: selectedPermissions.includes(p.id) ? "#fff" : "#888",
                          borderColor: selectedPermissions.includes(p.id) ? "#f39c12" : "#ddd"
                        }}>{p.name}</button>
                    ))}
                    {availablePermissions.length === 0 && <span style={{ color: "#888", fontSize: "0.8rem" }}>Chưa có mục quyền nào</span>}
                  </div>
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

