"use client";
import React, { useState, useTransition, useEffect } from "react";
import { createPermission, updatePermission, updatePermissionStatus, deletePermission } from "./actions";

type Permission = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: Date;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  ACTIVE: { label: "Hoạt động", badge: "badge-success" },
  INACTIVE: { label: "Ngưng hoạt động", badge: "badge-danger" },
};

export default function PermissionTable({ initialPermissions }: { initialPermissions: Permission[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [selectedPermId, setSelectedPermId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  useEffect(() => {
    fetch("/api/user-permissions")
      .then(res => res.json())
      .then(data => setIsAdmin(data.isAdmin || false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const selectedPerm = initialPermissions.find(p => p.id === selectedPermId);
  const selectedStatus = selectedPerm?.status;
  const isSystemAdminPerm = selectedPerm?.code.toUpperCase() === "ADMIN";

  async function handleEdit(perm: Permission) {
    setSelectedPermId(perm.id);
    setFormCode(perm.code);
    setFormName(perm.name);
    setIsEditing(true);
    setIsViewOnly(false);
    setError(null);
    setSuccess(null);
  }

  function handleResetForm() {
    setSelectedPermId(null);
    setFormCode("");
    setFormName("");
    setIsEditing(false);
    setIsViewOnly(false);
    setError(null);
  }

  function handleStatusUpdate(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái mục quyền này?`)) return;
    startTransition(async () => {
      try {
        await updatePermissionStatus(id, newStatus);
        setSuccess("Cập nhật trạng thái thành công!");
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa mục quyền này?")) return;
    startTransition(async () => {
      try {
        await deletePermission(id);
        setSuccess("Xóa mục quyền thành công!");
        handleResetForm();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!formCode.trim() || !formName.trim()) {
      setError("Mã và tên mục quyền là bắt buộc.");
      return;
    }

    const formData = new FormData();
    formData.append("code", formCode.trim());
    formData.append("name", formName.trim());
    formData.append("detailKeys", "");

    startTransition(async () => {
      try {
        if (isEditing && selectedPermId) {
          await updatePermission(selectedPermId, formData);
          setSuccess("Cập nhật thông tin mục quyền thành công!");
          handleResetForm();
        } else {
          await createPermission(formData);
          setSuccess("Thêm mục quyền mới thành công!");
          handleResetForm();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  const filteredPerms = initialPermissions;

  return (
    <div className="permission-page-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .permission-page-container {
          width: 100%;
        }
        .permission-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .permission-layout input,
        .permission-layout select,
        .permission-layout textarea,
        .permission-layout button,
        .permission-layout table,
        .permission-layout td,
        .permission-layout th,
        .permission-layout label,
        .permission-layout .badge,
        .permission-layout .blue-panel-header,
        .permission-page-container .breadcrumb-banner {
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
        .panel-left {
          flex: 1 1 60%;
          min-width: 300px;
        }
        .panel-right {
          flex: 0 0 35%;
          min-width: 320px;
        }
        @media (max-width: 1024px) {
          .permission-layout {
            flex-direction: column;
          }
          .panel-right {
            flex: 1 1 100%;
          }
        }
        .blue-panel {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        .blue-panel-header {
          background-color: #003466;
          color: #ffffff;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #ff5c00;
        }
        .blue-panel-body {
          padding: 10px;
        }
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 5px 0px 10px 0px;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .form-btn-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
          padding-bottom: 15px;
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
          font-size: 0.85rem;
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
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .sapo-btn-success {
          background-color: #22c55e;
        }
        .sapo-btn-success:hover {
          background-color: #16a34a;
        }
        .sapo-btn-warning {
          background-color: #f59e0b;
        }
        .sapo-btn-warning:hover {
          background-color: #d97706;
        }
        .sapo-btn-danger {
          background-color: #ef4444;
        }
        .sapo-btn-danger:hover {
          background-color: #dc2626;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }
        .form-group label {
          font-weight: 700;
          font-size: 0.85rem;
          color: #003466;
          text-transform: uppercase;
        }
        .form-group input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .form-group input:focus {
          outline: none;
          border-color: #ff5c00;
          box-shadow: 0 0 0 3px rgba(255, 92, 0, 0.15);
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
          cursor: pointer;
        }
        .required-star {
          color: #ef4444;
          font-weight: bold;
        }
        .form-desc {
          font-size: 0.8rem;
          font-style: italic;
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .table th,
        .table td {
          text-align: center !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .table-container {
          margin-left: 0px;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          width: 100%;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
        }
        .table-container::-webkit-scrollbar {
          height: 6px;
        }
        .table-container::-webkit-scrollbar-track {
          background: #f7fafc;
        }
        .table-container::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
        }
        .badge {
          font-size: 13px !important;
          font-weight: 700 !important;
          display: inline-block;
          background-color: transparent !important;
          padding: 0 !important;
        }
        .badge-success {
          background-color: transparent !important;
          color: #22c55e !important;
        }
        .badge-danger {
          background-color: transparent !important;
          color: #ef4444 !important;
        }
      ` }} />

      <div className="breadcrumb-banner">
        QUẢN LÝ MỤC QUYỀN
      </div>

      <div className="permission-layout">
        {/* Left Panel: List */}
        <div className="panel-left">
          <div className="blue-panel">
            <div className="blue-panel-header">Danh sách Mục quyền</div>
            <div className="blue-panel-body">
              
              <div className="search-container">
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <button 
                    type="button" 
                    className="sapo-btn" 
                    onClick={handleResetForm}
                  >
                    Tạo mới
                  </button>

                  {selectedPermId && selectedStatus === "INACTIVE" && (
                    <button 
                      type="button" 
                      className="sapo-btn" 
                      onClick={() => handleStatusUpdate(selectedPermId, "ACTIVE")}
                      disabled={isPending}
                    >
                      Kích hoạt
                    </button>
                  )}

                  {selectedPermId && selectedStatus === "ACTIVE" && (
                    <button 
                      type="button" 
                      className="sapo-btn" 
                      onClick={() => handleStatusUpdate(selectedPermId, "INACTIVE")}
                      disabled={isPending || isSystemAdminPerm}
                      title={isSystemAdminPerm ? "Không thể ngưng hoạt động mục quyền ADMIN" : ""}
                    >
                      Ngưng kích hoạt
                    </button>
                  )}

                  {selectedPermId && isAdmin && (
                    <button 
                      type="button" 
                      className="sapo-btn sapo-btn-danger" 
                      onClick={() => handleDelete(selectedPermId)}
                      disabled={isPending || isSystemAdminPerm}
                      title={isSystemAdminPerm ? "Không thể xóa mục quyền ADMIN" : ""}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px", textAlign: "center", textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>STT</th>
                      <th style={{ textAlign: "center", textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>Mã mục quyền</th>
                      <th style={{ textAlign: "center", textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>Tên mục quyền</th>
                      <th style={{ textAlign: "center", textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPerms.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "#888", padding: "2rem" }}>
                          Không tìm thấy mục quyền nào
                        </td>
                      </tr>
                    ) : (
                      filteredPerms.map((perm, idx) => {
                        const st = STATUS_MAP[perm.status] ?? { label: perm.status, badge: "badge-warning" };
                        const isSelected = selectedPermId === perm.id;
                        return (
                          <tr 
                            key={perm.id} 
                            className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                            onClick={() => handleEdit(perm)}
                          >
                            <td style={{ textAlign: "center" }}>{idx + 1}</td>
                            <td style={{ fontWeight: 700, color: "#003466" }}>{perm.code}</td>
                            <td>{perm.name}</td>
                            <td style={{ textAlign: "center" }}>
                              <span className={`badge ${st.badge}`}>{st.label}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

        {/* Right Panel: Form */}
        <div className="panel-right">
          <div className="blue-panel">
            <div className="blue-panel-header">
              {isViewOnly ? "Chi tiết Mục quyền" : (isEditing ? "Sửa Mục quyền" : "Thêm Mục quyền")}
            </div>
            <div className="blue-panel-body">

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>
                    Mã mục quyền <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="code" 
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    disabled={isViewOnly || isEditing} 
                    placeholder="Ví dụ: QUYEN_ADMIN"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>
                    Tên mục quyền <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={isViewOnly || isSystemAdminPerm} 
                    placeholder="Ví dụ: Quyền quản trị hệ thống"
                    required 
                  />
                </div>



                <div className="form-desc">
                  (*) Các trường có dấu sao đỏ là bắt buộc nhập.
                </div>

                <div className="form-btn-group">
                  {!isViewOnly && (
                    <button type="submit" className="sapo-btn" disabled={isPending || isSystemAdminPerm}>
                      {isPending ? "Đang lưu..." : "Lưu thông tin"}
                    </button>
                  )}
                  
                  <button 
                    type="button" 
                    className="sapo-btn sapo-btn-secondary" 
                    onClick={handleResetForm}
                  >
                    Làm mới
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {(success || error) && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          zIndex: 9999,
          pointerEvents: "none"
        }}>
          {success && (
            <div style={{
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              padding: "0.75rem 1.25rem",
              borderRadius: "6px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              pointerEvents: "auto",
              marginBottom: "10px",
              minWidth: "250px"
            }}>
              <span>✅</span>
              <div>{success}</div>
            </div>
          )}
          {error && (
            <div style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              padding: "0.75rem 1.25rem",
              borderRadius: "6px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              pointerEvents: "auto",
              marginBottom: "10px",
              minWidth: "250px"
            }}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
