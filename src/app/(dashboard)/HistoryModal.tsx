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
        setLogs(data);
      } catch (e) {
        console.error(e);
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
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={20} color="var(--primary-color)" /> Lịch sử thay đổi
          </h3>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: "1.5rem" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>Đang tải...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#888" }}>Chưa có lịch sử cho dòng này.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {logs.map((log) => (
                <div key={log.id} style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: "1.25rem", position: "relative" }}>
                  <div style={{ position: "absolute", left: "-6px", top: "4px", width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6" }}></div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span className={`badge ${getActionColor(log.action)}`} style={{ fontSize: "0.75rem" }}>{log.action}</span>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>{log.changeDetail || "Không có chi tiết"}</div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#64748b" }}>
                    <User size={14} /> Thực hiện bởi: <span style={{ fontWeight: 600, color: "#1e293b" }}>{log.changedBy}</span>
                  </div>

                  {log.action === "UPDATE" && log.oldData && log.newData && (
                    <div style={{ marginTop: "0.75rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem" }}>
                       {Object.keys(log.newData).map(key => {
                         if (log.oldData[key] !== log.newData[key]) {
                           return (
                             <div key={key} style={{ marginBottom: "0.25rem" }}>
                               <strong style={{ color: "#475569" }}>{key}:</strong> {String(log.oldData[key] || "—")} <ArrowRight size={12} style={{ margin: "0 4px" }} /> <span style={{ color: "#3b82f6", fontWeight: 600 }}>{String(log.newData[key])}</span>
                             </div>
                           );
                         }
                         return null;
                       })}
                    </div>
                  )}
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
