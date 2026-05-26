"use client";

import { useState } from "react";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

type HistoryItem = {
  id: string;
  type: string;
  effectiveMonth: number;
  effectiveYear: number;
  proposedSalaryLevel: string;
  reason: string | null;
  createdAt: Date;
};

export default function SalaryHistoryTimeline({ history }: { history: HistoryItem[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedHistory = isExpanded ? history : history.slice(0, 3);

  return (
    <div className="card" style={{ padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <TrendingUp size={22} color="#64748b" /> Lịch sử tăng/giảm lương
        </h3>
        {history.length > 3 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
              background: "#f1f5f9", 
              border: "none", 
              borderRadius: "50%", 
              width: "32px", 
              height: "32px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            title={isExpanded ? "Thu gọn" : "Xem tất cả"}
          >
            {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
          </button>
        )}
      </div>
      
      <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
        <div style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "2px", background: "#e2e8f0" }}></div>
        
        {displayedHistory.length > 0 ? displayedHistory.map((item, idx) => (
          <div key={item.id} style={{ position: "relative", marginBottom: "2rem", animation: "fadeIn 0.3s ease-out forwards" }}>
            <div style={{ 
              position: "absolute", 
              left: "-1.9rem", 
              top: "0.25rem", 
              width: "12px", 
              height: "12px", 
              borderRadius: "50%", 
              background: idx === 0 ? "#3b82f6" : "#cbd5e1",
              border: "3px solid #fff",
              boxShadow: "0 0 0 2px " + (idx === 0 ? "#bfdbfe" : "#f1f5f9"),
              zIndex: 1
            }}></div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, marginBottom: "0.25rem", letterSpacing: "0.025em" }}>
              THÁNG {item.effectiveMonth}/{item.effectiveYear}
            </div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "1rem" }}>{item.type}</div>
            <div style={{ fontSize: "0.95rem", color: "#475569", marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              Bậc mới: <span style={{ fontWeight: 700, color: "#3b82f6", background: "#eff6ff", padding: "2px 8px", borderRadius: "4px" }}>{item.proposedSalaryLevel}</span>
            </div>
            {item.reason && (
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.75rem", fontStyle: "italic", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", borderLeft: "3px solid #e2e8f0" }}>
                "{item.reason}"
              </div>
            )}
          </div>
        )) : (
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Chưa có lịch sử thay đổi lương.</p>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
