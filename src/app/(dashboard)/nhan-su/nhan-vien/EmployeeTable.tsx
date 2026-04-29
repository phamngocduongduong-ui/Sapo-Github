"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { createEmployee, updateEmployee } from "./actions";
import { Pencil, Trash2 } from "lucide-react";

type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  position: string;
  department: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  idCardNumber: string | null;
  idCardDate: Date | null;
  address: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  educationLevel: string | null;
  maritalStatus: string | null;
  workplace: string | null;
  createdAt: Date;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  ACTIVE:   { label: "Đang sử dụng",  badge: "badge-success" },
  INACTIVE: { label: "Ngừng sử dụng", badge: "badge-danger" },
};

const EDUCATION_LEVELS = ["Thạc sĩ", "Đại học", "Cao đẳng", "Trung cấp", "Lao động phổ thông"];

function calculateSeniority(startDateStr: string | null | Date) {
  if (!startDateStr) return "—";
  const start = new Date(startDateStr);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < start.getDate())) {
    years--;
    months += 12;
  }
  if (years > 0) return `${years} năm ${months} tháng`;
  return `${months} tháng`;
}

export default function EmployeeTable({ 
  initialEmployees, 
  branches, 
  activePositions, 
  activeDepartments 
}: { 
  initialEmployees: Employee[], 
  branches: { id: string; name: string }[],
  activePositions: string[],
  activeDepartments: string[]
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Real-time Auto Sync
  useRealTimeSync("employees", employees, setEmployees);

  function handleClose() {
    setShowModal(false);
    setEditingEmployee(null);
    setError(null);
    formRef.current?.reset();
  }

  function handleEdit(emp: Employee) {
    setEditingEmployee(emp);
    setShowModal(true);
  }

  function handleCancelStatus(id: string) {
    if (!confirm("Bạn có chắc chắn muốn chuyển trạng thái nhân viên này sang 'Ngừng sử dụng'?")) return;
    const formData = new FormData();
    formData.append("status", "INACTIVE");
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    formData.append("fullName", emp.fullName);
    formData.append("position", emp.position);
    formData.append("department", emp.department);

    startTransition(async () => {
      try {
        await updateEmployee(id, formData);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingEmployee) {
          await updateEmployee(editingEmployee.id, formData);
        } else {
          await createEmployee(formData);
        }
        handleClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  function handleExportExcel() {
    if (employees.length === 0) return;
    const headers = ["STT", "Mã NV", "Họ và tên", "Giới tính", "Chức vụ", "Bộ phận", "SĐT", "Email", "Số CCCD", "Trình độ", "Kết hôn", "Nơi công tác", "Trạng thái"];
    const rows = employees.map((emp, idx) => [
      idx + 1, emp.employeeCode, emp.fullName, emp.gender ?? "", emp.position, emp.department, emp.phone ?? "", emp.email ?? "", emp.idCardNumber ?? "", emp.educationLevel ?? "", emp.maritalStatus ?? "", emp.workplace ?? "", STATUS_MAP[emp.status]?.label ?? emp.status
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Employee_List_Realtime.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Nhân viên</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn" onClick={handleExportExcel} style={{ background: "#27ae60", color: "#fff" }}>📊 Xuất Excel</button>
          <button className="btn btn-primary" onClick={() => { setEditingEmployee(null); setShowModal(true); }}>+ Thêm nhân viên</button>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th>Mã NV</th>
              <th>Họ và tên</th>
              <th>Chức vụ</th>
              <th>Bộ phận</th>
              <th>Trình độ</th>
              <th>Kết hôn</th>
              <th>Nơi công tác</th>
              <th>Thâm niên</th>
              <th>Trạng thái</th>
              <th style={{ width: "100px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => {
              const st = STATUS_MAP[emp.status] ?? { label: emp.status, badge: "badge-warning" };
              return (
                <tr key={emp.id}>
                  <td style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{emp.employeeCode}</td>
                  <td style={{ fontWeight: 500 }}>{emp.fullName}</td>
                  <td>{emp.position}</td>
                  <td>{emp.department}</td>
                  <td>{emp.educationLevel ?? "—"}</td>
                  <td>{emp.maritalStatus === "Có" ? "✅" : "—"}</td>
                  <td>{emp.workplace ?? "—"}</td>
                  <td style={{ color: "#2980b9", fontWeight: 600 }}>{calculateSeniority(emp.startDate)}</td>
                  <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", whiteSpace: "nowrap" }}>
                      <button 
                        onClick={() => handleEdit(emp)} 
                        className="btn btn-sm btn-outline"
                        style={{ gap: "4px" }}
                      >
                        <Pencil size={14} /> Sửa
                      </button>
                      {emp.status === "ACTIVE" && (
                        <button 
                          onClick={() => handleCancelStatus(emp.id)} 
                          className="btn btn-sm btn-danger"
                          style={{ gap: "4px" }}
                        >
                          <Trash2 size={14} /> Ngừng
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
          <div className="card" style={{ width: "100%", maxWidth: "800px", margin: "1rem", maxHeight: "90vh", overflowY: "auto" }}>
            <h3>{editingEmployee ? "✏️ Sửa Nhân viên" : "🧑‍💼 Thêm Nhân viên mới"}</h3>
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {editingEmployee && <input type="hidden" name="status" defaultValue={editingEmployee.status} />}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div><label>Mã nhân viên *</label><input type="text" name="employeeCode" className="input" defaultValue={editingEmployee?.employeeCode} disabled={!!editingEmployee} required={!editingEmployee} /></div>
                <div><label>Họ và tên *</label><input type="text" name="fullName" className="input" defaultValue={editingEmployee?.fullName} required /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div><label>Giới tính</label><select name="gender" className="input" defaultValue={editingEmployee?.gender ?? "Nam"}><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
                <div><label>Chức vụ *</label><select name="position" className="input" required defaultValue={editingEmployee?.position ?? ""}><option value="" disabled>-- Chọn chức vụ --</option>{activePositions.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label>Bộ phận *</label><select name="department" className="input" required defaultValue={editingEmployee?.department ?? ""}><option value="" disabled>-- Chọn bộ phận --</option>{activeDepartments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div><label>Số điện thoại</label><input type="tel" name="phone" className="input" defaultValue={editingEmployee?.phone ?? ""} /></div>
                <div><label>Email</label><input type="email" name="email" className="input" defaultValue={editingEmployee?.email ?? ""} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div><label>Số CCCD</label><input type="text" name="idCardNumber" className="input" defaultValue={editingEmployee?.idCardNumber ?? ""} /></div>
                <div><label>Ngày cấp CCCD</label><input type="date" name="idCardDate" className="input" defaultValue={editingEmployee?.idCardDate ? new Date(editingEmployee.idCardDate).toISOString().split('T')[0] : ""} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div>
                  <label>Trình độ học vấn</label>
                  <select name="educationLevel" className="input" defaultValue={editingEmployee?.educationLevel ?? ""}>
                    <option value="">-- Chọn trình độ --</option>
                    {EDUCATION_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
                <div>
                  <label>Nơi công tác</label>
                  <select name="workplace" className="input" defaultValue={editingEmployee?.workplace ?? ""}>
                    <option value="">-- Chọn chi nhánh --</option>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
                  <input type="checkbox" name="maritalStatus" value="Có" defaultChecked={editingEmployee?.maritalStatus === "Có"} style={{ width: "20px", height: "20px" }} />
                  <label style={{ marginBottom: 0 }}>Đã kết hôn</label>
                </div>
              </div>
              <div><label>Địa chỉ</label><input type="text" name="address" className="input" defaultValue={editingEmployee?.address ?? ""} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div><label>Ngày bắt đầu</label><input type="date" name="startDate" className="input" defaultValue={editingEmployee?.startDate ? new Date(editingEmployee.startDate).toISOString().split('T')[0] : ""} /></div>
                <div><label>Ngày kết thúc</label><input type="date" name="endDate" className="input" defaultValue={editingEmployee?.endDate ? new Date(editingEmployee.endDate).toISOString().split('T')[0] : ""} /></div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn" onClick={handleClose}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Đang lưu..." : "💾 Lưu thông tin"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
