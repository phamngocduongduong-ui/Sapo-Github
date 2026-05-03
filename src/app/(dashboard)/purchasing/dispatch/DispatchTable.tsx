"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { createDispatchOrder, updateDispatchOrder } from "./actions";
import HistoryModal from "../../HistoryModal";

type DispatchOrder = {
  id: string;
  dispatchDate: Date;
  expectedDate: Date;
  employeeName: string;
  status: string;
  dispatcher: string;
  note: string | null;
  createdAt: Date;
};

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  PENDING:     { label: "Chờ xử lý",    badge: "badge-warning" },
  IN_PROGRESS: { label: "Đang thực hiện", badge: "badge-info" },
  DONE:        { label: "Hoàn thành",   badge: "badge-success" },
  CANCELLED:   { label: "Đã hủy",       badge: "badge-danger" },
};

export default function DispatchTable({ 
  initialOrders, 
  activeEmployees 
}: { 
  initialOrders: DispatchOrder[], 
  activeEmployees: string[] 
}) {
  const [orders, setOrders] = useState<DispatchOrder[]>(initialOrders);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DispatchOrder | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useRealTimeSync("dispatch-orders", orders, setOrders);

  function handleClose() {
    setShowModal(false);
    setEditingOrder(null);
    setError(null);
    formRef.current?.reset();
  }

  function handleEdit(order: DispatchOrder) {
    setEditingOrder(order);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingOrder) {
          await updateDispatchOrder(editingOrder.id, formData);
        } else {
          await createDispatchOrder(formData);
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
        <h3 style={{ margin: 0 }}>Danh sách Lệnh điều động</h3>
        <button
          id="btn-add-dispatch"
          className="btn btn-primary"
          onClick={() => { setEditingOrder(null); setShowModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>+</span>
          Thêm mới
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "56px", textAlign: "center" }}>STT</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày dự kiến kết thúc</th>
              <th>Nhân viên</th>
              <th>Trạng thái</th>
              <th>Người điều động</th>
              <th>Ghi chú</th>
              <th style={{ width: "150px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const st = STATUS_LABELS[order.status] ?? { label: order.status, badge: "badge-warning" };
              return (
                <tr key={order.id}>
                  <td style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td>{new Date(order.dispatchDate).toLocaleDateString("vi-VN")}</td>
                  <td>{new Date(order.expectedDate).toLocaleDateString("vi-VN")}</td>
                  <td style={{ fontWeight: 500 }}>{order.employeeName}</td>
                  <td>
                    <span className={`badge ${st.badge}`}>{st.label}</span>
                  </td>
                  <td>{order.dispatcher}</td>
                  <td style={{ color: order.note ? "inherit" : "#888", fontStyle: order.note ? "normal" : "italic" }}>
                    {order.note ?? "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                      <button
                        onClick={() => handleEdit(order)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px", borderRadius: "4px", color: "#3498db" }}
                        title="Sửa lệnh"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-sm btn-outline" 
                        onClick={() => setHistoryRecordId(order.id)}
                        title="Lịch sử thay đổi"
                      >
                        Lịch sử
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#888", fontStyle: "italic" }}>
                  Chưa có lệnh điều động nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="DispatchOrder" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {showModal && (
        <div
          id="modal-dispatch"
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="card"
            style={{
              width: "100%", maxWidth: "560px",
              margin: "1rem",
              boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
              animation: "slideUp 0.25s ease",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>
                {editingOrder ? "✏️ Cập nhật Lệnh điều động" : "🚚 Thêm Lệnh điều động mới"}
              </h3>
              <button
                onClick={handleClose}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", color: "#888", padding: "0.25rem 0.5rem", borderRadius: "6px" }}
              >✕</button>
            </div>

            {error && (
              <div style={{ background: "rgba(231,76,60,0.15)", color: "#e74c3c", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem" }}>
                ⚠️ {error}
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.875rem" }}>
                    Ngày bắt đầu <span style={{ color: "#e74c3c" }}>*</span>
                  </label>
                  <input 
                    type="date" 
                    name="dispatchDate" 
                    className="input" 
                    required 
                    defaultValue={editingOrder ? new Date(editingOrder.dispatchDate).toISOString().split('T')[0] : ""}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.875rem" }}>
                    Ngày dự kiến kết thúc <span style={{ color: "#e74c3c" }}>*</span>
                  </label>
                  <input 
                    type="date" 
                    name="expectedDate" 
                    className="input" 
                    required 
                    defaultValue={editingOrder ? new Date(editingOrder.expectedDate).toISOString().split('T')[0] : ""}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.875rem" }}>
                  Nhân viên <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <select name="employeeName" className="input" required defaultValue={editingOrder?.employeeName ?? ""}>
                  <option value="">-- Chọn nhân viên --</option>
                  {activeEmployees.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  {editingOrder && !activeEmployees.includes(editingOrder.employeeName) && (
                    <option value={editingOrder.employeeName}>{editingOrder.employeeName} (Ngừng sử dụng)</option>
                  )}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.875rem" }}>
                    Người điều động <span style={{ color: "#e74c3c" }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    name="dispatcher" 
                    className="input" 
                    placeholder="Tên người điều động" 
                    required 
                    defaultValue={editingOrder?.dispatcher ?? ""}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.875rem" }}>
                    Trạng thái
                  </label>
                  <select name="status" className="input" defaultValue={editingOrder?.status ?? "PENDING"}>
                    <option value="PENDING">Chờ xử lý</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="DONE">Hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.875rem" }}>
                  Ghi chú
                </label>
                <textarea
                  name="note"
                  className="input"
                  placeholder="Nhập ghi chú (không bắt buộc)"
                  rows={3}
                  defaultValue={editingOrder?.note ?? ""}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className="btn" onClick={handleClose} disabled={isPending}
                  style={{ background: "rgba(255,255,255,0.08)", color: "inherit" }}>
                  Thoát
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending} style={{ minWidth: "120px" }}>
                  {isPending ? "Đang lưu..." : editingOrder ? "✅ Cập nhật" : "💾 Lưu lại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .badge-info    { background: rgba(52,152,219,0.18); color: #3498db; }
        .badge-success { background: rgba(39,174,96,0.18);  color: #27ae60; }
        .badge-danger  { background: rgba(231,76,60,0.18);  color: #e74c3c; }
      `}</style>
    </>
  );
}
