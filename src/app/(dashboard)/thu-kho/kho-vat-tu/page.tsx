"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Package, Clock, CheckCircle2, Search, Filter, 
  ArrowRight, FileText, User, Calendar, Plus, X, Save,
  ArrowDownToLine, ArrowUpFromLine, Inbox, RefreshCw
} from "lucide-react";
import { 
  getPendingWarehouseInvoices, getPendingWarehouseDispatches,
  getWarehouseLogs, createWarehouseLog, updateWarehouseLog, deleteWarehouseLog, rejectWarehouseInvoice
} from "./actions";

export default function WarehouseLogPage() {
  const [activeLeftTab, setActiveLeftTab] = useState<"in" | "out">("in");
  const [pendingIn, setPendingIn] = useState<any[]>([]);
  const [pendingOut, setPendingOut] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [pIn, pOut, allLogs] = await Promise.all([
      getPendingWarehouseInvoices(),
      getPendingWarehouseDispatches(),
      getWarehouseLogs()
    ]);
    setPendingIn(pIn);
    setPendingOut(pOut);
    setLogs(allLogs);
  }

  const openCreateModal = (source: any, type: "in" | "out") => {
    setEditingLog(null);
    setSelectedSource({ ...source, sourceType: type });
    
    let initialDetails: any[] = [];
    if (type === "in") {
      initialDetails = (source.purchaseinvoicedetail || []).map((d: any) => ({
        productCode: d.productCode,
        productName: d.productName,
        unit: d.unit,
        requestedQuantity: d.purchasedQuantity,
        actualQuantity: d.purchasedQuantity,
        orderCode: source.poCode || "",
        note: ""
      }));
    } else {
      initialDetails = [{
        productCode: "",
        productName: "",
        unit: "",
        requestedQuantity: 1,
        actualQuantity: 1,
        orderCode: "",
        note: ""
      }];
    }
    
    setDetails(initialDetails);
    setIsModalOpen(true);
  };

  const openManualCreateModal = () => {
    setEditingLog(null);
    setSelectedSource({ sourceType: "in" }); // Default to in
    setDetails([{
      productCode: "",
      productName: "",
      unit: "",
      requestedQuantity: 0,
      actualQuantity: 0,
      orderCode: "",
      note: ""
    }]);
    setIsModalOpen(true);
  };

  const openEditModal = (log: any) => {
    setEditingLog(log);
    setSelectedSource({ 
      sourceType: log.logType === "Nhập kho" ? "in" : "out",
      invoiceCode: log.referenceCode,
      id: log.referenceCode // fallback
    });
    setDetails(log.details.map((d: any) => ({ ...d })));
    setIsModalOpen(true);
  };

  const handleDeleteLog = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu này? Trạng thái đơn mua/lệnh mua sẽ được hoàn trả.")) return;
    startTransition(async () => {
      await deleteWarehouseLog(id);
      fetchData();
    });
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...details];
    newDetails[index][field] = value;
    setDetails(newDetails);
  };

  const addDetailRow = () => {
    setDetails([...details, {
      productCode: "",
      productName: "",
      unit: "",
      requestedQuantity: 0,
      actualQuantity: 0,
      orderCode: "",
      note: ""
    }]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      logType: selectedSource.sourceType === "in" ? "Nhập kho" : "Xuất kho",
      referenceCode: selectedSource.sourceType === "in" ? selectedSource.invoiceCode : selectedSource.id,
      subject: formData.get("subject"),
      description: formData.get("description"),
      note: formData.get("note")
    };

    startTransition(async () => {
      try {
        if (editingLog) {
          await updateWarehouseLog(editingLog.id, data, details);
        } else {
          await createWarehouseLog(data, details);
        }
        setIsModalOpen(false);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleRejectInv = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối đơn mua này và chuyển về Chờ mua hàng?")) return;
    startTransition(async () => {
      await rejectWarehouseInvoice(id);
      fetchData();
    });
  };


  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.logCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.referenceCode || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !filterDate || new Date(log.createdAt).toISOString().startsWith(filterDate);
    return matchesSearch && matchesDate;
  });

  return (
    <div style={{ padding: "1.5rem", width: "100%", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>📦 Kho vật tư</h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>Quản lý nhập xuất kho vật tư</p>
        </div>
        <button className="btn btn-primary" onClick={openManualCreateModal}>
          <Plus size={18} /> Thêm mới phiếu
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", flex: 1, overflow: "hidden" }}>
        
        {/* Left Column: Tabs */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", alignItems: "center", paddingRight: "0.5rem" }}>
            <div style={{ flex: 1, display: "flex" }}>
              <button 
                onClick={() => setActiveLeftTab("in")}
                style={{ 
                  flex: 1, padding: "1rem", border: "none", background: activeLeftTab === "in" ? "white" : "transparent",
                  borderBottom: activeLeftTab === "in" ? "2px solid #2563eb" : "none",
                  fontWeight: activeLeftTab === "in" ? 700 : 500, color: activeLeftTab === "in" ? "#2563eb" : "#64748b",
                  cursor: "pointer"
                }}
              >
                Đơn chờ giao ({pendingIn.length})
              </button>
              <button 
                onClick={() => setActiveLeftTab("out")}
                style={{ 
                  flex: 1, padding: "1rem", border: "none", background: activeLeftTab === "out" ? "white" : "transparent",
                  borderBottom: activeLeftTab === "out" ? "2px solid #2563eb" : "none",
                  fontWeight: activeLeftTab === "out" ? 700 : 500, color: activeLeftTab === "out" ? "#2563eb" : "#64748b",
                  cursor: "pointer"
                }}
              >
                Đơn xuất chờ ({pendingOut.length})
              </button>
            </div>
            <button className="btn-icon" onClick={fetchData} title="Làm mới" style={{ padding: "0.25rem", color: "#64748b" }}>
              <RefreshCw size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
            {activeLeftTab === "in" ? (
              pendingIn.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>Không có đơn chờ giao nào</div>
              ) : (
                pendingIn.map(inv => (
                  <div 
                    key={inv.id} 
                    className="source-item"
                    style={{ 
                      padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "1rem",
                      background: "white", transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 700, color: "#2563eb" }}>{inv.invoiceCode}</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{new Date(inv.deliveryDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#475569" }}><strong>Nhà cung cấp:</strong> {inv.supplier}</div>
                    <div style={{ fontSize: "0.85rem", color: "#475569" }}><strong>Kho:</strong> {inv.warehouseName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem", marginBottom: "0.75rem" }}>{inv.purchaseinvoicedetail.length} mặt hàng</div>
                    
                    <div style={{ display: "flex", justifyContent: "stretch", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                      <button 
                        className="btn btn-sm" 
                        style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem", background: "#fee2e2", color: "#dc2626", border: "none" }}
                        onClick={() => handleRejectInv(inv.id)}
                      >
                        Từ chối
                      </button>
                      <button 
                        className="btn btn-sm btn-primary" 
                        style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem" }}
                        onClick={() => openCreateModal(inv, "in")}
                      >
                        Tạo phiếu
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              pendingOut.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>Không có lệnh xuất nào</div>
              ) : (
                pendingOut.map(out => (
                  <div 
                    key={out.id} 
                    className="source-item"
                    onClick={() => openCreateModal(out, "out")}
                    style={{ 
                      padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "1rem",
                      cursor: "pointer", background: "white", transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 700, color: "#e11d48" }}>{out.id.substring(0, 8).toUpperCase()}</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{new Date(out.dispatchDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#475569" }}><strong>Nguồn:</strong> {out.origin}</div>
                    <div style={{ fontSize: "0.85rem", color: "#475569" }}><strong>Đích:</strong> {out.destination}</div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Right Column: Log List */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Inbox size={20} /> Nhật ký kho vật tư
            </h3>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button 
                onClick={fetchData}
                className="btn btn-sm btn-outline"
                style={{ borderRadius: "20px", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem" }}
              >
                <RefreshCw size={14} /> Làm mới
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar size={16} color="#64748b" />
                <input 
                  type="date" 
                  className="input btn-sm" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ width: "150px" }}
                />
              </div>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input 
                  type="text" 
                  placeholder="Tìm mã phiếu..." 
                  className="input btn-sm" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: "2rem", width: "180px" }} 
                />
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Số phiếu</th>
                  <th>Loại phiếu</th>
                  <th>Số đơn mua</th>
                  <th>Người tạo</th>
                  <th>Ngày tạo</th>
                  <th>Đối tượng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Chưa có nhật ký nào</td></tr>
                ) : (
                  filteredLogs.map(log => (
                    <React.Fragment key={log.id}>
                      <tr key={log.id} onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} style={{ cursor: "pointer" }}>
                        <td style={{ fontWeight: 700, color: "#2563eb" }}>{log.logCode}</td>
                        <td>
                          <span className={`badge ${log.logType === "Nhập kho" ? "badge-success" : "badge-warning"}`}>
                            {log.logType}
                          </span>
                        </td>
                        <td>{log.referenceCode || "—"}</td>
                        <td>{log.creator}</td>
                        <td>{new Date(log.createdAt).toLocaleDateString("vi-VN")}</td>
                        <td>{log.subject || "—"}</td>
                        <td><span className="badge badge-info">{log.status}</span></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button className="btn btn-sm btn-outline" onClick={() => openEditModal(log)}>Sửa</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteLog(log.id)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                      {/* Sub-table for details */}
                      {expandedLogId === log.id && (
                        <tr style={{ background: "#f8fafc" }}>
                          <td colSpan={8} style={{ padding: "0 1.5rem 1rem 1.5rem" }}>
                            <div style={{ padding: "1rem", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", animation: "slideInDown 0.2s ease" }}>
                              <table className="table btn-sm" style={{ margin: 0 }}>
                                <thead>
                                  <tr style={{ background: "#f1f5f9" }}>
                                    <th>Mã hàng</th>
                                    <th>Tên hàng</th>
                                    <th>ĐVT</th>
                                    <th>SL đề nghị</th>
                                    <th>SL thực tế</th>
                                    <th>Mã đơn hàng</th>
                                    <th>Ghi chú</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {log.details.map((d: any) => (
                                    <tr key={d.id}>
                                      <td>{d.productCode}</td>
                                      <td>{d.productName}</td>
                                      <td>{d.unit}</td>
                                      <td>{d.requestedQuantity}</td>
                                      <td style={{ fontWeight: 700, color: "#10b981" }}>{d.actualQuantity}</td>
                                      <td>{d.orderCode || "—"}</td>
                                      <td>{d.note || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Creating Log */}
      {isModalOpen && selectedSource && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div className="card" style={{ width: "95%", maxWidth: "1000px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}>
            <div style={{ padding: "1.25rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h3 style={{ margin: 0 }}>{editingLog ? "Chỉnh sửa phiếu" : `Lập phiếu ${selectedSource.sourceType === "in" ? "nhập kho" : "xuất kho"}`}</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  {editingLog ? `Số phiếu: ${editingLog.logCode}` : (selectedSource.id ? `Nguồn: ${selectedSource.sourceType === "in" ? selectedSource.invoiceCode : selectedSource.id.substring(0,8)}` : "Tạo thủ công")}
                </p>
              </div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "2rem" }}>
                <div>
                  <label className="form-label">Loại phiếu</label>
                  <select name="logType" className="input" defaultValue={editingLog?.logType || (selectedSource.sourceType === "in" ? "Nhập kho" : "Xuất kho")} disabled={!!editingLog}>
                    <option value="Nhập kho">Nhập kho</option>
                    <option value="Xuất kho">Xuất kho</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Đối tượng</label>
                  <input type="text" name="subject" className="input" defaultValue={editingLog?.subject || selectedSource.supplier || selectedSource.employeeName || ""} placeholder="Tên khách hàng / nhà cung cấp / nhân viên..." />
                </div>
                <div>
                  <label className="form-label">Ngày hiện tại</label>
                  <input type="text" className="input" value={editingLog ? new Date(editingLog.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")} readOnly style={{ background: "#f1f5f9" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Diễn giải</label>
                  <input type="text" name="description" className="input" defaultValue={editingLog?.description || ""} placeholder="Nội dung diễn giải..." />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Ghi chú</label>
                  <textarea name="note" className="input" rows={2} defaultValue={editingLog?.note || ""} placeholder="Ghi chú thêm..." style={{ resize: "none" }}></textarea>
                </div>
              </div>

              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, color: "#475569" }}>Chi tiết hàng hóa</h4>
                {selectedSource.sourceType === "out" && (
                  <button type="button" className="btn btn-sm btn-outline" onClick={addDetailRow}>
                    <Plus size={14} /> Thêm dòng
                  </button>
                )}
              </div>

              <div className="table-container" style={{ border: "1px solid #e2e8f0" }}>
                <table className="table">
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th>Mã hàng</th>
                      <th>Tên hàng</th>
                      <th>ĐVT</th>
                      <th style={{ width: "120px" }}>SL đề nghị</th>
                      <th style={{ width: "120px" }}>SL thực tế *</th>
                      <th>Mã đơn hàng</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((d, index) => (
                      <tr key={index}>
                        <td>
                          <input 
                            type="text" 
                            className="input btn-sm" 
                            value={d.productCode} 
                            onChange={(e) => handleDetailChange(index, "productCode", e.target.value)}
                            placeholder="Mã..."
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="input btn-sm" 
                            value={d.productName} 
                            onChange={(e) => handleDetailChange(index, "productName", e.target.value)}
                            placeholder="Tên..."
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="input btn-sm" 
                            value={d.unit} 
                            onChange={(e) => handleDetailChange(index, "unit", e.target.value)}
                            style={{ width: "60px" }}
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="input btn-sm" 
                            value={d.requestedQuantity} 
                            onChange={(e) => handleDetailChange(index, "requestedQuantity", e.target.value)}
                            style={{ textAlign: "center" }}
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="input btn-sm" 
                            value={d.actualQuantity} 
                            onChange={(e) => handleDetailChange(index, "actualQuantity", e.target.value)}
                            style={{ textAlign: "center", border: "1px solid #3b82f6" }}
                            required
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="input btn-sm" 
                            value={d.orderCode} 
                            onChange={(e) => handleDetailChange(index, "orderCode", e.target.value)}
                            placeholder="Mã ĐH..."
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="input btn-sm" 
                            value={d.note} 
                            onChange={(e) => handleDetailChange(index, "note", e.target.value)}
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
                  <Save size={18} /> {isPending ? "Đang lưu..." : (editingLog ? "Cập nhật phiếu" : "Xác nhận nhập/xuất kho")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .source-item:hover {
          background-color: #f0f7ff !important;
          border-color: #3b82f6 !important;
          transform: translateX(4px);
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
