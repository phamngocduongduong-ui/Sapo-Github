"use client";

import { useState, useTransition, useRef } from "react";
import { createLeaveRequest, updateLeaveRequest, updateLeaveStatus } from "./actions";

type LeaveRequest = {
  id: string;
  createdAt: Date;
  employeeName: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: string;
  approver: string | null;
  note: string | null;
};

const REASONS = [
  "Nghỉ phép hàng năm",
  "Nghỉ việc hưởng lương",
  "Nghỉ việc không hưởng lương",
  "Nghỉ ốm đột xuất",
  "Nghỉ thai sản",
  "Nghỉ khác"
];

const STATUS_BADGES: Record<string, string> = {
  "Tạo mới": "badge-warning",
  "Chờ phê duyệt": "badge-info",
  "Đã phê duyệt": "badge-success",
  "Hủy": "badge-danger"
};

export default function LeaveRequestTable({ 
  initialRequests,
  currentUserName 
}: { 
  initialRequests: LeaveRequest[],
  currentUserName: string
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleClose() {
    setShowModal(false);
    setEditingRequest(null);
    setError(null);
    formRef.current?.reset();
  }

  function handleEdit(req: LeaveRequest) {
    setEditingRequest(req);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingRequest) {
          await updateLeaveRequest(editingRequest.id, formData);
        } else {
          await createLeaveRequest(formData);
        }
        handleClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  function handleStatusChange(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái sang "${newStatus}"?`)) return;
    startTransition(async () => {
      try {
        await updateLeaveStatus(id, newStatus);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Đơn nghỉ phép</h3>
        <button
          className="btn btn-primary"
          onClick={() => { setEditingRequest(null); setShowModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <span>+</span> Thêm mới nghỉ phép
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th>Ngày tạo</th>
              <th>Nhân viên</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th style={{ textAlign: "center" }}>Số ngày</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th>Phê duyệt</th>
              <th>Ghi chú</th>
              <th style={{ width: "120px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialRequests.map((req, idx) => (
              <tr key={req.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</td>
                <td style={{ fontWeight: 500 }}>{req.employeeName}</td>
                <td>{new Date(req.startDate).toLocaleDateString("vi-VN")}</td>
                <td>{new Date(req.endDate).toLocaleDateString("vi-VN")}</td>
                <td style={{ textAlign: "center", fontWeight: 600 }}>{req.totalDays}</td>
                <td>{req.reason}</td>
                <td>
                  <span className={`badge ${STATUS_BADGES[req.status] || "badge-warning"}`}>
                    {req.status}
                  </span>
                </td>
                <td>{req.approver ?? "—"}</td>
                <td title={req.note ?? ""}>{req.note ? (req.note.length > 20 ? req.note.substring(0, 20) + "..." : req.note) : "—"}</td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                    {req.status === "Tạo mới" && (
                      <>
                        <button onClick={() => handleEdit(req)} style={{ background: "none", border: "none", cursor: "pointer" }} title="Sửa">✏️</button>
                        <button onClick={() => handleStatusChange(req.id, "Chờ phê duyệt")} style={{ background: "none", border: "none", cursor: "pointer" }} title="Gửi phê duyệt">✈️</button>
                        <button onClick={() => handleStatusChange(req.id, "Hủy")} style={{ background: "none", border: "none", cursor: "pointer" }} title="Hủy">❌</button>
                      </>
                    )}
                    {req.status === "Chờ phê duyệt" && (
                      <button onClick={() => handleStatusChange(req.id, "Tạo mới")} style={{ background: "none", border: "none", cursor: "pointer" }} title="Thu hồi">🔄</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {initialRequests.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: "2.5rem", color: "#888" }}>
                  Chưa có đơn nghỉ phép nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "550px", margin: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>{editingRequest ? "✏️ Sửa Đơn nghỉ phép" : "🏖️ Tạo Đơn nghỉ phép mới"}</h3>
            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1rem" }}>
              Nhân viên: <strong>{currentUserName}</strong> | Ngày tạo: <strong>{new Date().toLocaleDateString("vi-VN")}</strong>
            </p>
            
            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem", fontSize: "0.9rem" }}>⚠️ {error}</div>}
            
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Ngày bắt đầu *</label>
                  <input
                    type="date" name="startDate" className="input" required
                    defaultValue={editingRequest ? new Date(editingRequest.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Ngày kết thúc *</label>
                  <input
                    type="date" name="endDate" className="input" required
                    defaultValue={editingRequest ? new Date(editingRequest.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Lý do nghỉ *</label>
                <select name="reason" className="input" required defaultValue={editingRequest?.reason ?? ""}>
                  <option value="" disabled>-- Chọn lý do --</option>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Ghi chú</label>
                <textarea
                  name="note" className="input" rows={3} placeholder="Nội dung chi tiết..."
                  defaultValue={editingRequest?.note ?? ""}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className="btn" onClick={handleClose} disabled={isPending}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Đang xử lý..." : editingRequest ? "✅ Cập nhật" : "💾 Lưu đơn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .badge-info { background: rgba(52,152,219,0.15); color: #3498db; }
      `}</style>
    </>
  );
}
