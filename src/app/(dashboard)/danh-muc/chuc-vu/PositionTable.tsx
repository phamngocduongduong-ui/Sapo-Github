"use client";

import { useState, useTransition } from "react";
import { createPosition, updatePosition, updatePositionStatus } from "./actions";

type Position = {
  id: string;
  code: string;
  name: string;
  status: string;
  note: string | null;
  createdAt: Date;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  ACTIVE: { label: "Hoạt động", badge: "badge-success" },
  INACTIVE: { label: "Ngưng hoạt động", badge: "badge-danger" },
};

export default function PositionTable({ initialPositions }: { initialPositions: Position[] }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setShowModal(false);
    setEditingPosition(null);
    setError(null);
  }

  function handleEdit(pos: Position) {
    setEditingPosition(pos);
    setShowModal(true);
  }

  function handleStatusUpdate(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái chức vụ này?`)) return;
    startTransition(async () => {
      try {
        await updatePositionStatus(id, newStatus);
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
        if (editingPosition) {
          await updatePosition(editingPosition.id, formData);
        } else {
          await createPosition(formData);
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
        <h3 style={{ margin: 0 }}>Danh mục Chức vụ</h3>
        <button className="btn btn-primary" onClick={() => { setEditingPosition(null); setShowModal(true); }}>+ Thêm chức vụ</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px" }}>STT</th>
              <th>Mã chức vụ</th>
              <th>Tên chức vụ</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
              <th style={{ textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialPositions.map((pos, idx) => {
              const st = STATUS_MAP[pos.status] ?? { label: pos.status, badge: "badge-warning" };
              return (
                <tr key={pos.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{pos.code}</td>
                  <td>{pos.name}</td>
                  <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                  <td>{pos.note ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                      <button className="btn btn-sm" onClick={() => handleEdit(pos)} style={{ background: "#f39c12", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Sửa</button>
                      
                      {pos.status === "ACTIVE" ? (
                        <button className="btn btn-sm" onClick={() => handleStatusUpdate(pos.id, "INACTIVE")} style={{ background: "#e74c3c", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Hủy</button>
                      ) : (
                        <button className="btn btn-sm" onClick={() => handleStatusUpdate(pos.id, "ACTIVE")} style={{ background: "#27ae60", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Kích hoạt</button>
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
            <h3>{editingPosition ? "✏️ Sửa Chức vụ" : "🎖️ Thêm Chức vụ mới"}</h3>
            {error && <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label>Mã chức vụ *</label>
                <input type="text" name="code" className="input" defaultValue={editingPosition?.code} disabled={!!editingPosition} required />
              </div>
              <div>
                <label>Tên chức vụ *</label>
                <input type="text" name="name" className="input" defaultValue={editingPosition?.name} required />
              </div>
              <div>
                <label>Ghi chú</label>
                <textarea name="note" className="input" rows={3} defaultValue={editingPosition?.note ?? ""}></textarea>
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
