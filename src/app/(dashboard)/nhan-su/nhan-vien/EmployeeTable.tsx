"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { createEmployee, updateEmployee } from "./actions";
import { Pencil, Trash2 } from "lucide-react";

export default function EmployeeTable({ initialData }: { initialData: any[] }) {
  const [employees, setEmployees] = useState(initialData);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Real-time Auto Sync
  useRealTimeSync("employees", employees, setEmployees);

  function handleClose() {
    setShowModal(false);
    setEditingEmployee(null);
    setError(null);
  }

  function handleEdit(employee: any) {
    setEditingEmployee(employee);
    setShowModal(true);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (editingEmployee) {
          await updateEmployee(editingEmployee.id, formData);
        } else {
          await createEmployee(formData);
        }
        handleClose();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0 }}>👥 Danh sách nhân viên</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thêm mới nhân viên</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th>Mã NV</th>
              <th>Họ và tên</th>
              <th>Giới tính</th>
              <th>Số điện thoại</th>
              <th>Email</th>
              <th>Bộ phận</th>
              <th>Chức vụ</th>
              <th>Bậc lương</th>
              <th>Ngày vào làm</th>
              <th>Trạng thái</th>
              <th style={{ width: "100px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr key={emp.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{emp.employeeCode}</td>
                <td style={{ fontWeight: 500 }}>{emp.fullName}</td>
                <td>{emp.gender}</td>
                <td>{emp.phone}</td>
                <td>{emp.email}</td>
                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td>{emp.salaryLevel}</td>
                <td>{emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}</td>
                <td><span className={`badge ${emp.status === "ACTIVE" ? "badge-success" : "badge-warning"}`}>{emp.status === "ACTIVE" ? "Đang làm việc" : "Nghỉ việc"}</span></td>
                <td style={{ textAlign: "center" }}>
                   <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                    <button onClick={() => handleEdit(emp)} className="btn-icon" title="Sửa"><Pencil size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "800px", margin: "1rem" }}>
            <h3>{editingEmployee ? "✏️ Sửa nhân viên" : "👤 Thêm nhân viên mới"}</h3>
            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}
            <form action={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div><label className="filter-label">Mã nhân viên</label><input type="text" name="employeeCode" className="input" defaultValue={editingEmployee?.employeeCode} required /></div>
                <div><label className="filter-label">Họ và tên</label><input type="text" name="fullName" className="input" defaultValue={editingEmployee?.fullName} required /></div>
                <div>
                  <label className="filter-label">Giới tính</label>
                  <select name="gender" className="input" defaultValue={editingEmployee?.gender ?? ""}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div><label className="filter-label">Số điện thoại</label><input type="text" name="phone" className="input" defaultValue={editingEmployee?.phone} /></div>
                <div><label className="filter-label">Email</label><input type="email" name="email" className="input" defaultValue={editingEmployee?.email} /></div>
                <div><label className="filter-label">Bộ phận</label><input type="text" name="department" className="input" defaultValue={editingEmployee?.department} /></div>
                <div><label className="filter-label">Chức vụ</label><input type="text" name="position" className="input" defaultValue={editingEmployee?.position} /></div>
                <div><label className="filter-label">Bậc lương</label><input type="text" name="salaryLevel" className="input" defaultValue={editingEmployee?.salaryLevel} /></div>
                <div><label className="filter-label">Ngày vào làm</label><input type="date" name="startDate" className="input" defaultValue={editingEmployee?.startDate ? new Date(editingEmployee.startDate).toISOString().split('T')[0] : ""} /></div>
                <div>
                  <label className="filter-label">Trạng thái</label>
                  <select name="status" className="input" defaultValue={editingEmployee?.status ?? "ACTIVE"}>
                    <option value="ACTIVE">Đang làm việc</option>
                    <option value="INACTIVE">Nghỉ việc</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button type="button" className="btn" onClick={handleClose}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Đang lưu..." : "💾 Lưu lại"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .filter-label { display: block; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .btn-icon { background: none; border: none; cursor: pointer; color: #3498db; padding: 4px; border-radius: 4px; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
      `}</style>
    </>
  );
}
