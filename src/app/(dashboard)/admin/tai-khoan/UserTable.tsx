"use client";

import React, { useState, useTransition } from "react";
import { createUser, updateUser, updateUserStatus, resetPassword, deleteUser, approveDeviceChange, rejectDeviceChange, resetUserDevice } from "./actions";
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
  deviceSecret: string | null;
  pendingDeviceSecret: string | null;
  deviceStatus: string;
  deviceChangeReason?: string | null;
  deviceInfo?: string | null;
  accessSource?: string | null;
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = users.find(u => u.id === selectedUserId);

  function handleClose() {
    setShowModal(false);
    setEditingUser(null);
    setSelectedBranches([]);
    setSelectedPermissions([]);
    setError(null);
    setShowPassword(false);
    setSelectedUserId(null);
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

  function handleApproveDevice(user: any) {
    if (!confirm(`Bạn có chắc chắn muốn PHÊ DUYỆT thiết bị mới cho tài khoản "${user.username}"?`)) return;
    startTransition(async () => {
      try {
        await approveDeviceChange(user.id);
        alert("Đã duyệt thiết bị mới thành công.");
      } catch (e: any) {
        alert(e.message || "Có lỗi xảy ra");
      }
    });
  }

  function handleRejectDevice(user: any) {
    if (!confirm(`Bạn có chắc chắn muốn TỪ CHỐI yêu cầu đổi thiết bị của tài khoản "${user.username}"?`)) return;
    startTransition(async () => {
      try {
        await rejectDeviceChange(user.id);
        alert("Đã từ chối yêu cầu đổi thiết bị.");
      } catch (e: any) {
        alert(e.message || "Có lỗi xảy ra");
      }
    });
  }

  function handleResetDevice(user: any) {
    if (!confirm(`Bạn có chắc chắn muốn RESET liên kết thiết bị của tài khoản "${user.username}"? Nhân viên sẽ có thể đăng ký thiết bị mới ở lần chấm công tiếp theo.`)) return;
    startTransition(async () => {
      try {
        await resetUserDevice(user.id);
        alert("Đã xóa liên kết thiết bị thành công.");
      } catch (e: any) {
        alert(e.message || "Có lỗi xảy ra");
      }
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
    <div className="user-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .user-page-container {
          width: 100%;
          min-width: 0;
        }
        .user-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .user-layout input,
        .user-layout select,
        .user-layout textarea,
        .user-layout button,
        .user-layout table,
        .user-layout td,
        .user-layout th,
        .user-layout label,
        .user-layout .badge,
        .user-layout .blue-panel-header,
        .user-page-container .breadcrumb-banner {
          font-size: 13px !important;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          display: block;
          border-radius: 0 !important;
          margin-top: 0;
          margin-left: -10px;
          margin-right: -10px;
        }
        .panel-full {
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 5px 0px 10px 0px;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          border-radius: 4px;
          font-weight: 400;
          font-size: 13px !important;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn:active {
          transform: scale(0.98);
        }
        .sapo-btn:disabled {
          background-color: #cbd5e1 !important;
          color: #94a3b8 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }
        .sapo-btn-danger {
          background-color: #ef4444;
        }
        .sapo-btn-danger:hover {
          background-color: #dc2626;
        }
        .sapo-btn-success {
          background-color: #22c55e;
        }
        .sapo-btn-success:hover {
          background-color: #16a34a;
        }
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .row-selected {
          background-color: #f0f7ff !important;
        }
        .row-selected td {
          background-color: #f0f7ff !important;
          border-top: 1px solid #b9d5f0 !important;
          border-bottom: 1px solid #b9d5f0 !important;
        }
        .row-selected td:first-child {
          border-left: 6px solid #003466 !important;
        }
        .row-selected td:last-child {
          border-right: 1px solid #b9d5f0 !important;
        }
        .base-table-wrapper {
          max-height: 485px !important;
          height: auto !important;
          overflow-y: auto !important;
          overflow-x: auto !important;
          padding-bottom: 60px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          table-layout: auto !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          text-align: center !important;
          height: 35px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .base-table td {
          padding: 6px 0.75rem !important;
          vertical-align: middle !important;
          white-space: normal !important;
          word-break: break-word !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .base-table .status-pill {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-radius: 0 !important;
        }
        .base-table .status-pill.status-active {
          color: #166534 !important;
        }
        .base-table .status-pill.status-inactive {
          color: #dc2626 !important;
        }

        .filter-label { display: block; margin-bottom: 0.4rem; font-size: 0.85rem; font-weight: 700; color: #003466; text-transform: uppercase; }
        
        .custom-modal-overlay .input {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 7px 12px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          width: 100%;
        }
        .custom-modal-overlay .input:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay select.input {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 7px 12px !important;
          height: 36px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          width: 100%;
        }
        .custom-modal-overlay select.input:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .mobile-list {
          display: none !important;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            padding-bottom: 80px !important;
            margin-top: 10px !important;
            width: 100% !important;
          }
          .proposal-card {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 10px 14px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            user-select: none !important;
          }
          .proposal-card:hover {
            background: #f8fafc !important;
          }
          .proposal-card.selected {
            border: 1px solid #b9d5f0 !important;
            border-left: 6px solid #003466 !important;
            background-color: #f0f7ff !important;
            box-shadow: 0 4px 6px -1px rgba(0, 52, 102, 0.08) !important;
          }
          .card-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .card-header {
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 5px !important;
            margin-bottom: 6px !important;
          }
          .code-box {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }
          .idx-pill {
            background: #f1f5f9 !important;
            color: #475569 !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          .proposal-code {
            font-size: 14px !important;
            font-weight: 700 !important;
            color: #0f172a !important;
          }
          .card-body {
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
          }
          .info-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            font-size: 12px !important;
          }
          .info-label {
            color: #64748b !important;
            font-weight: 500 !important;
          }
          .info-val {
            color: #000 !important;
            font-weight: 600 !important;
            text-align: right !important;
          }
          .info-val.highlight {
            color: #ff5c00 !important;
          }
        }
      `
      }} />

      <div className="breadcrumb-banner">
        QUẢN LÝ TÀI KHOẢN
      </div>

      <div className="user-layout">
        <div className="panel-full">
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center" }}>
            <button
              type="button"
              className="sapo-btn"
              onClick={() => setShowModal(true)}
            >
              Thêm mới
            </button>

            {selectedUser && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  disabled={selectedUser.username === "admin" || selectedUser.status === "INACTIVE"}
                  onClick={() => handleEdit(selectedUser)}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  className="sapo-btn"
                  disabled={selectedUser.username === "admin" || selectedUser.status === "INACTIVE"}
                  onClick={() => handleResetPw(selectedUser)}
                >
                  Cấp lại MK
                </button>
                {selectedUser.username !== "admin" && (
                  selectedUser.status === "ACTIVE" ? (
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-danger"
                      onClick={() => handleStatusToggle(selectedUser.id, selectedUser.status)}
                    >
                      Hủy kích hoạt
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="sapo-btn"
                      onClick={() => handleStatusToggle(selectedUser.id, selectedUser.status)}
                    >
                      Kích hoạt
                    </button>
                  )
                )}
                {selectedUser.username !== "admin" && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    onClick={() => handleDelete(selectedUser)}
                  >
                    Xóa
                  </button>
                )}
                {selectedUser.username !== "admin" && (selectedUser.deviceSecret || selectedUser.deviceStatus === "PENDING") && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-secondary"
                    onClick={() => handleResetDevice(selectedUser)}
                    disabled={isPending}
                  >
                    Reset thiết bị
                  </button>
                )}
                {selectedUser.username !== "admin" && selectedUser.deviceStatus === "PENDING" && (
                  <>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-success"
                      onClick={() => handleApproveDevice(selectedUser)}
                      disabled={isPending}
                    >
                      Duyệt thiết bị mới
                    </button>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-danger"
                      onClick={() => handleRejectDevice(selectedUser)}
                      disabled={isPending}
                    >
                      Từ chối thiết bị mới
                    </button>
                  </>
                )}
              </>
            )}


          </div>

          {selectedUser && selectedUser.deviceStatus === "PENDING" && (
            <div style={{
              width: "100%",
              margin: "8px 0 12px 0",
              padding: "12px 16px",
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px"
            }}>
              <div style={{ fontWeight: 700, color: "#b45309", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚠️ CHI TIẾT YÊU CẦU ĐỔI THIẾT BỊ:</span>
                <span style={{ color: "#000" }}>{selectedUser.employeeName || selectedUser.username}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", background: "#ffffff", padding: "10px 14px", borderRadius: "6px", border: "1px solid #fef3c7" }}>
                <div>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>📝 Lý do thay đổi:</span>{" "}
                  <strong style={{ color: "#dc2626" }}>{selectedUser.deviceChangeReason || "Chưa nhập lý do"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>📱 Máy & Trình duyệt:</span>{" "}
                  <strong style={{ color: "#003466" }}>{selectedUser.deviceInfo || "Không xác định"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>🔗 Nguồn kết nối:</span>{" "}
                  <strong style={{ color: "#059669" }}>{selectedUser.accessSource || "Web trực tiếp"}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="base-table-wrapper desktop-only">
            <table className="base-table">
              <thead>
                <tr>
                  <th className="th-first nowrap" style={{ width: "50px", textAlign: "center" }}>STT</th>
                  <th>Nhân viên</th>
                  <th>Tài khoản</th>
                  <th>Chi nhánh</th>
                  <th>Mục quyền</th>
                  <th>Thiết bị</th>
                  <th className="th-last nowrap">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                    title="Nhấp để chọn tài khoản"
                    className={`row-hoverable ${selectedUserId === user.id ? "row-selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: "#000", textAlign: "center" }}>{user.employeeName || "—"}</td>
                    <td style={{ color: "#000", textAlign: "center", fontWeight: 600 }}>{user.username}</td>
                    <td style={{ fontSize: "0.85rem", maxWidth: "250px", color: "#000", textAlign: "center" }}>
                      {user.username === "admin" ? (
                        <span style={{ color: "var(--primary-color)", fontWeight: 600 }}>🌍 Toàn bộ chi nhánh</span>
                      ) : (
                        user.branch?.split(",").join(", ") || "—"
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", justifyContent: "center" }}>
                        {user.permission?.length > 0 ? (
                          user.permission.map((p: any) => (
                            <span key={p.id} className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{p.name}</span>
                          ))
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {user.username === "admin" ? (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      ) : !user.deviceSecret ? (
                        <span className="badge badge-secondary" style={{ fontSize: "0.75rem", padding: "2px 6px", background: "#cbd5e1", color: "#475569" }}>Chưa liên kết</span>
                      ) : user.deviceStatus === "PENDING" ? (
                        <span className="badge badge-warning" style={{ fontSize: "0.75rem", padding: "2px 6px", background: "#fef3c7", color: "#d97706", fontWeight: "700" }}>Đợi duyệt đổi máy</span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: "0.75rem", padding: "2px 6px", background: "#dcfce7", color: "#15803d" }}>Đã liên kết</span>
                      )}
                    </td>
                    <td className="nowrap" style={{ textAlign: "center" }}>
                      <span className={`status-pill ${user.status === "ACTIVE" ? "status-active" : "status-inactive"}`}>
                        {user.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#000", fontWeight: 600 }}>
                      Chưa có tài khoản nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-list">
            {users.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", background: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                Chưa có tài khoản nào.
              </div>
            ) : (
              users.map((user, idx) => {
                const isSelected = selectedUserId === user.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                    className={`proposal-card ${isSelected ? "selected" : ""}`}
                  >
                    {/* Header: STT, Username and Status */}
                    <div className="card-row card-header">
                      <div className="code-box">
                        <span className="idx-pill">#{idx + 1}</span>
                        <span className="proposal-code">{user.username}</span>
                      </div>
                      <span className={`status-pill ${user.status === "ACTIVE" ? "status-active" : "status-inactive"}`} style={{ fontWeight: 600 }}>
                        {user.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="card-body">
                      <div className="info-row">
                        <span className="info-label">Nhân viên:</span>
                        <span className="info-val" style={{ fontWeight: 700 }}>{user.employeeName || "—"}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Chi nhánh:</span>
                        <span className="info-val">
                          {user.username === "admin" ? (
                            <span style={{ color: "#ff5c00", fontWeight: 700 }}>🌍 Toàn bộ chi nhánh</span>
                          ) : (
                            user.branch?.split(",").join(", ") || "—"
                          )}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Thiết bị:</span>
                        <span className="info-val">
                          {user.username === "admin" ? (
                            "—"
                          ) : !user.deviceSecret ? (
                            <span className="badge badge-secondary" style={{ fontSize: "0.75rem", padding: "2px 6px", background: "#cbd5e1", color: "#475569" }}>Chưa liên kết</span>
                          ) : user.deviceStatus === "PENDING" ? (
                            <span className="badge badge-warning" style={{ fontSize: "0.75rem", padding: "2px 6px", background: "#fef3c7", color: "#d97706", fontWeight: "700" }}>Đợi duyệt đổi máy</span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: "0.75rem", padding: "2px 6px", background: "#dcfce7", color: "#15803d" }}>Đã liên kết</span>
                          )}
                        </span>
                      </div>
                      <div className="info-row" style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                        <span className="info-label">Mục quyền:</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", marginTop: "2px" }}>
                          {user.permission?.length > 0 ? (
                            user.permission.map((p: any) => (
                              <span key={p.id} className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{p.name}</span>
                            ))
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>



      {showModal && (
        <div className="custom-modal-overlay">
          <div
            className="user-modal-card"
            style={{
              width: "95%",
              maxWidth: "800px",
              maxHeight: "90%",
              height: "480px",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden"
            }}
          >
            {/* Sticky Header */}
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              {editingUser ? "✏️ Sửa tài khoản" : "🛡️ Thêm tài khoản"}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              {/* Scrollable Form Body Container */}
              <div className="scrollable-body" style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: "16px 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {error && <div style={{ color: "#e74c3c", fontSize: "13px" }}>⚠️ {error}</div>}
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="filter-label">Nhân viên *</label>
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
                  <div style={{ display: "grid", gridTemplateColumns: editingUser ? "1fr" : "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label className="filter-label">Tài khoản *</label>
                      <input type="text" name="username" className="input" required defaultValue={editingUser?.username ?? ""} disabled={!!editingUser} placeholder="Nhập tài khoản" />
                    </div>
                    {!editingUser && (
                      <div>
                        <label className="filter-label">Mật khẩu *</label>
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
                </div>

                <div>
                  <label className="filter-label" style={{ display: "block", marginBottom: "0.5rem" }}>Mục quyền (Chọn nhiều) *</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "8px", maxHeight: "145px", overflowY: "auto" }}>
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
                  <label className="filter-label" style={{ display: "block", marginBottom: "0.5rem" }}>Chi nhánh (Chọn nhiều) *</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "8px", maxHeight: "145px", overflowY: "auto" }}>
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
              </div>

              {/* Sticky Action Footer */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  borderTop: "1px solid #eee",
                  padding: "12px 24px",
                  background: "#fff",
                  borderBottomLeftRadius: "16px",
                  borderBottomRightRadius: "16px",
                }}
              >
                <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>Hủy</button>
                <button type="submit" className="sapo-btn" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu lại"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

