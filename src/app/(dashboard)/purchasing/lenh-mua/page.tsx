"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Plus, Trash2, Edit, Send, Undo2, History, X, Save, RefreshCw,
  MoreHorizontal, CheckCircle, PowerOff, Mail, Clock, AlertTriangle
} from "lucide-react";
import { 
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, 
  deletePurchaseOrder, updatePOStatus, getProducts, getWarehouses
} from "./actions";
import HistoryModal from "../../HistoryModal";

export default function PurchaseOrderPage() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("Tạo mới");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string, status: string, info: string } | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);


  useEffect(() => {
    fetchData();
    fetchProducts();
    fetchWarehouses();
    fetchUser();
  }, []);

  async function fetchData() {
    const data = await getPurchaseOrders();
    setItems(data);
  }

  async function fetchProducts() {
    const data = await getProducts();
    setProducts(data);
  }

  async function fetchWarehouses() {
    const data = await getWarehouses();
    setWarehouses(data);
  }

  async function fetchUser() {
    const res = await fetch("/api/user-permissions");
    const data = await res.json();
    setCurrentUser(data);
  }

  const handleAddDetail = () => {
    setDetails([...details, { productCode: "", productName: "", requestedQuantity: 1, unit: "", note: "" }]);
  };

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...details];
    newDetails[index][field] = value;
    
    if (field === "productCode") {
      const product = products.find(p => p.code === value);
      newDetails[index].productName = product ? product.name : "";
      // Reset unit when product changes
      newDetails[index].unit = (product?.unit?.[0]?.name) || "";
    }
    
    setDetails(newDetails);
  };

  const openAddModal = () => {
    setEditingPO(null);
    setDetails([]);
    setIsModalOpen(true);
  };

  const openEditModal = (po: any) => {
    setEditingPO(po);
    setDetails(po.purchaseorderdetail || []);
    setIsModalOpen(true);
  };


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        if (editingPO) {
          await updatePurchaseOrder(editingPO.id, formData, details);
        } else {
          await createPurchaseOrder(formData, details);
        }
        setIsModalOpen(false);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lệnh mua này?")) return;
    startTransition(async () => {
      await deletePurchaseOrder(id);
      fetchData();
    });
  };

  const handleStatusChange = (id: string, status: string, info?: string) => {
    setConfirmUpdate({ id, status, info: info || "" });
  };

  const executeStatusChange = () => {
    if (!confirmUpdate) return;
    const { id, status } = confirmUpdate;
    setConfirmUpdate(null);
    startTransition(async () => {
      await updatePOStatus(id, status);
      fetchData();
    });
  };

  const executeDelete = () => {
    if (!confirmUpdate) return;
    const { id } = confirmUpdate;
    setConfirmUpdate(null);
    startTransition(async () => {
      await deletePurchaseOrder(id);
      fetchData();
    });
  };

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === "Chờ thực hiện").length,
    completed: items.filter(i => i.status === "Đã hoàn thành" || i.status === "Đã phê duyệt").length
  };

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      {/* Header & Refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>📋 Lệnh mua (Purchase Orders)</h1>
          <p style={{ color: "#64748b", marginTop: "0.5rem" }}>Quản lý lệnh mua vật tư, nguyên liệu và dịch vụ</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <RefreshCw size={18} /> Làm mới
          </button>
          <button className="btn btn-primary" onClick={openAddModal} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={18} /> Tạo lệnh mua mới
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {["Tạo mới", "Chờ phê duyệt", "Chờ mua hàng", "Chờ giao hàng", "Đã nhập kho"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn btn-sm ${activeTab === tab ? "btn-primary" : "btn-outline"}`}
            style={{ borderRadius: "20px", padding: "0.5rem 1.25rem", whiteSpace: "nowrap" }}
          >
            {tab} ({items.filter(i => {
              if (tab === "Chờ mua hàng") return i.status === "Chờ mua hàng" || i.status === "Chờ thực hiện";
              return i.status === tab;
            }).length})
          </button>
        ))}
      </div>


      {/* Main Table */}
      <div className="card" style={{ padding: "0" }}>
        <div style={{ padding: "1.25rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Danh sách lệnh mua - {activeTab}</h3>
        </div>
        <div className="table-container" style={{ margin: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Mã lệnh</th>
                <th>Người tạo</th>
                <th>Ngày tạo</th>
                <th>Ngày đề nghị</th>
                <th>Mục đích</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter(item => {
                  if (activeTab === "Chờ mua hàng") return item.status === "Chờ mua hàng" || item.status === "Chờ thực hiện";
                  return item.status === activeTab;
                })
                .length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Không có lệnh mua nào trong trạng thái này</td></tr>
              ) : (
                items
                  .filter(item => {
                    if (activeTab === "Chờ mua hàng") return item.status === "Chờ mua hàng" || item.status === "Chờ thực hiện";
                    return item.status === activeTab;
                  })
                  .map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: "#2563eb" }}>{item.poCode}</td>
                    <td>{item.creator}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td>{new Date(item.requestedDate).toLocaleDateString("vi-VN")}</td>
                    <td>{item.purpose}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", position: "relative" }}>
                      <button 
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.id ? null : item.id);
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openMenuId === item.id && (
                        <div className="action-dropdown" onClick={(e) => e.stopPropagation()}>
                          <div className="dropdown-item" onClick={() => { setHistoryRecordId(item.id); setOpenMenuId(null); }}>
                            <History size={14} /> Lịch sử
                          </div>
                          
                          {item.status === "Tạo mới" && (
                            <>
                              <div className="dropdown-item" onClick={() => { openEditModal(item); setOpenMenuId(null); }}>
                                <Edit size={14} /> Chỉnh sửa
                              </div>
                              <div className="dropdown-item success" onClick={() => handleStatusChange(item.id, "Chờ phê duyệt", `Mã: ${item.poCode}`)}>
                                <Mail size={14} /> Gửi duyệt
                              </div>
                              <div className="divider"></div>
                              <div className="dropdown-item danger" onClick={() => setConfirmUpdate({ id: item.id, status: "DELETE", info: item.poCode })}>
                                <Trash2 size={14} /> Xóa lệnh mua
                              </div>
                            </>
                          )}

                          {item.status === "Chờ phê duyệt" && (
                            <>
                              {(currentUser?.username === "admin" || currentUser?.permission?.some((p: any) => p.name === "Phê duyệt" || p.name === "Admin")) ? (
                                <>
                                  <div className="dropdown-item success" onClick={() => handleStatusChange(item.id, "Chờ thực hiện", `Mã: ${item.poCode}`)}>
                                    <CheckCircle size={14} /> Phê duyệt
                                  </div>
                                  <div className="dropdown-item danger" onClick={() => handleStatusChange(item.id, "Tạo mới", `Mã: ${item.poCode}`)}>
                                    <X size={14} /> Từ chối
                                  </div>
                                </>
                              ) : (
                                <div className="dropdown-item warning" onClick={() => handleStatusChange(item.id, "Tạo mới", `Mã: ${item.poCode}`)}>
                                  <Undo2 size={14} /> Thu hồi
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {historyRecordId && (
        <HistoryModal 
          tableName="PurchaseOrder" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "95%", maxWidth: "1000px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{editingPO ? "Chỉnh sửa lệnh mua" : "Tạo lệnh mua mới"}</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Người tạo</label>
                  <input type="text" className="input" value={editingPO ? editingPO.creator : (currentUser?.employeeName || "")} readOnly style={{ background: "#f8fafc" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Chi nhánh *</label>
                  {editingPO ? (
                    <input type="text" className="input" value={editingPO.branch} readOnly style={{ background: "#f8fafc" }} />
                  ) : (
                    currentUser?.branch?.split(",").length > 1 ? (
                      <select name="branch" className="input" required defaultValue="">
                        <option value="" disabled>-- Chọn chi nhánh --</option>
                        {currentUser.branch.split(",").map((b: string) => (
                          <option key={b.trim()} value={b.trim()}>{b.trim()}</option>
                        ))}
                      </select>
                    ) : (

                      <input type="text" name="branch" className="input" value={currentUser?.branch || ""} readOnly style={{ background: "#f8fafc" }} />
                    )
                  )}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Ngày tạo</label>
                  <input type="text" className="input" value={new Date().toLocaleDateString("vi-VN")} readOnly style={{ background: "#f8fafc" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Ngày đề nghị *</label>
                  <input type="date" name="requestedDate" className="input" required defaultValue={editingPO ? new Date(editingPO.requestedDate).toISOString().split('T')[0] : ""} />
                </div>
              </div>


              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginBottom: "2rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Mục đích *</label>
                  <select name="purpose" className="input" required defaultValue={editingPO?.purpose || "Mua vật tư"}>
                    <option value="Mua vật tư">Mua vật tư</option>
                    <option value="Mua nguyên liệu">Mua nguyên liệu</option>
                    <option value="Mua máy móc">Mua máy móc</option>
                    <option value="Mua hóa chất">Mua hóa chất</option>
                    <option value="Mua vật tư bảo trì">Mua vật tư bảo trì</option>
                    <option value="Mua dịch vụ">Mua dịch vụ</option>
                    <option value="Mua khác">Mua khác</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Ghi chú</label>
                  <input type="text" name="note" className="input" defaultValue={editingPO?.note || ""} placeholder="Lý do mua hoặc ghi chú thêm..." />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Nơi giao</label>
                  <select name="deliveryLocation" className="input" defaultValue={editingPO?.deliveryLocation || ""} required>
                    <option value="">-- Chọn kho nhận --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Details Section */}
              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, color: "#475569" }}>Chi tiết lệnh mua</h4>
                <button type="button" className="btn btn-sm btn-outline" onClick={handleAddDetail} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Plus size={14} /> Thêm chi tiết
                </button>
              </div>

              <div className="table-container" style={{ marginBottom: "1rem", border: "1px solid #e2e8f0" }}>
                <table className="table">
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ width: "220px" }}>Mã & Tên hàng</th>
                      <th style={{ width: "100px" }}>Số lượng</th>
                      <th style={{ width: "120px" }}>Đơn vị tính</th>
                      <th>Ghi chú</th>
                      <th style={{ width: "50px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: "1rem", color: "#94a3b8" }}>Chưa có chi tiết hàng hóa</td></tr>
                    ) : (
                      details.map((d, index) => {
                        const selectedProduct = products.find(p => p.code === d.productCode);
                        const availableUnits = selectedProduct?.unit || [];
                        
                        return (
                          <tr key={index}>
                            <td>
                              <select 
                                className="input" 
                                style={{ border: "none", background: "transparent", padding: "0.5rem 0", height: "auto" }}
                                value={d.productCode}
                                onChange={(e) => handleDetailChange(index, "productCode", e.target.value)}
                                required
                              >
                                <option value="">-- Chọn hàng --</option>
                                {products.map(p => (
                                  <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                                ))}
                              </select>
                              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{d.productName}</div>
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="input" 
                                style={{ border: "none", background: "transparent", padding: "0.5rem 0", height: "auto" }}
                                value={d.requestedQuantity}
                                min="0.01"
                                step="0.01"
                                onChange={(e) => handleDetailChange(index, "requestedQuantity", e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <select 
                                className="input" 
                                style={{ border: "none", background: "transparent", padding: "0.5rem 0", height: "auto" }}
                                value={d.unit}
                                onChange={(e) => handleDetailChange(index, "unit", e.target.value)}
                                required
                              >
                                <option value="">-- ĐVT --</option>
                                {availableUnits.map((u: any) => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="input" 
                                style={{ border: "none", background: "transparent", padding: "0.5rem 0", height: "auto" }}
                                value={d.note}
                                placeholder="Ghi chú..."
                                onChange={(e) => handleDetailChange(index, "note", e.target.value)}
                              />
                            </td>
                            <td>
                              <button type="button" className="btn-icon" onClick={() => handleRemoveDetail(index)}><Trash2 size={14} color="#e74c3c" /></button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>


              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isPending || details.length === 0} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Save size={18} /> {isPending ? "Đang lưu..." : (editingPO ? "Cập nhật lệnh mua" : "Lưu lệnh mua")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {confirmUpdate && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: confirmUpdate.status === "DELETE" ? "#fef2f2" : "#fff7ed", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 1.5rem",
              color: confirmUpdate.status === "DELETE" ? "#ef4444" : "#f97316"
            }}>
              {confirmUpdate.status === "DELETE" ? <AlertTriangle size={32} /> : <Clock size={32} />}
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? "Gửi phê duyệt" : 
               confirmUpdate.status === "Tạo mới" ? "Thu hồi/Từ chối" : 
               confirmUpdate.status === "Chờ thực hiện" ? "Phê duyệt lệnh mua" : 
               confirmUpdate.status === "DELETE" ? "Xác nhận xóa" :
               "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", marginBottom: "2rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc muốn gửi hồ sơ để chờ phê duyệt không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <PowerOff size={16} /> Lệnh mua sẽ không được chỉnh sửa trong thời gian chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Tạo mới" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn muốn thu hồi/từ chối hồ sơ không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                    <Undo2 size={16} /> Hồ sơ sẽ không trong danh sách chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Chờ thực hiện" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn đồng ý phê duyệt lệnh mua này không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#22c55e", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#f0fdf4", padding: "8px", borderRadius: "6px" }}>
                    <CheckCircle size={16} /> Lệnh mua sẽ được chuyển sang bộ phận mua hàng để thực hiện.
                  </p>
                </>
              ) : confirmUpdate.status === "DELETE" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn muốn xóa lệnh mua này không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <Trash2 size={16} /> Dữ liệu sau khi xóa sẽ không thể khôi phục.
                  </p>
                </>
              ) : (
                <p>Bạn có chắc chắn muốn chuyển trạng thái hồ sơ này sang <strong>"{confirmUpdate.status}"</strong> không?</p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmUpdate(null)}>Hủy bỏ</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: confirmUpdate.status === "DELETE" || confirmUpdate.status === "Từ chối" ? "#ef4444" : "#2563eb" }} 
                onClick={confirmUpdate.status === "DELETE" ? executeDelete : executeStatusChange}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, color, label, value }: any) {
  return (
    <div className="card" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ background: `${color}15`, padding: "1rem", borderRadius: "12px", color: color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Tạo mới": return "badge-warning";
    case "Chờ phê duyệt": return "badge-info";
    case "Chờ thực hiện": return "badge-info";
    case "Chờ mua hàng": return "badge-info";
    case "Chờ giao hàng": return "badge-warning";
    case "Đã nhập kho": return "badge-success";
    case "Từ chối": return "badge-danger";
    default: return "";
  }
}
