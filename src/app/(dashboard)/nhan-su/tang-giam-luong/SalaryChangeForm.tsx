"use client";

import { useState, useEffect } from "react";
import { getEmployees, getCurrentUser, getCurrentEmployeeSalaryLevel } from "./actions";

interface SalaryChangeFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export default function SalaryChangeForm({ onClose, onSubmit, initialData }: SalaryChangeFormProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: initialData?.type || "Tăng lương",
    isSelf: initialData ? initialData.isSelf : true,
    employeeName: initialData?.employeeName || "",
    currentSalaryLevel: initialData?.currentSalaryLevel || "",
    proposedSalaryLevel: initialData?.proposedSalaryLevel || "",
    effectiveMonth: initialData?.effectiveMonth || new Date().getMonth() + 1,
    effectiveYear: initialData?.effectiveYear || new Date().getFullYear(),
    creator: initialData?.creator || "",
    reason: initialData?.reason || "",
    note: initialData?.note || "",
    requestDate: initialData ? new Date(initialData.requestDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser();
      const emps = await getEmployees();
      setCurrentUser(user);
      setEmployees(emps);
      
      if (!initialData && user) {
        setFormData(prev => ({ 
          ...prev, 
          employeeName: user.employeeName || user.username,
          creator: user.employeeName || user.username
        }));
        // Get initial salary level
        const level = await getCurrentEmployeeSalaryLevel(user.employeeName || user.username);
        setFormData(prev => ({ ...prev, currentSalaryLevel: level }));
      }
    }
    init();
  }, [initialData]);

  const handleIsSelfChange = async (isSelf: boolean) => {
    let name = "";
    if (isSelf) {
      name = currentUser?.employeeName || currentUser?.username || "";
    } else {
      name = employees[0]?.fullName || "";
    }
    
    const level = await getCurrentEmployeeSalaryLevel(name);
    setFormData(prev => ({ 
      ...prev, 
      isSelf, 
      employeeName: name,
      currentSalaryLevel: level
    }));
  };

  const handleEmployeeChange = async (name: string) => {
    const level = await getCurrentEmployeeSalaryLevel(name);
    setFormData(prev => ({ ...prev, employeeName: name, currentSalaryLevel: level }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h2>Thêm mới đề nghị Tăng/Giảm lương</h2>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>
        <div className="modal-body">
          <form id="salary-change-form" onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData);
          }}>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Ngày đề nghị</label>
                <input type="date" className="form-control" value={formData.requestDate} disabled />
              </div>
              <div className="form-group">
                <label>Loại đề nghị</label>
                <select 
                  className="form-control" 
                  value={formData.type} 
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Tăng lương">Tăng lương</option>
                  <option value="Giảm lương">Giảm lương</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={formData.isSelf} 
                  onChange={(e) => handleIsSelfChange(e.target.checked)}
                />
                Đối tượng là Bản thân
              </label>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Nhân viên</label>
              {formData.isSelf ? (
                <input type="text" className="form-control" value={formData.employeeName} disabled />
              ) : (
                <select 
                  className="form-control" 
                  value={formData.employeeName}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName} ({emp.employeeCode})</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
              <div className="form-group">
                <label>Bậc lương hiện tại</label>
                <input type="text" className="form-control" value={formData.currentSalaryLevel} disabled />
              </div>
              <div className="form-group">
                <label>Bậc lương đề nghị</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.proposedSalaryLevel}
                  onChange={(e) => setFormData({ ...formData, proposedSalaryLevel: e.target.value })}
                  placeholder="VD: Bậc 2"
                  required
                />
              </div>
            </div>

            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
              <div className="form-group">
                <label>Tháng áp dụng</label>
                <select 
                  className="form-control" 
                  value={formData.effectiveMonth}
                  onChange={(e) => setFormData({ ...formData, effectiveMonth: parseInt(e.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Năm áp dụng</label>
                <select 
                  className="form-control" 
                  value={formData.effectiveYear}
                  onChange={(e) => setFormData({ ...formData, effectiveYear: parseInt(e.target.value) })}
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Lý do (Có thể chọn nhiều)</label>
              <div style={{ 
                border: "1px solid #ddd", 
                borderRadius: "8px", 
                padding: "1rem", 
                maxHeight: "150px", 
                overflowY: "auto",
                background: "#f9f9f9",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem"
              }}>
                {(formData.type === "Tăng lương" ? [
                  "Cống hiến", "Hiệu quả tốt", "Năng lực tốt", "Tư duy tốt", "Đạt KPI", 
                  "Siêng năng", "Thông minh", "Nhanh nhẹn", "Sáng tạo", "tăng cấp bậc/vị trí", "Khác"
                ] : [
                  "Hiệu quả kém", "Năng lực kém", "Chậm chạp", "giảm cấp bậc/vị trí", "Lười biếng", "Khác"
                ]).map(reason => (
                  <label key={reason} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={formData.reason.split(", ").includes(reason)}
                      onChange={(e) => {
                        const currentReasons = formData.reason ? formData.reason.split(", ") : [];
                        let newReasons;
                        if (e.target.checked) {
                          newReasons = [...currentReasons, reason].filter(r => r !== "");
                        } else {
                          newReasons = currentReasons.filter(r => r !== reason);
                        }
                        setFormData({ ...formData, reason: newReasons.join(", ") });
                      }}
                    />
                    {reason}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Ghi chú</label>
              <textarea 
                className="form-control" 
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Nhập thêm ghi chú nếu cần..."
                rows={2}
              />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Hủy bỏ</button>
          <button type="submit" form="salary-change-form" className="btn btn-primary">Lưu đề nghị</button>
        </div>
      </div>
    </div>
  );
}
