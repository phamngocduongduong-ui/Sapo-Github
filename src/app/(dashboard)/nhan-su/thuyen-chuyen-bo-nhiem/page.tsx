"use client";

import { useState, useEffect, useTransition } from "react";
import { Check } from "lucide-react";
import { getTransferPromotions, createTransferPromotion, updateTransferStatus } from "./actions";
import { getEmployees } from "../tang-giam-luong/actions";

export default function TransferPromotionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [data, empData] = await Promise.all([
      getTransferPromotions(),
      getEmployees()
    ]);
    setItems(data);
    setEmployees(empData);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createTransferPromotion(formData);
      setIsModalOpen(false);
      fetchData();
    });
  }

  function handleStatusUpdate(id: string, status: string) {
    if (!confirm(`Xác nhận chuyển trạng thái sang "${status}"?`)) return;
    startTransition(async () => {
      await updateTransferStatus(id, status);
      fetchData();
    });
  }

  return (
    <div className="page-container" style={{ padding: "2rem" }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>🔄 Thuyên chuyển, Bổ nhiệm</h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Điều chuyển vị trí và bổ nhiệm chức vụ nhân viên</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Thêm đề xuất</button>
      </div>
      
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Chi nhánh</th>
                <th>Vị trí cũ</th>
                <th>Vị trí mới</th>
                <th>Ngày hiệu lực</th>
                <th>Trạng thái</th>
                <th style={{ width: "200px", textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>Chưa có dữ liệu</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.employeeName}</td>
                    <td>{item.branch}</td>
                    <td>{item.currentPosition} ({item.currentDepartment})</td>
                    <td style={{ color: "var(--primary-color)", fontWeight: 600 }}>{item.newPosition} ({item.newDepartment})</td>
                    <td>{new Date(item.effectiveDate).toLocaleDateString("vi-VN")}</td>
                    <td>
                      <span className={`badge ${item.status === "Đã phê duyệt" ? "badge-success" : item.status === "Chờ phê duyệt" ? "badge-primary" : "badge-warning"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", whiteSpace: "nowrap" }}>
                        {item.status === "Đã phê duyệt" ? (
                          <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                            <Check size={14} /> Hoàn tất
                          </span>
                        ) : (
                          <>
                            {item.status === "Tạo mới" && (
                              <button onClick={() => handleStatusUpdate(item.id, "Chờ phê duyệt")} className="btn btn-sm btn-primary">Gửi</button>
                            )}
                            {item.status === "Chờ phê duyệt" && (
                              <>
                                <button onClick={() => handleStatusUpdate(item.id, "Đã phê duyệt")} className="btn btn-sm btn-success">Duyệt</button>
                                <button onClick={() => handleStatusUpdate(item.id, "Tạo mới")} className="btn btn-sm btn-warning">Trả lại</button>
                              </>
                            )}
                            <button onClick={() => handleStatusUpdate(item.id, "Đã hủy")} className="btn btn-sm btn-danger">Hủy</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "600px", margin: "1rem" }}>
            <h3>➕ Thêm đề xuất mới</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="filter-label">Nhân viên</label>
                <select name="employeeName" className="input" required>
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(e => <option key={e.id} value={e.fullName}>{e.fullName} ({e.branch})</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div><label className="filter-label">Bộ phận mới</label><input type="text" name="newDepartment" className="input" required /></div>
                <div><label className="filter-label">Chức vụ mới</label><input type="text" name="newPosition" className="input" required /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div><label className="filter-label">Bậc lương mới</label><input type="text" name="newSalaryLevel" className="input" /></div>
                <div><label className="filter-label">Ngày hiệu lực</label><input type="date" name="effectiveDate" className="input" required /></div>
              </div>
              <div><label className="filter-label">Ghi chú</label><textarea name="note" className="input" style={{ height: "80px" }}></textarea></div>
              <input type="hidden" name="creator" value="Admin" />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu đề xuất"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .filter-label { display: block; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
      `}</style>
    </div>
  );
}
