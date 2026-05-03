"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Plus, Search, Filter, ArrowUpRight, Clock, CheckCircle2, 
  FileText, User, Calendar, Tag, Info, ChevronRight, X, Save,
  ShoppingCart, Building2, Package, History, RefreshCw
} from "lucide-react";
import { 
  getPendingPurchaseOrders, getPurchaseInvoices, 
  createPurchaseInvoice, updateInvoiceStatus, rejectPurchaseOrder,
  updatePurchaseInvoice, deletePurchaseInvoice,
  getWarehouses, fixExistingInvoices
} from "./actions";
import HistoryModal from "../../HistoryModal";

export default function PurchaseInvoicePage() {
  const [pendingPOs, setPendingPOs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [details, setDetails] = useState<any[]>([]);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [viewDetailPO, setViewDetailPO] = useState<any>(null);
  const [viewDetailInv, setViewDetailInv] = useState<any>(null);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "delivered">("pending");




  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Run fix first to ensure statuses match the new tab filters
    await fixExistingInvoices();

    const [pos, invs, whs] = await Promise.all([
      getPendingPurchaseOrders(),
      getPurchaseInvoices(),
      getWarehouses()
    ]);
    setPendingPOs(pos);
    setInvoices(invs);
    setWarehouses(whs);
  }

  const openCreateModal = (po: any) => {
    setSelectedPO(po);
    setEditingInvoice(null);
    const initialDetails = (po.purchaseorderdetail || []).map((d: any) => ({
      productCode: d.productCode,
      productName: d.productName,
      requestedQuantity: d.requestedQuantity,
      purchasedQuantity: d.requestedQuantity,
      unit: d.unit,
      deliveryLocation: d.deliveryLocation,
      note: d.note || ""
    }));
    setDetails(initialDetails);
    setIsModalOpen(true);
  };

  const openEditModal = (inv: any) => {
    setEditingInvoice(inv);
    setSelectedPO(null);
    setDetails(inv.purchaseinvoicedetail.map((d: any) => ({ ...d })));
    setIsModalOpen(true);
  };

  const handleDeleteInvoice = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đơn mua này?")) return;
    startTransition(async () => {
      await deletePurchaseInvoice(id);
      fetchData();
    });
  };


  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...details];
    newDetails[index][field] = value;
    setDetails(newDetails);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      supplier: formData.get("supplier"),
      deliveryDate: formData.get("deliveryDate"),
      note: formData.get("note"),
      branch: selectedPO?.branch || "",
      invoiceType: formData.get("invoiceType"),
      warehouseName: formData.get("warehouseName")
    };

    startTransition(async () => {
      try {
        if (editingInvoice) {
          await updatePurchaseInvoice(editingInvoice.id, data, details);
        } else {
          await createPurchaseInvoice(data, details, selectedPO?.id);
        }
        setIsModalOpen(false);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };
  const handleRejectPO = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối lệnh mua này? Trạng thái sẽ chuyển về 'Tạo mới'.")) return;
    startTransition(async () => {
      await rejectPurchaseOrder(id);
      fetchData();
    });
  };

  return (
    <div style={{ padding: "1.5rem", width: "100%", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>🛒 Đơn mua (Purchase Orders)</h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>Tạo đơn mua hàng từ các lệnh mua đã duyệt</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", flex: 1, overflow: "hidden" }}>
        
        {/* Left Column: Pending POs */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={18} color="#f59e0b" /> Lệnh mua chờ thực hiện ({pendingPOs.length})
            </h3>
            <button className="btn-icon" onClick={fetchData} title="Làm mới" style={{ padding: "0.25rem" }}>
              <RefreshCw size={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
            {pendingPOs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>Không có lệnh mua nào đang chờ</div>
            ) : (
              pendingPOs.map(po => (
                <div 
                  key={po.id} 
                  className="po-item"
                  onClick={() => setViewDetailPO(po)}
                  style={{ 
                    padding: "1rem", 
                    borderRadius: "12px", 
                    border: "1px solid #e2e8f0", 
                    marginBottom: "1rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 700, color: "#2563eb", fontSize: "1rem" }}>{po.poCode}</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{new Date(po.createdDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem", color: "#475569" }}><strong>Người tạo:</strong> {po.creator}</div>
                  <div style={{ fontSize: "0.85rem", color: "#e11d48", marginBottom: "0.25rem" }}>
                    <strong>Ngày giao dự kiến:</strong> {new Date(po.requestedDate).toLocaleDateString("vi-VN")}
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "1rem", color: "#475569" }}><strong>Mục đích:</strong> {po.purpose}</div>
                  
                  <div style={{ display: "flex", justifyContent: "stretch", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                    <button 
                      className="btn btn-sm" 
                      style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem", background: "#fee2e2", color: "#dc2626", border: "none" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectPO(po.id);
                      }}
                    >
                      Từ chối
                    </button>
                    <button 
                      className="btn btn-sm btn-primary" 
                      style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal(po);
                      }}
                    >
                      Tạo đơn mua
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Invoices */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", paddingRight: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button 
                onClick={() => setActiveTab("pending")}
                className={`btn btn-sm ${activeTab === "pending" ? "btn-primary" : "btn-outline"}`}
                style={{ borderRadius: "20px", padding: "0.4rem 1.25rem" }}
              >
                Đơn chờ giao ({invoices.filter(i => i.status === "Chờ giao hàng").length})
              </button>
              <button 
                onClick={() => setActiveTab("delivered")}
                className={`btn btn-sm ${activeTab === "delivered" ? "btn-primary" : "btn-outline"}`}
                style={{ borderRadius: "20px", padding: "0.4rem 1.25rem" }}
              >
                Đơn đã giao ({invoices.filter(i => i.status === "Đã nhập kho").length})
              </button>
              <button 
                onClick={fetchData}
                className="btn btn-sm btn-outline"
                style={{ borderRadius: "20px", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1.25rem" }}
              >
                <RefreshCw size={14} /> Làm mới
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input type="text" placeholder="Tìm đơn mua..." className="input btn-sm" style={{ paddingLeft: "2rem", width: "180px" }} />
            </div>
          </div>

          {activeTab === "pending" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
              {invoices
                .filter(inv => inv.status === "Chờ giao hàng")
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map(inv => (
                  <div 
                    key={inv.id} 
                    className="card invoice-card" 
                    onClick={() => setViewDetailInv(inv)}
                    style={{ padding: "1.25rem", position: "relative", borderTop: "4px solid #3b82f6", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div>
                        <h4 style={{ margin: 0, color: "#2563eb", fontSize: "1.1rem" }}>{inv.invoiceCode}</h4>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                          {new Date(inv.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                      <span className="badge badge-warning">{inv.status}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                      <InfoItem icon={<User size={14} />} label="Người tạo" value={inv.creator} />
                      <InfoItem icon={<Building2 size={14} />} label="Nhà cung cấp" value={inv.supplier} />
                      <InfoItem icon={<FileText size={14} />} label="Số lệnh mua" value={inv.poCode || "—"} />
                      <InfoItem icon={<Calendar size={14} />} label="Ngày giao dự kiến" value={new Date(inv.deliveryDate).toLocaleDateString("vi-VN")} />
                      <InfoItem icon={<Tag size={14} />} label="Chi nhánh" value={inv.branch} />
                      <InfoItem icon={<Package size={14} />} label="Loại phiếu" value={inv.invoiceType || "Nhập kho"} />
                      <InfoItem icon={<Building2 size={14} />} label="Kho hàng" value={inv.warehouseName || "—"} />
                    </div>

                    {inv.note && (
                      <div style={{ fontSize: "0.85rem", color: "#475569", padding: "0.5rem", background: "#f8fafc", borderRadius: "4px", marginBottom: "1rem" }}>
                        <strong>Ghi chú:</strong> {inv.note}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{inv.purchaseinvoicedetail.length} mặt hàng</span>
                      <div style={{ display: "flex", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-outline" onClick={() => setHistoryRecordId(inv.id)}>Lịch sử</button>
                        <button className="btn btn-sm btn-outline" onClick={() => openEditModal(inv)}>Sửa</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteInvoice(inv.id)}>Xóa</button>
                      </div>
                    </div>
                  </div>
                ))}
              {invoices.filter(i => i.status === "Chờ giao hàng").length === 0 && (
                <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Không có đơn mua nào đang chờ giao</div>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th>Mã đơn</th>
                      <th>Ngày tạo</th>
                      <th>Nhà cung cấp</th>
                      <th>Kho nhập</th>
                      <th>Người tạo</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices
                      .filter(inv => inv.status === "Đã nhập kho")
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(inv => (
                        <tr key={inv.id} onClick={() => setViewDetailInv(inv)} style={{ cursor: "pointer" }}>
                          <td style={{ fontWeight: 700, color: "#2563eb" }}>{inv.invoiceCode}</td>
                          <td>{new Date(inv.createdAt).toLocaleDateString("vi-VN")}</td>
                          <td style={{ fontWeight: 600 }}>{inv.supplier}</td>
                          <td>{inv.warehouseName}</td>
                          <td>{inv.creator}</td>
                          <td><span className="badge badge-success">{inv.status}</span></td>
                          <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                              <button className="btn btn-sm btn-outline" onClick={() => setHistoryRecordId(inv.id)}>Lịch sử</button>
                              <button className="btn btn-sm btn-outline" onClick={() => openEditModal(inv)}>Sửa</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteInvoice(inv.id)}>Xóa</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {invoices.filter(i => i.status === "Đã nhập kho").length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Chưa có đơn mua nào đã giao</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* PO Detail Page (Large Modal) */}
      {viewDetailPO && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
          <div className="card" style={{ width: "95%", maxWidth: "900px", height: "85vh", display: "flex", flexDirection: "column", padding: 0, borderTop: "6px solid #2563eb" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h2 style={{ margin: 0, color: "#1e293b" }}>Chi tiết Lệnh mua hàng</h2>
                <div style={{ fontSize: "1.1rem", color: "#2563eb", fontWeight: 700, marginTop: "0.25rem" }}>{viewDetailPO.poCode}</div>
              </div>
              <button className="btn-icon" onClick={() => setViewDetailPO(null)}><X size={28} /></button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "1.5rem", background: "#f8fafc", padding: "1.25rem", borderRadius: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Người tạo</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{viewDetailPO.creator}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Chi nhánh</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{viewDetailPO.branch}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Ngày giao dự kiến</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "#e11d48" }}>{new Date(viewDetailPO.requestedDate).toLocaleDateString("vi-VN")}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Ngày tạo lệnh</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{new Date(viewDetailPO.createdDate).toLocaleDateString("vi-VN")}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Mục đích</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{viewDetailPO.purpose}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Trạng thái</label>
                  <span className="badge badge-info" style={{ fontSize: "0.85rem" }}>{viewDetailPO.status}</span>
                </div>
              </div>

              {viewDetailPO.note && (
                <div style={{ marginBottom: "2rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.5rem" }}>Ghi chú lệnh mua</label>
                  <div style={{ padding: "1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", color: "#92400e" }}>
                    {viewDetailPO.note}
                  </div>
                </div>
              )}

              <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#334155" }}>
                <Package size={20} /> Danh mục hàng hóa yêu cầu
              </h3>
              
              <div className="table-container" style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead style={{ background: "#f1f5f9" }}>
                    <tr>
                      <th>Mã hàng</th>
                      <th>Tên sản phẩm</th>
                      <th style={{ textAlign: "center" }}>Số lượng</th>
                      <th>ĐVT</th>
                      <th>Nơi giao dự kiến</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewDetailPO.purchaseorderdetail || []).map((d: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "#475569" }}>{d.productCode}</td>
                        <td style={{ fontWeight: 500 }}>{d.productName}</td>
                        <td style={{ textAlign: "center", fontSize: "1.1rem", fontWeight: 700, color: "#2563eb" }}>{d.requestedQuantity}</td>
                        <td>{d.unit}</td>
                        <td>{d.deliveryLocation || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ padding: "1.5rem 2rem", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: "1rem", background: "#f8fafc" }}>
              <button className="btn btn-outline" onClick={() => setViewDetailPO(null)} style={{ padding: "0.75rem 1.5rem" }}>
                Đóng lại
              </button>
              <button 
                className="btn btn-primary" 
                style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}
                onClick={() => {
                  setViewDetailPO(null);
                  openCreateModal(viewDetailPO);
                }}
              >
                Tiến hành lập Đơn mua hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {viewDetailInv && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
          <div className="card" style={{ width: "95%", maxWidth: "900px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0, borderTop: "6px solid #3b82f6" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h2 style={{ margin: 0, color: "#1e293b" }}>Chi tiết Đơn mua hàng</h2>
                <div style={{ fontSize: "1.1rem", color: "#2563eb", fontWeight: 700, marginTop: "0.25rem" }}>{viewDetailInv.invoiceCode}</div>
              </div>
              <button className="btn-icon" onClick={() => setViewDetailInv(null)}><X size={28} /></button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "1.5rem", background: "#f8fafc", padding: "1.25rem", borderRadius: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Nhà cung cấp</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{viewDetailInv.supplier}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Kho nhập</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{viewDetailInv.warehouseName}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Ngày giao dự kiến</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "#e11d48" }}>{new Date(viewDetailInv.deliveryDate).toLocaleDateString("vi-VN")}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Người tạo</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{viewDetailInv.creator}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Lệnh mua liên quan</label>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{viewDetailInv.poCode || "—"}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Trạng thái</label>
                  <span className="badge badge-success" style={{ fontSize: "0.85rem" }}>{viewDetailInv.status}</span>
                </div>
              </div>

              {viewDetailInv.note && (
                <div style={{ marginBottom: "2rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.5rem" }}>Ghi chú đơn mua</label>
                  <div style={{ padding: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    {viewDetailInv.note}
                  </div>
                </div>
              )}

              <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#334155" }}>
                <ShoppingCart size={20} /> Danh mục hàng hóa
              </h3>
              
              <div className="table-container" style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead style={{ background: "#f1f5f9" }}>
                    <tr>
                      <th>Mã hàng</th>
                      <th>Tên sản phẩm</th>
                      <th style={{ textAlign: "center" }}>Yêu cầu</th>
                      <th style={{ textAlign: "center" }}>Mua thực tế</th>
                      <th>ĐVT</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewDetailInv.purchaseinvoicedetail || []).map((d: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "#475569" }}>{d.productCode}</td>
                        <td style={{ fontWeight: 500 }}>{d.productName}</td>
                        <td style={{ textAlign: "center" }}>{d.requestedQuantity}</td>
                        <td style={{ textAlign: "center", fontSize: "1.1rem", fontWeight: 700, color: "#2563eb" }}>{d.purchasedQuantity}</td>
                        <td>{d.unit}</td>
                        <td>{d.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ padding: "1.25rem 2rem", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: "1rem", background: "#f8fafc" }}>
              <button className="btn btn-outline" onClick={() => setViewDetailInv(null)}>Đóng</button>
              <button className="btn btn-primary" onClick={() => { setViewDetailInv(null); openEditModal(viewDetailInv); }}>Sửa đơn mua</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyRecordId && (
        <HistoryModal 
          tableName="PurchaseInvoice" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}


      {/* Modal for Creating/Editing Invoice */}
      {isModalOpen && (selectedPO || editingInvoice) && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div className="card" style={{ width: "95%", maxWidth: "1100px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}>
            <div style={{ padding: "1.25rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h3 style={{ margin: 0 }}>{editingInvoice ? "Chỉnh sửa đơn mua hàng" : "Tạo đơn mua hàng"}</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  {editingInvoice ? `Mã đơn: ${editingInvoice.invoiceCode}` : `Từ lệnh mua: ${selectedPO?.poCode}`}
                </p>
              </div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "2rem" }}>
                <div>
                  <label className="form-label">Nhà cung cấp *</label>
                  <input type="text" name="supplier" className="input" required defaultValue={editingInvoice?.supplier || ""} placeholder="Nhập tên nhà cung cấp..." />
                </div>
                <div>
                  <label className="form-label">Ngày giao dự kiến *</label>
                  <input type="date" name="deliveryDate" className="input" required defaultValue={editingInvoice ? new Date(editingInvoice.deliveryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="form-label">Chi nhánh</label>
                  <input type="text" value={editingInvoice?.branch || selectedPO?.branch || ""} className="input" readOnly style={{ background: "#f1f5f9" }} />
                </div>
                <div>
                  <label className="form-label">Loại phiếu *</label>
                  <select name="invoiceType" className="input" defaultValue={editingInvoice?.invoiceType || "Nhập kho"}>
                    <option value="Nhập kho">Nhập kho</option>
                    <option value="Xuất kho">Xuất kho</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Nơi giao *</label>
                  <select name="warehouseName" className="input" defaultValue={editingInvoice?.warehouseName || selectedPO?.deliveryLocation || ""} required>
                    <option value="">-- Chọn kho nhận --</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.name}>{wh.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Ghi chú đơn mua</label>
                  <textarea name="note" className="input" rows={2} defaultValue={editingInvoice?.note || ""} placeholder="Nhập ghi chú chung cho đơn mua..." style={{ resize: "none" }}></textarea>
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ margin: 0, color: "#475569", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShoppingCart size={18} /> Chi tiết mặt hàng
                </h4>
              </div>

              <div className="table-container" style={{ border: "1px solid #e2e8f0" }}>
                <table className="table">
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ width: "250px" }}>Tên hàng & Mã</th>
                      <th style={{ width: "120px" }}>SL yêu cầu</th>
                      <th style={{ width: "120px" }}>Số lượng mua *</th>
                      <th style={{ width: "100px" }}>ĐVT</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((d, index) => (
                      <tr key={index}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{d.productName}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{d.productCode}</div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input 
                            type="number" 
                            className="input" 
                            value={d.requestedQuantity}
                            readOnly
                            style={{ background: "#f8fafc", textAlign: "center", border: "none" }}
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="input" 
                            value={d.purchasedQuantity}
                            onChange={(e) => handleDetailChange(index, "purchasedQuantity", e.target.value)}
                            min="0"
                            step="0.01"
                            required
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>{d.unit}</td>
                        <td>
                          <input 
                            type="text" 
                            className="input" 
                            value={d.note}
                            onChange={(e) => handleDetailChange(index, "note", e.target.value)}
                            placeholder="Ghi chú SP..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  <Save size={18} /> {isPending ? "Đang xử lý..." : (editingInvoice ? "Cập nhật đơn mua" : "Hoàn tất tạo đơn mua")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .po-item:hover {
          background-color: #f0f7ff;
          border-color: #3b82f6 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .invoice-card {
          transition: all 0.2s;
        }
        .invoice-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .form-label {
          display: block;
          margin-bottom: 0.4rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
        }
      `}</style>
    </div>
  );
}

function InfoItem({ icon, label, value }: any) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
      <div style={{ color: "#94a3b8", marginTop: "2px" }}>{icon}</div>
      <div>
        <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}
