"use client";

import { useState, useTransition, useRef } from "react";
import { createBranch, updateBranch } from "./actions";

type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  status: string;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  ACTIVE:   { label: "Hoạt động",     badge: "badge-success" },
  INACTIVE: { label: "Ngừng sử dụng", badge: "badge-danger" },
};

export default function BranchTable({ initialBranches }: { initialBranches: Branch[] }) {
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleClose() {
    setShowModal(false);
    setEditingBranch(null);
    setError(null);
    formRef.current?.reset();
  }

  function handleEdit(branch: Branch) {
    setEditingBranch(branch);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingBranch) {
          await updateBranch(editingBranch.id, formData);
        } else {
          await createBranch(formData);
        }
        handleClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh mục Chi nhánh</h3>
        <button
          className="btn btn-primary"
          onClick={() => { setEditingBranch(null); setShowModal(true); }}
        >
          + Thêm mới chi nhánh
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "56px", textAlign: "center" }}>STT</th>
              <th>Mã chi nhánh</th>
              <th>Tên chi nhánh</th>
              <th>Địa chỉ</th>
              <th>Trạng thái</th>
              <th style={{ width: "80px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialBranches.map((branch, idx) => {
              const st = STATUS_MAP[branch.status] ?? { label: branch.status, badge: "badge-warning" };
              return (
                <tr key={branch.id}>
                  <td style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{branch.code}</td>
                  <td>{branch.name}</td>
                  <td>{branch.address ?? "—"}</td>
                  <td>
                    <span className={`badge ${st.badge}`}>{st.label}</span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleEdit(branch)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                      title="Sửa"
                    >✏️</button>
                  </td>
                </tr>
              );
            })}
            {initialBranches.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>
                  Chưa có dữ liệu chi nhánh.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "450px", margin: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>{editingBranch ? "✏️ Sửa Chi nhánh" : "📍 Thêm Chi nhánh mới"}</h3>
            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem", fontSize: "0.9rem" }}>⚠️ {error}</div>}
            
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Mã chi nhánh *</label>
                <input
                  type="text" name="code" className="input" required
                  placeholder="VD: CN01"
                  defaultValue={editingBranch?.code}
                  disabled={!!editingBranch}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Tên chi nhánh *</label>
                <input
                  type="text" name="name" className="input" required
                  placeholder="VD: Chi nhánh Hà Nội"
                  defaultValue={editingBranch?.name}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Địa chỉ</label>
                <input
                  type="text" name="address" className="input"
                  placeholder="Địa chỉ chi nhánh"
                  defaultValue={editingBranch?.address ?? ""}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Trạng thái</label>
                <select name="status" className="input" defaultValue={editingBranch?.status ?? "ACTIVE"}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Ngừng sử dụng</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn" onClick={handleClose}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Đang lưu..." : editingBranch ? "Cập nhật" : "Lưu lại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
