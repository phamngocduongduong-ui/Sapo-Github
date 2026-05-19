"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { Check, RotateCcw, MoreHorizontal, Pencil, History, CheckCircle, PowerOff, Mail, Clock, Eye } from "lucide-react";
import { createOrder, updateOrder, deleteOrder, approveOrder, updateOrderStatus } from "./actions";
import HistoryModal from "../../HistoryModal";
import { formatNumber } from "@/lib/format";

export default function OrderTable({ initialOrders, customers, branches, salesEmployees, currentUser }: { initialOrders: any[], customers: string[], branches: string[], salesEmployees: string[], currentUser: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([{ productName: "", packaging: "", quantity: 1, hasPallet: false, hasCornerGuard: false, note: "" }]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // State bộ lọc
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string, status: string, info: string } | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Auto-Sync
  useRealTimeSync("orders", orders, setOrders);

  // Logic lọc dữ liệu
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchCustomer = !filterCustomer || order.customerCode === filterCustomer;
      const matchStatus = !filterStatus || order.status === filterStatus;
      const matchEmployee = !filterEmployee || order.employeeName === filterEmployee;
      const matchMonth = !filterMonth || (new Date(order.orderDate).getMonth() + 1).toString().padStart(2, '0') === filterMonth.split('-')[1];
      return matchCustomer && matchStatus && matchEmployee && matchMonth;
    });
  }, [orders, filterCustomer, filterStatus, filterEmployee, filterMonth]);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  const uniqueCustomersInOrders = useMemo(() => {
    return Array.from(new Set(orders.map(o => o.customerCode)));
  }, [orders]);

  function handleClose() {
    setShowModal(false);
    setEditingOrder(null);
    setIsViewMode(false);
    setItems([{ productName: "", packaging: "", quantity: 1, hasPallet: false, hasCornerGuard: false, note: "" }]);
    setActiveTab(1);
    setError(null);
  }

  function handleEdit(order: any) {
    setEditingOrder(order);
    setIsViewMode(false);
    setItems(order.orderitem.length > 0 ? [...order.orderitem] : [{ productName: "", packaging: "", quantity: 1, hasPallet: false, hasCornerGuard: false, note: "" }]);
    setActiveTab(1);
    setShowModal(true);
  }

  function handleView(order: any) {
    setEditingOrder(order);
    setIsViewMode(true);
    setItems(order.orderitem.length > 0 ? [...order.orderitem] : []);
    setActiveTab(2); // Mặc định mở Tab 2 khi xem
    setShowModal(true);
  }

  function handleStatusChange(id: string, newStatus: string, info?: string) {
    setConfirmUpdate({ id, status: newStatus, info: info || "" });
  }

  function executeStatusChange() {
    if (!confirmUpdate) return;
    const { id, status: newStatus } = confirmUpdate;
    setConfirmUpdate(null);
    startTransition(async () => {
      try {
        if (newStatus === "Chờ kế hoạch sản xuất") {
          await approveOrder(id);
        } else {
          await updateOrderStatus(id, newStatus);
        }
      } catch (err: any) { alert(err.message); }
    });
  }

  function addItem() {
    if (isViewMode) return;
    setItems([...items, { productName: "", packaging: "", quantity: 1, hasPallet: false, hasCornerGuard: false, note: "" }]);
  }

  function removeItem(index: number) {
    if (isViewMode) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    if (isViewMode) return;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isViewMode) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingOrder) await updateOrder(editingOrder.id, formData, items);
        else await createOrder(formData, items);
        handleClose();
      } catch (err: any) { setError(err.message); }
    });
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div>
          <label className="filter-label">Mã khách hàng</label>
          <select className="input" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
            <option value="">-- Tất cả khách hàng --</option>
            {uniqueCustomersInOrders.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="filter-label">Trạng thái</label>
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">-- Tất cả trạng thái --</option>
            <option value="Tạo mới">Tạo mới</option>
            <option value="Chờ kế hoạch sản xuất">Chờ kế hoạch sản xuất</option>
            <option value="Đã có kế hoạch sản xuất">Đã có kế hoạch sản xuất</option>
            <option value="Đã có kế hoạch giao hàng">Đã có kế hoạch giao hàng</option>
            <option value="Đã giao hàng">Đã giao hàng</option>
          </select>
        </div>
        <div>
          <label className="filter-label">Nhân viên</label>
          <select className="input" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
            <option value="">-- Tất cả nhân viên --</option>
            {salesEmployees.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="filter-label">Tháng</label>
          <input type="month" className="input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0 }}>📋 Danh sách Đơn hàng</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={() => router.refresh()}>
            <RotateCcw size={18} style={{ marginRight: "6px" }} /> Làm mới
          </button>
          <button className="btn btn-primary" onClick={() => { setIsViewMode(false); setShowModal(true); }}>+ Thêm mới đơn hàng</button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th>Mã ĐH</th>
              <th>Mã KH</th>
              <th>Nhân viên</th>
              <th>Ngày thực hiện</th>
              <th>Chi nhánh</th>
              <th>Ngày giao hàng</th>
              <th>Trạng thái</th>
              <th>Ngày xuất</th>
              <th>Nhiệt kế</th>
              <th style={{ width: "160px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, idx) => (
              <>
                <tr 
                  key={order.id} 
                  onClick={() => toggleExpand(order.id)}
                  onDoubleClick={() => handleView(order)} 
                  title="Nhấp 1 lần để xem nhanh hàng hóa, nhấp đúp để xem chi tiết" 
                  style={{ cursor: "pointer", background: expandedOrderId === order.id ? "#f0f7ff" : "inherit" }}
                >
                  <td style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{order.orderCode}</td>
                  <td>{order.customerCode}</td>
                  <td>{order.employeeName}</td>
                  <td>{new Date(order.orderDate).toLocaleDateString("vi-VN")}</td>
                  <td>{order.branch}</td>
                  <td>{order.requestDeliveryDate ? new Date(order.requestDeliveryDate).toLocaleDateString("vi-VN") : "—"}</td>
                  <td>
                    {order.status === "Đã giao hàng" ? (
                      <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Check size={14} /> Hoàn tất
                      </span>
                    ) : (
                      <span className={`badge ${
                        order.status === "Tạo mới" ? "badge-info" : 
                        order.status === "Đã hủy" ? "badge-danger" : "badge-warning"
                      }`}>
                        {order.status}
                      </span>
                    )}
                  </td>
                  <td>{order.shipDate ? new Date(order.shipDate).toLocaleDateString("vi-VN") : "—"}</td>
                  <td style={{ textAlign: "center" }}>{order.thermometer ? "✅ Có" : "❌ Không"}</td>
                  <td style={{ textAlign: "right", position: "relative" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button 
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === order.id ? null : order.id);
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openMenuId === order.id && (
                        <div className="action-dropdown" onClick={(e) => e.stopPropagation()}>
                          <div className="dropdown-item" onClick={() => { handleView(order); setOpenMenuId(null); }}>
                            <Eye size={14} /> Xem chi tiết
                          </div>
                          {order.status === "Tạo mới" && (
                            <div className="dropdown-item" onClick={() => { handleEdit(order); setOpenMenuId(null); }}>
                              <Pencil size={14} /> Chỉnh sửa
                            </div>
                          )}
                          <div className="dropdown-item" onClick={() => { setHistoryRecordId(order.id); setOpenMenuId(null); }}>
                            <History size={14} /> Lịch sử
                          </div>
                          
                          {order.status === "Tạo mới" && (
                            <div className="dropdown-item success" onClick={() => handleStatusChange(order.id, "Chờ kế hoạch sản xuất", `đơn ${order.orderCode}`)}>
                              <CheckCircle size={14} /> Phê duyệt đơn
                            </div>
                          )}

                          {order.status === "Chờ kế hoạch sản xuất" && (
                            <div className="dropdown-item warning" onClick={() => handleStatusChange(order.id, "Tạo mới", `đơn ${order.orderCode}`)}>
                              <RotateCcw size={14} /> Thu hồi đơn
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedOrderId === order.id && (
                  <tr>
                    <td colSpan={11} style={{ padding: "0.75rem 1.5rem", background: "#f8fafc" }}>
                      <div style={{ padding: "1rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
                        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "#475569", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          📦 Chi tiết hàng hóa (Đơn: {order.orderCode})
                        </h4>
                        <table className="table" style={{ fontSize: "0.8rem", marginBottom: 0 }}>
                          <thead>
                            <tr style={{ background: "#f1f5f9" }}>
                              <th>Tên hàng hóa</th>
                              <th>Quy cách</th>
                              <th>Số lượng</th>
                              <th style={{ textAlign: "center" }}>Pallet</th>
                              <th style={{ textAlign: "center" }}>Nẹp góc</th>
                              <th>Ghi chú</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.orderitem.map((item: any, i: number) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 500 }}>{item.productName}</td>
                                <td>{item.packaging}</td>
                                <td style={{ fontWeight: 600, color: "#2563eb" }}>{formatNumber(item.quantity)}</td>
                                <td style={{ textAlign: "center" }}>{item.hasPallet ? "✅" : "—"}</td>
                                <td style={{ textAlign: "center" }}>{item.hasCornerGuard ? "✅" : "—"}</td>
                                <td style={{ color: "#64748b", fontStyle: "italic" }}>{item.note || "—"}</td>
                              </tr>
                            ))}
                            {order.orderitem.length === 0 && (
                              <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8" }}>Không có chi tiết hàng hóa.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="Order" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {showModal && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "1000px", margin: "1rem", maxHeight: "95vh", overflowY: "auto" }}>
            <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>{isViewMode ? "🔍 Xem đơn hàng" : editingOrder ? "✏️ Sửa đơn hàng" : "📦 Thêm mới đơn hàng"}</h3>
            
            <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid #eee", marginBottom: "1.5rem" }}>
              <button type="button" onClick={() => setActiveTab(1)} style={{ padding: "0.75rem 1rem", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === 1 ? "3px solid #3498db" : "none", fontWeight: activeTab === 1 ? 600 : 400, color: activeTab === 1 ? "#3498db" : "#888" }}>1. Thông tin chung</button>
              <button type="button" onClick={() => setActiveTab(2)} style={{ padding: "0.75rem 1rem", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === 2 ? "3px solid #3498db" : "none", fontWeight: activeTab === 2 ? 600 : 400, color: activeTab === 2 ? "#3498db" : "#888" }}>2. Chi tiết hàng hóa</button>
            </div>

            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: activeTab === 1 ? "grid" : "none", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
                <div><label className="filter-label">Mã đơn hàng</label><input type="text" name="orderCode" className="input" defaultValue={editingOrder?.orderCode} disabled={!!editingOrder || isViewMode} required /></div>
                <div>
                  <label className="filter-label">Mã khách hàng</label>
                  <select name="customerCode" className="input" disabled={isViewMode} required defaultValue={editingOrder?.customerCode ?? ""}>
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="filter-label">Nhân viên thực hiện</label><input type="text" name="employeeName" className="input" defaultValue={editingOrder?.employeeName ?? currentUser} readOnly /></div>
                <div><label className="filter-label">Ngày thực hiện</label><input type="text" className="input" defaultValue={editingOrder ? new Date(editingOrder.orderDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")} readOnly /></div>
                <div>
                  <label className="filter-label">Chi nhánh</label>
                  <select name="branch" className="input" disabled={isViewMode} defaultValue={editingOrder?.branch ?? ""}>
                    <option value="">-- Chọn chi nhánh --</option>
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div><label className="filter-label">Ngày đề nghị giao hàng</label><input type="date" name="requestDeliveryDate" className="input" disabled={isViewMode} defaultValue={editingOrder?.requestDeliveryDate ? new Date(editingOrder.requestDeliveryDate).toISOString().split('T')[0] : ""} /></div>
                <div><label className="filter-label">Dự kiến xong SX</label><input type="date" name="productionFinishDate" className="input" disabled={isViewMode} defaultValue={editingOrder?.productionFinishDate ? new Date(editingOrder.productionFinishDate).toISOString().split('T')[0] : ""} /></div>
                <div><label className="filter-label">Ngày dự kiến xuất hàng</label><input type="date" name="shipDate" className="input" disabled={isViewMode} defaultValue={editingOrder?.shipDate ? new Date(editingOrder.shipDate).toISOString().split('T')[0] : ""} /></div>
                <div>
                  <label className="filter-label">Trạng thái</label>
                  <select name="status" className="input" disabled={isViewMode} defaultValue={editingOrder?.status ?? "Tạo mới"}>
                    <option value="Tạo mới">Tạo mới</option>
                    <option value="Chờ kế hoạch sản xuất">Chờ kế hoạch sản xuất</option>
                    <option value="Đã có kế hoạch sản xuất">Đã có kế hoạch sản xuất</option>
                    <option value="Đã có kế hoạch giao hàng">Đã có kế hoạch giao hàng</option>
                    <option value="Đã giao hàng">Đã giao hàng</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" name="thermometer" id="thermometer" disabled={isViewMode} defaultChecked={editingOrder?.thermometer} />
                  <label htmlFor="thermometer" style={{ margin: 0, fontSize: "0.9rem" }}>Nhiệt kế</label>
                </div>
                <div style={{ gridColumn: "span 3" }}><label className="filter-label">Ghi chú</label><input type="text" name="note" className="input" disabled={isViewMode} defaultValue={editingOrder?.note ?? ""} /></div>
              </div>

              <div style={{ display: activeTab === 2 ? "block" : "none" }}>
                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <table className="table" style={{ fontSize: "0.85rem", width: "100%" }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th style={{ width: "250px" }}>Tên hàng hóa</th>
                        <th style={{ width: "150px" }}>Quy cách</th>
                        <th style={{ width: "80px" }}>SL</th>
                        <th style={{ width: "80px", textAlign: "center" }}>Pallet</th>
                        <th style={{ width: "80px", textAlign: "center" }}>Nẹp</th>
                        <th>Ghi chú</th>
                        {!isViewMode && <th style={{ width: "50px" }}>#</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td><input type="text" className="input-sm" value={item.productName} onChange={(e) => updateItem(idx, "productName", e.target.value)} disabled={isViewMode} required /></td>
                          <td><input type="text" className="input-sm" value={item.packaging} onChange={(e) => updateItem(idx, "packaging", e.target.value)} disabled={isViewMode} /></td>
                          <td><input type="number" className="input-sm" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} disabled={isViewMode} /></td>
                          <td style={{ textAlign: "center" }}><input type="checkbox" checked={item.hasPallet} onChange={(e) => updateItem(idx, "hasPallet", e.target.checked)} disabled={isViewMode} /></td>
                          <td style={{ textAlign: "center" }}><input type="checkbox" checked={item.hasCornerGuard} onChange={(e) => updateItem(idx, "hasCornerGuard", e.target.checked)} disabled={isViewMode} /></td>
                          <td><input type="text" className="input-sm" value={item.note} onChange={(e) => updateItem(idx, "note", e.target.value)} disabled={isViewMode} /></td>
                          {!isViewMode && <td><button type="button" onClick={() => removeItem(idx)} style={{ color: "#e74c3c", border: "none", background: "none", cursor: "pointer" }}>🗑️</button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!isViewMode && <button type="button" onClick={addItem} className="btn" style={{ marginTop: "1rem", background: "#f1f5f9" }}>+ Thêm hàng hóa</button>}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "2rem", borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
                <button type="button" className="btn" onClick={handleClose}>Thoát</button>
                {!isViewMode && (
                   <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Đang lưu..." : "💾 Lưu đơn hàng"}</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .filter-label { display: block; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .input-sm { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.85rem; outline: none; }
        .input-sm:focus { border-color: #3498db; }
        .input-sm:disabled { background: #f8fafc; cursor: not-allowed; border: none; }
        .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 4px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
      `}</style>
      {/* Custom Confirmation Modal */}
      {confirmUpdate && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: "#fff7ed", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 1.5rem",
              color: "#f97316"
            }}>
              <Clock size={32} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ kế hoạch sản xuất" ? "Phê duyệt đơn hàng" : 
               confirmUpdate.status === "Tạo mới" ? "Thu hồi hồ sơ" : 
               "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", marginBottom: "2rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ kế hoạch sản xuất" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn đồng ý phê duyệt {confirmUpdate.info} không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <Check size={16} /> Đơn hàng sẽ có giá trị kể từ thời điểm phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Tạo mới" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn muốn thu hồi hồ sơ không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                    <RotateCcw size={16} /> Hồ sơ sẽ không trong danh sách chờ phê duyệt.
                  </p>
                </>
              ) : (
                <p>Bạn có chắc chắn muốn chuyển trạng thái đơn này sang <strong>"{confirmUpdate.status}"</strong> không?</p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmUpdate(null)}>Hủy bỏ</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={executeStatusChange}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
