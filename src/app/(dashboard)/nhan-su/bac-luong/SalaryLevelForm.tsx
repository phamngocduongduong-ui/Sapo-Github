"use client";

import { useState } from "react";

interface SalaryLevelFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export default function SalaryLevelForm({ onClose, onSubmit, initialData }: SalaryLevelFormProps) {
  const [formData, setFormData] = useState({
    stt: initialData?.stt || "",
    levelCode: initialData?.levelCode || "",
    baseSalary: initialData?.baseSalary || "",
    attendanceBonus: initialData?.attendanceBonus || "",
    performanceBonus: initialData?.performanceBonus || "",
    responsibilityBonus: initialData?.responsibilityBonus || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "500px" }}>
        <div className="modal-header">
          <h2>{initialData ? "Sửa bậc lương" : "Thêm bậc lương mới"}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form id="salary-level-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>STT</label>
              <input 
                type="number" 
                className="form-control" 
                value={formData.stt}
                onChange={(e) => setFormData({ ...formData, stt: e.target.value })}
                required
                placeholder="Nhập số thứ tự..."
              />
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Mã bậc</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.levelCode}
                onChange={(e) => setFormData({ ...formData, levelCode: e.target.value })}
                required
                placeholder="Ví dụ: L01.01"
              />
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Lương cơ bản</label>
              <input 
                type="number" 
                className="form-control" 
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                required
                placeholder="Nhập mức lương cơ bản..."
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
              <div className="form-group">
                <label>Chuyên cần</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={formData.attendanceBonus}
                  onChange={(e) => setFormData({ ...formData, attendanceBonus: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Hiệu quả</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={formData.performanceBonus}
                  onChange={(e) => setFormData({ ...formData, performanceBonus: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Trách nhiệm</label>
              <input 
                type="number" 
                className="form-control" 
                value={formData.responsibilityBonus}
                onChange={(e) => setFormData({ ...formData, responsibilityBonus: e.target.value })}
                placeholder="0"
              />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Hủy bỏ</button>
          <button type="submit" form="salary-level-form" className="btn btn-primary">Lưu thông tin</button>
        </div>
      </div>
    </div>
  );
}
