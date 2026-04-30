"use client";

import { useState, useTransition } from "react";
import { createPermission, updatePermission, updatePermissionStatus } from "./actions";

type Permission = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: Date;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  ACTIVE: { label: "Sử dụng", badge: "badge-success" },
  INACTIVE: { label: "Ngưng sử dụng", badge: "badge-danger" },
};

export default function PermissionTable({ initialPermissions }: { initialPermissions: Permission[] }) {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Permission | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setShowModal(false);
    setEditingItem(null);
    setError(null);
  }

  function handleEdit(item: Permission) {
    setEditingItem(item);
    setShowModal(true);
  }

  function handleStatusUpdate(id: string, newStatus: string) {
    const actionName = newStatus === "ACTIVE" ? "kích hoạt" : "hủy kích hoạt";
    if (!confirm(`Bạn có chắc chắn muốn ${actionName} quyền này?`)) return;
    startTransition(async () => {
      try {
        await updatePermissionStatus(id, newStatus);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingItem) {
          await updatePermission(editingItem.id, formData);
        } else {
          await createPermission(formData);
        }
        handleClose();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh mục Mục quyền</h3>
        <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>+ Thêm mới quyền</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px" }}>STT</th>
              <th>Mã quyền</th>
              <th>Tên quyền</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialPermissions.map((item, idx) => {
              const st = STATUS_MAP[item.status] ?? { label: item.status, badge: "badge-warning" };
              return (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                      <button className="btn btn-sm" onClick={() => handleEdit(item)} style={{ background: "#f39c12", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Sửa</button>
                      
                      {item.status === "ACTIVE" ? (
                        <button className="btn btn-sm" onClick={() => handleStatusUpdate(item.id, "INACTIVE")} style={{ background: "#e74c3c", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Hủy kích hoạt</button>
                      ) : (
                        <button className="btn btn-sm" onClick={() => handleStatusUpdate(item.id, "ACTIVE")} style={{ background: "#27ae60", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Kích hoạt</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", margin: "1rem" }}>
            <h3>{editingItem ? "✏️ Sửa Mục quyền" : "🛡️ Thêm Mục quyền mới"}</h3>
            {error && <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label>Mã quyền *</label>
                <input type="text" name="code" className="input" defaultValue={editingItem?.code} disabled={!!editingItem} required />
              </div>
              <div>
                <label>Tên quyền *</label>
                <input type="text" name="name" className="input" defaultValue={editingItem?.name} required />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn" onClick={handleClose}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Đang lưu..." : "💾 Lưu thông tin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
