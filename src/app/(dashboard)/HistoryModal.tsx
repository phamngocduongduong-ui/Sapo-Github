"use client";

import { useState, useEffect } from "react";
import { Clock, User, Info, ArrowRight } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  changeDetail: string | null;
  changedBy: string;
  createdAt: string;
  oldData: any;
  newData: any;
}

const fieldLabels: Record<string, string> = {
  // Hợp đồng (Contract)
  contractNumber: "Số hợp đồng",
  contractDate: "Ngày hợp đồng",
  seller: "Người bán",
  buyer: "Người mua",
  deliveryDate: "Thời gian giao hàng",
  portOfLoading: "Cảng xếp hàng",
  portOfDischarge: "Cảng dỡ hàng",
  transshipment: "Chuyển tải",
  partialShipment: "Giao hàng từng phần",
  deliveryTerms: "Điều kiện giao hàng",
  paymentMethod: "Phương thức thanh toán",
  paymentTerms: "Điều khoản thanh toán",
  bankAccount: "Tài khoản ngân hàng",
  accompanyingDocuments: "Chứng từ kèm theo",
  expiryDate: "Ngày hết hạn",
  thermometer: "Nhiệt kế",
  thermometerQty: "Số lượng nhiệt kế",
  pallet: "Sử dụng Pallet",
  salesEmployee: "Nhân viên Kinh doanh",
  status: "Trạng thái",
  note: "Ghi chú",

  // Đơn hàng (Order)
  orderCode: "Mã đơn hàng",
  customerCode: "Mã khách hàng",
  employeeName: "Nhân viên thực hiện",
  branch: "Chi nhánh",
  requestDeliveryDate: "Thời gian đề nghị",
  shipDate: "Ngày xuất hàng",
  isCombined: "Đơn đóng ghép",
  combinedOrderCode: "Mã đơn ghép",
  contractitem: "Chi tiết hàng hóa",
  orderitem: "Chi tiết hàng hóa"
};

const ignoredFields = new Set([
  "id", "createdAt", "updatedAt", "attachments", "contractId", "orderId"
]);

const formatValue = (key: string, value: any) => {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }
  if (["contractDate", "expiryDate", "requestDeliveryDate", "shipDate", "orderDate"].includes(key)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("vi-VN");
    }
  }
  if (["contractitem", "orderitem"].includes(key) && Array.isArray(value)) {
    if (value.length === 0) return "Không có hàng hóa";
    return value.map(item => `${item.productName || item.productCode || "Sản phẩm"} (${item.quantity || 0})`).join(", ");
  }
  return String(value);
};

const isDifferent = (key: string, val1: any, val2: any) => {
  if (val1 === val2) return false;
  if (!val1 && !val2) return false;
  if (formatValue(key, val1) === formatValue(key, val2)) return false;
  return true;
};

export default function HistoryModal({ 
  tableName, 
  recordId, 
  onClose 
}: { 
  tableName: string; 
  recordId: string; 
  onClose: () => void 
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/audit-logs?tableName=${tableName}&recordId=${recordId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          console.error("API did not return an array:", data);
          setLogs([]);
        }
      } catch (e) {
        console.error("Failed to fetch audit logs:", e);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [tableName, recordId]);

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="card" style={{ width: "100%", maxWidth: "600px", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0 }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", color: "#000000", fontWeight: 700 }}>
            <Clock size={20} color="var(--primary-color)" /> Lịch sử thay đổi
          </h3>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: "1.5rem" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#000000", fontWeight: 600 }}>Đang tải...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#000000", fontWeight: 600 }}>Chưa có lịch sử cho dòng này.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {logs.map((log) => (
                <div key={log.id} style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: "1.25rem", position: "relative" }}>
                  <div style={{ position: "absolute", left: "-6px", top: "4px", width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6" }}></div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span className={`badge ${getActionColor(log.action)}`} style={{ fontSize: "0.75rem" }}>{log.action}</span>
                    <span style={{ fontSize: "0.8rem", color: "#000000", fontWeight: 600 }}>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#000000", marginBottom: "0.25rem" }}>{log.changeDetail || "Không có chi tiết"}</div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#000000", fontWeight: 600 }}>
                    <User size={14} /> Thực hiện bởi: <span style={{ fontWeight: 600, color: "#000000" }}>{log.changedBy}</span>
                  </div>

                  {((log.action === "UPDATE" || log.action === "STATUS_CHANGE") && log.oldData && log.newData) && (() => {
                    let oldObj = log.oldData;
                    let newObj = log.newData;
                    if (typeof oldObj === "string") {
                      try { oldObj = JSON.parse(oldObj); } catch (e) {}
                    }
                    if (typeof newObj === "string") {
                      try { newObj = JSON.parse(newObj); } catch (e) {}
                    }
                    
                    if (oldObj && newObj && typeof oldObj === "object" && typeof newObj === "object" && !Array.isArray(oldObj) && !Array.isArray(newObj)) {
                      const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
                        .filter(key => !ignoredFields.has(key) && isDifferent(key, oldObj[key], newObj[key]));

                      if (allKeys.length === 0) return null;
                      
                      return (
                        <div style={{ marginTop: "0.75rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", color: "#000000", fontWeight: 600 }}>
                           {allKeys.map(key => {
                             const label = fieldLabels[key] || key;
                             return (
                               <div key={key} style={{ marginBottom: "0.25rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" }}>
                                 <strong style={{ color: "#475569" }}>{label}:</strong>
                                 <span>{formatValue(key, oldObj[key])}</span>
                                 <ArrowRight size={12} style={{ color: "#64748b" }} />
                                 <span style={{ color: "#2563eb", fontWeight: 700 }}>{formatValue(key, newObj[key])}</span>
                               </div>
                             );
                           })}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #eee", textAlign: "right" }}>
          <button className="btn btn-outline" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

function getActionColor(action: string) {
  switch (action) {
    case "CREATE": return "badge-success";
    case "UPDATE": return "badge-warning";
    case "DELETE": return "badge-danger";
    case "STATUS_CHANGE": return "badge-info";
    default: return "";
  }
}
