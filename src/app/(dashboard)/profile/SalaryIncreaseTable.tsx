"use client";

import { useState } from "react";
import { prisma } from "@/lib/db";
import HistoryModal from "../HistoryModal";

type SalaryRequest = {
  id: string;
  createdAt: Date;
  currentSalary: number | null;
  proposedSalary: number;
  reason: string;
  status: string;
  approver: string | null;
  note: string | null;
};

export default function SalaryIncreaseTable({ 
  initialRequests,
  onAddRequest 
}: { 
  initialRequests: SalaryRequest[],
  onAddRequest: (formData: FormData) => Promise<void>
}) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await onAddRequest(formData);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0 }}>Lịch sử Đề xuất Tăng lương</h3>
        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Tạo đề xuất mới
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ngày tạo</th>
              <th>Lương hiện tại</th>
              <th>Lương đề xuất</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
              <th style={{ width: "100px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialRequests.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>
                  Chưa có đề xuất nào
                </td>
              </tr>
            ) : (
              initialRequests.map((req) => (
                <tr key={req.id}>
                  <td>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td>{req.currentSalary?.toLocaleString()} VNĐ</td>
                  <td style={{ fontWeight: 600, color: "#27ae60" }}>
                    {req.proposedSalary.toLocaleString()} VNĐ
                  </td>
                  <td>{req.reason}</td>
                  <td>
                    <span className={`badge ${
                      req.status === "Đã phê duyệt" ? "badge-success" : 
                      req.status === "Từ chối" ? "badge-danger" : "badge-warning"
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td>{req.note || "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => setHistoryRecordId(req.id)}
                      title="Lịch sử thay đổi"
                    >
                      Lịch sử
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ 
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", 
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", padding: "1.5rem" }}>
            <h3>💰 Đề xuất tăng lương</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label>Lương hiện tại (VNĐ)</label>
                <input type="number" name="currentSalary" className="input" placeholder="Ví dụ: 10000000" />
              </div>
              <div>
                <label>Lương đề xuất (VNĐ) *</label>
                <input type="number" name="proposedSalary" className="input" required placeholder="Ví dụ: 12000000" />
              </div>
              <div>
                <label>Lý do đề xuất *</label>
                <textarea name="reason" className="input" required rows={4} placeholder="Nêu rõ lý do và thành tích đạt được..."></textarea>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang gửi..." : "Gửi đề xuất"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal 
          tableName="SalaryIncreaseRequest" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}
    </>
  );
}
