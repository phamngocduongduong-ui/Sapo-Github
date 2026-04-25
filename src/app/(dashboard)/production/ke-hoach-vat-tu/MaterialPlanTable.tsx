"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createMaterialPlan, updateMaterialPlan, deleteMaterialPlan } from "./actions";

export default function MaterialPlanTable({ initialPlans, pendingItems, currentUser }: { initialPlans: any[], pendingItems: any[], currentUser: string }) {
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [activeMainTab, setActiveMainTab] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState(1);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-Sync
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/production/material-plans");
        if (res.ok) {
          const data = await res.json();
          if (JSON.stringify(data) !== JSON.stringify(plans)) setPlans(data);
        }
      } catch (e) { console.error(e); }
    }, 3000);
    return () => clearInterval(interval);
  }, [plans]);

  function handleClose() {
    setShowModal(false);
    setEditingPlan(null);
    setSelectedOrderIds([]);
    setActiveFormTab(1);
    setError(null);
  }

  function handleEdit(plan: any) {
    setEditingPlan(plan);
    setSelectedOrderIds(plan.orders.map((o: any) => o.id));
    setShowModal(true);
  }

  // Khi chọn một mặt hàng, ta chọn Đơn hàng chứa mặt hàng đó
  function toggleOrderByItem(orderId: string) {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingPlan) await updateMaterialPlan(editingPlan.id, formData, selectedOrderIds);
        else await createMaterialPlan(formData, selectedOrderIds);
        handleClose();
      } catch (err: any) { setError(err.message); }
    });
  }

  // Danh sách hàng hóa hiển thị trong Form Tab 2
  // Bao gồm hàng hóa chờ và hàng hóa của kế hoạch đang sửa
  const allAvailableItems = useMemo(() => {
    const editItems = editingPlan?.orders.flatMap((o: any) => o.items.map((i: any) => ({ ...i, order: o }))) || [];
    return [...pendingItems, ...editItems];
  }, [pendingItems, editingPlan]);

  return (
    <>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => setActiveMainTab(1)} className={`btn ${activeMainTab === 1 ? 'btn-primary' : ''}`} style={{ background: activeMainTab === 1 ? undefined : '#f1f5f9', color: activeMainTab === 1 ? undefined : '#475569' }}>🗂️ Bảng kế hoạch</button>
        <button onClick={() => setActiveMainTab(2)} className={`btn ${activeMainTab === 2 ? 'btn-primary' : ''}`} style={{ background: activeMainTab === 2 ? undefined : '#f1f5f9', color: activeMainTab === 2 ? undefined : '#475569' }}>📊 Bảng tổng hợp</button>
      </div>

      {activeMainTab === 1 ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0 }}>Danh sách Kế hoạch Vật tư</h4>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tạo kế hoạch mới</button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                  <th>Số kế hoạch</th>
                  <th>Ngày tạo</th>
                  <th>Người tạo</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                  <th style={{ width: "80px", textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, idx) => (
                  <tr key={plan.id}>
                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{plan.planNumber}</td>
                    <td>{new Date(plan.planDate).toLocaleDateString("vi-VN")}</td>
                    <td>{plan.creator}</td>
                    <td><span className="badge badge-info">{plan.status}</span></td>
                    <td>{plan.note}</td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => handleEdit(plan)} className="btn-icon">✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <h4 style={{ marginBottom: "1rem" }}>Chi tiết Tổng hợp Vật tư</h4>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Số kế hoạch</th>
                  <th>Đơn hàng</th>
                  <th>Tên hàng hóa</th>
                  <th>Quy cách</th>
                  <th>SL</th>
                  <th>Pallet</th>
                  <th>Nẹp</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  plan.orders.flatMap((order: any) => order.items).map((item: any, iidx: number) => (
                    <tr key={item.id} onDoubleClick={() => handleEdit(plan)} style={{ cursor: "pointer" }}>
                      <td>{plan.planNumber}</td>
                      <td>{item.order?.orderCode || "—"}</td>
                      <td style={{ fontWeight: 500 }}>{item.productName}</td>
                      <td>{item.packaging}</td>
                      <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                      <td>{item.hasPallet ? "✅" : "❌"}</td>
                      <td>{item.hasCornerGuard ? "✅" : "❌"}</td>
                      <td><span className="badge badge-info">{plan.status}</span></td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "1100px", margin: "1rem", maxHeight: "95vh", overflowY: "auto" }}>
            <h3>{editingPlan ? "✏️ Sửa Kế hoạch vật tư" : "📑 Tạo Kế hoạch vật tư mới"}</h3>
            
            <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid #eee", marginBottom: "1.5rem" }}>
              <button onClick={() => setActiveFormTab(1)} style={{ padding: "0.75rem 1rem", border: "none", background: "none", cursor: "pointer", borderBottom: activeFormTab === 1 ? "3px solid #3498db" : "none", color: activeFormTab === 1 ? "#3498db" : "#888" }}>1. Thông tin chung</button>
              <button onClick={() => setActiveFormTab(2)} style={{ padding: "0.75rem 1rem", border: "none", background: "none", cursor: "pointer", borderBottom: activeFormTab === 2 ? "3px solid #3498db" : "none", color: activeFormTab === 2 ? "#3498db" : "#888" }}>2. Chi tiết hàng hóa ({selectedOrderIds.length} đơn hàng)</button>
            </div>

            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: activeFormTab === 1 ? "grid" : "none", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <div><label className="filter-label">Số kế hoạch *</label><input type="text" name="planNumber" className="input" defaultValue={editingPlan?.planNumber} disabled={!!editingPlan} required /></div>
                <div><label className="filter-label">Ngày tạo</label><input type="text" className="input" defaultValue={editingPlan ? new Date(editingPlan.planDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")} readOnly /></div>
                <div><label className="filter-label">Người tạo</label><input type="text" name="creator" className="input" defaultValue={editingPlan?.creator ?? currentUser} readOnly /></div>
                <div>
                  <label className="filter-label">Trạng thái</label>
                  <select name="status" className="input" defaultValue={editingPlan?.status ?? "Tạo mới"}>
                    <option value="Tạo mới">Tạo mới</option>
                    <option value="Đã duyệt">Đã duyệt</option>
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}><label className="filter-label">Ghi chú</label><input type="text" name="note" className="input" defaultValue={editingPlan?.note ?? ""} /></div>
              </div>

              <div style={{ display: activeFormTab === 2 ? "block" : "none" }}>
                <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #eee", borderRadius: "8px" }}>
                  <table className="table" style={{ fontSize: "0.8rem" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#f8fafc" }}>
                      <tr>
                        <th style={{ width: "40px" }}>Chọn</th>
                        <th>Mã đơn hàng</th>
                        <th>Tên hàng hóa</th>
                        <th>Quy cách</th>
                        <th>SL</th>
                        <th>Pallet</th>
                        <th>Nẹp giấy</th>
                        <th>Ghi chú đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAvailableItems.map((item: any) => (
                        <tr key={item.id} onClick={() => toggleOrderByItem(item.orderId)} style={{ cursor: "pointer", background: selectedOrderIds.includes(item.orderId) ? "#ebf5ff" : undefined }}>
                          <td style={{ textAlign: "center" }}><input type="checkbox" checked={selectedOrderIds.includes(item.orderId)} readOnly /></td>
                          <td style={{ fontWeight: 600 }}>{item.order.orderCode}</td>
                          <td style={{ fontWeight: 500 }}>{item.productName}</td>
                          <td>{item.packaging}</td>
                          <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                          <td style={{ textAlign: "center" }}>{item.hasPallet ? "✅" : "❌"}</td>
                          <td style={{ textAlign: "center" }}>{item.hasCornerGuard ? "✅" : "❌"}</td>
                          <td style={{ fontSize: "0.75rem", color: "#666" }}>{item.note || "—"}</td>
                        </tr>
                      ))}
                      {allAvailableItems.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>Không có hàng hóa nào chờ lập kế hoạch.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#64748b" }}>* Nhấp vào một dòng hàng hóa để chọn toàn bộ đơn hàng đó vào kế hoạch.</p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
                <button type="button" className="btn" onClick={handleClose}>Hủy</button>
                {activeFormTab === 1 ? (
                  <button type="button" className="btn btn-primary" onClick={() => setActiveFormTab(2)}>Tiếp theo (Chi tiết hàng)</button>
                ) : (
                  <>
                    <button type="button" className="btn" onClick={() => setActiveFormTab(1)}>Quay lại</button>
                    <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Đang lưu..." : "💾 Lưu kế hoạch"}</button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .filter-label { display: block; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 4px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
      `}</style>
    </>
  );
}

// Cần thêm useMemo từ react
import { useMemo } from "react";
