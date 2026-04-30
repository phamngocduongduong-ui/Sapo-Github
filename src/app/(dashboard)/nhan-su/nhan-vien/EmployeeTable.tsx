"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { createEmployee, updateEmployee, updateEmployeeStatus } from "./actions";
import { Pencil, Trash2, CheckCircle, PowerOff } from "lucide-react";

export default function EmployeeTable({ 
  initialEmployees, 
  branches, 
  activePositions, 
  activeDepartments,
  currentUserName
}: { 
  initialEmployees: any[],
  branches: string[],
  activePositions: string[],
  activeDepartments: string[],
  currentUserName: string
}) {
  const [employees, setEmployees] = useState(initialEmployees);
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

  function handleStatusChange(id: string, status: string) {
    if (!confirm(`Xác nhận thay đổi trạng thái nhân viên?`)) return;
    startTransition(async () => {
      await updateEmployeeStatus(id, status);
    });
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
              <th>Chi nhánh</th>
              <th>Bộ phận</th>
              <th>Chức vụ</th>
              <th>Ngày vào làm</th>
              <th>Trạng thái</th>
              <th style={{ width: "250px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr key={emp.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{emp.employeeCode}</td>
                <td style={{ fontWeight: 500 }}>{emp.fullName}</td>
                <td>{emp.gender}</td>
                <td>{emp.branch || "—"}</td>
                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td>{emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}</td>
                <td>
                  <span className={`badge ${emp.status === "ACTIVE" ? "badge-success" : "badge-danger"}`}>
                    {emp.status === "ACTIVE" ? "Hoạt động" : "Ngưng hoạt động"}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                   <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                    <button 
                      onClick={() => handleEdit(emp)} 
                      className="btn btn-sm btn-outline" 
                      disabled={emp.status !== "ACTIVE"}
                    >
                      Sửa
                    </button>
                    {emp.status === "ACTIVE" ? (
                      <button onClick={() => handleStatusChange(emp.id, "INACTIVE")} className="btn btn-sm btn-danger">
                        Hủy kích hoạt
                      </button>
                    ) : (
                      <button onClick={() => handleStatusChange(emp.id, "ACTIVE")} className="btn btn-sm btn-success">
                        Kích hoạt
                      </button>
                    )}
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
            <h3 style={{ marginTop: 0 }}>{editingEmployee ? "✏️ Sửa nhân viên" : "👤 Thêm nhân viên mới"}</h3>
            
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#1e293b" }}>
                Người thực hiện: <strong style={{ color: "var(--primary-color)" }}>{currentUserName}</strong>
              </p>
              <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                Ngày: <strong>{editingEmployee?.createdAt ? new Date(editingEmployee.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}</strong>
              </p>
            </div>

            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}
            <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="form-label-left">Mã nhân viên</label>
                <div style={{ flex: 1 }}><input type="text" name="employeeCode" className="input" defaultValue={editingEmployee?.employeeCode} required /></div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="form-label-left">Tên nhân viên</label>
                <div style={{ flex: 1 }}><input type="text" name="fullName" className="input" defaultValue={editingEmployee?.fullName} required /></div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="form-label-left">Giới tính</label>
                <div style={{ flex: 1 }}>
                  <select name="gender" className="input" defaultValue={editingEmployee?.gender ?? "Nam"}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="form-label-left">Chi nhánh</label>
                <div style={{ flex: 1 }}>
                  <select name="branch" className="input" defaultValue={editingEmployee?.branch ?? ""}>
                    <option value="">-- Chọn chi nhánh --</option>
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="form-label-left">Chức vụ</label>
                <div style={{ flex: 1 }}>
                  <select name="position" className="input" defaultValue={editingEmployee?.position ?? ""}>
                    <option value="">-- Chọn chức vụ --</option>
                    {activePositions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="form-label-left">Bộ phận</label>
                <div style={{ flex: 1 }}>
                  <select name="department" className="input" defaultValue={editingEmployee?.department ?? ""}>
                    <option value="">-- Chọn bộ phận --</option>
                    {activeDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="form-label-left">Ngày vào làm</label>
                <div style={{ flex: 1 }}><input type="date" name="startDate" className="input" defaultValue={editingEmployee?.startDate ? new Date(editingEmployee.startDate).toISOString().split('T')[0] : ""} /></div>
              </div>

              {editingEmployee && (
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <label className="form-label-left">Trạng thái</label>
                  <div style={{ flex: 1 }}>
                    <select name="status" className="input" defaultValue={editingEmployee?.status ?? "ACTIVE"} disabled>
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="INACTIVE">Ngưng hoạt động</option>
                    </select>
                    <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>* Sử dụng nút ngoài danh sách để thay đổi trạng thái</p>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button type="button" className="btn" onClick={handleClose}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Đang lưu..." : "💾 Lưu lại"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .form-label-left { width: 180px; font-size: 0.85rem; font-weight: 600; color: #475569; }
        .btn-icon { background: none; border: none; cursor: pointer; color: #3498db; padding: 4px; border-radius: 4px; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
      `}</style>
    </>
  );
}
