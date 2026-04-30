"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, Send, RotateCcw, X, Plus } from "lucide-react";
import { createResignation, updateResignationStatus } from "./actions";

interface ResignationTableProps {
  initialData: any[];
  employees: any[];
  canApprove: boolean;
}

export default function ResignationTable({ initialData, employees, canApprove }: ResignationTableProps) {
  const [data, setData] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái thành ${newStatus}?`)) return;
    
    startTransition(async () => {
      try {
        await updateResignationStatus(id, newStatus);
        window.location.reload();
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} /> Đăng ký nghỉ việc
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th>Nhân viên</th>
              <th>Chi nhánh</th>
              <th>Ngày nghỉ việc</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th style={{ width: "250px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{item.employeeName}</td>
                <td>{item.branch || "—"}</td>
                <td>{new Date(item.resignationDate).toLocaleDateString("vi-VN")}</td>
                <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.reason}</td>
                <td>
                  <span className={`badge ${
                    item.status === "Đã phê duyệt" ? "badge-success" : 
                    item.status === "Chờ phê duyệt" ? "badge-warning" : 
                    item.status === "Đã hủy" ? "badge-danger" : "badge-info"
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    {item.status === "Tạo mới" && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(item.id, "Chờ phê duyệt")}>Gửi</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleStatusChange(item.id, "Đã hủy")}>Hủy</button>
                      </>
                    )}
                    {item.status === "Chờ phê duyệt" && (
                      <button className="btn btn-sm btn-warning" onClick={() => handleStatusChange(item.id, "Tạo mới")}>Thu hồi</button>
                    )}
                    {item.status === "Đã phê duyệt" && (
                      <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Check size={14} /> Hoàn tất
                      </span>
                    )}
                    {item.status === "Đã hủy" && (
                      <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600 }}>Đã hủy</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Chưa có yêu cầu nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3>📄 Đăng ký nghỉ việc</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <form action={async (formData) => {
              try {
                await createResignation(formData);
                setIsModalOpen(false);
                window.location.reload();
              } catch (error: any) {
                alert(error.message);
              }
            }}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <label style={{ width: "180px", fontWeight: 600 }}>Nhân viên *</label>
                  <select name="employeeName" className="input" required style={{ flex: 1 }}>
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map(e => <option key={e.id} value={e.fullName}>{e.fullName} ({e.employeeCode})</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <label style={{ width: "180px", fontWeight: 600 }}>Ngày nghỉ việc *</label>
                  <input type="date" name="resignationDate" className="input" required style={{ flex: 1 }} />
                </div>

                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <label style={{ width: "180px", fontWeight: 600, marginTop: "0.5rem" }}>Lý do *</label>
                  <textarea name="reason" className="input" required style={{ flex: 1, minHeight: "80px", padding: "0.75rem" }} placeholder="Nhập lý do nghỉ việc..."></textarea>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <label style={{ width: "180px", fontWeight: 600, marginTop: "0.5rem" }}>Ghi chú</label>
                  <textarea name="note" className="input" style={{ flex: 1, minHeight: "60px", padding: "0.75rem" }} placeholder="Ghi chú thêm (nếu có)"></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Hủy</button>
                <button type="submit" className="btn btn-primary">Gửi yêu cầu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
