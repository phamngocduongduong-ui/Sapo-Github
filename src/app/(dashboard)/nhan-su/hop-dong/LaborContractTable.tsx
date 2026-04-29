"use client";

import { useState, useTransition, useEffect } from "react";
import { createLaborContract, updateLaborContract, updateContractStatus } from "./actions";

type LaborContract = {
  id: string;
  employeeName: string;
  contractNumber: string;
  contractType: string;
  contractDate: Date;
  startDate: Date;
  endDate: Date | null;
  position: string;
  department: string;
  salaryLevel: string | null;
  status: string;
  creator: string;
  approver: string | null;
  note: string | null;
  createdAt: Date;
  salaryBase: number;
  attendanceAllowance: number;
  performanceAllowance: number;
  responsibilityAllowance: number;
  attractionAllowance: number;
  positionAllowance: number;
  otherAllowance: number;
  socialInsurance: number;
  createdDate: Date;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  "Tạo mới": { label: "Tạo mới", badge: "badge-warning" },
  "Chờ phê duyệt": { label: "Chờ phê duyệt", badge: "badge-primary" },
  "Đã phê duyệt": { label: "Đã phê duyệt", badge: "badge-success" },
  "Đã hủy": { label: "Đã hủy", badge: "badge-danger" },
};

const CONTRACT_TYPES = ["Hợp đồng chính thức", "Hợp đồng thử việc", "Hợp đồng khoán", "Hợp đồng cộng tác viên", "Hợp đồng khác"];

export default function LaborContractTable({ 
  initialContracts, 
  employees, 
  positions, 
  departments,
  approvers,
  currentUserName,
  salaryLevels
}: { 
  initialContracts: LaborContract[], 
  employees: { fullName: string, position: string | null, department: string | null }[], 
  positions: { name: string }[], 
  departments: { name: string }[],
  approvers: { fullName: string, position: string | null, department: string | null }[],
  currentUserName: string,
  salaryLevels: any[]
}) {
  const [contracts, setContracts] = useState<LaborContract[]>(initialContracts);
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<LaborContract | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(1);

  // States for auto-fill
  const [posValue, setPosValue] = useState("");
  const [deptValue, setDeptValue] = useState("");
  const [salaryData, setSalaryData] = useState({
    level: "",
    base: 0,
    performance: 0,
    attendance: 0
  });

  useEffect(() => {
    if (editingContract) {
      setPosValue(editingContract.position);
      setDeptValue(editingContract.department);
      setSalaryData({
        level: editingContract.salaryLevel || "",
        base: editingContract.salaryBase,
        performance: editingContract.performanceAllowance,
        attendance: editingContract.attendanceAllowance
      });
      setActiveTab(1);
    } else {
      setPosValue("");
      setDeptValue("");
      setSalaryData({ level: "", base: 0, performance: 0, attendance: 0 });
      setActiveTab(1);
    }
  }, [editingContract, showModal]);

  function handleClose() {
    setShowModal(false);
    setEditingContract(null);
    setError(null);
  }

  function handleEdit(contract: LaborContract) {
    setEditingContract(contract);
    setShowModal(true);
  }

  function handleEmployeeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const name = e.target.value;
    const emp = employees.find(emp => emp.fullName === name);
    if (emp) {
      setPosValue(emp.position || "");
      setDeptValue(emp.department || "");
    }
  }

  function handleSalaryLevelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const levelCode = e.target.value;
    const levelObj = salaryLevels.find(l => l.levelCode === levelCode);
    if (levelObj) {
      setSalaryData({
        level: levelCode,
        base: levelObj.baseSalary,
        performance: levelObj.performanceBonus,
        attendance: levelObj.attendanceBonus
      });
    } else {
      setSalaryData({ level: levelCode, base: 0, performance: 0, attendance: 0 });
    }
  }

  function handleStatusUpdate(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái sang "${newStatus}"?`)) return;
    startTransition(async () => {
      try {
        await updateContractStatus(id, newStatus);
        window.location.reload();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingContract) {
          await updateLaborContract(editingContract.id, formData);
        } else {
          await createLaborContract(formData);
        }
        handleClose();
        window.location.reload();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Hợp đồng lao động</h3>
        <button className="btn btn-primary" onClick={() => { setEditingContract(null); setShowModal(true); }}>+ Thêm hợp đồng</button>
      </div>

      <div className="table-container" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Số hợp đồng</th>
              <th>Nhân viên</th>
              <th>Loại hợp đồng</th>
              <th>Ngày hợp đồng</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Chức vụ</th>
              <th>Bộ phận</th>
              <th>Trạng thái</th>
              <th style={{ width: "220px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialContracts.map((c, idx) => {
              const st = STATUS_MAP[c.status] ?? { label: c.status, badge: "badge-warning" };
              return (
                <tr key={c.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{c.contractNumber}</td>
                  <td>{c.employeeName}</td>
                  <td>{c.contractType}</td>
                  <td>{new Date(c.contractDate).toLocaleDateString("vi-VN")}</td>
                  <td>{new Date(c.startDate).toLocaleDateString("vi-VN")}</td>
                  <td>{c.endDate ? new Date(c.endDate).toLocaleDateString("vi-VN") : "—"}</td>
                  <td>{c.position}</td>
                  <td>{c.department}</td>
                  <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", whiteSpace: "nowrap" }}>
                      <button onClick={() => handleEdit(c)} className="btn btn-sm btn-outline" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                        Sửa
                      </button>
                      
                      {c.status === "Tạo mới" && (
                        <button onClick={() => handleStatusUpdate(c.id, "Chờ phê duyệt")} className="btn btn-sm btn-primary" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                          Gửi duyệt
                        </button>
                      )}
                      
                      {c.status === "Chờ phê duyệt" && (
                        <>
                          <button onClick={() => handleStatusUpdate(c.id, "Đã phê duyệt")} className="btn btn-sm btn-success" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                            Duyệt
                          </button>
                          <button onClick={() => handleStatusUpdate(c.id, "Tạo mới")} className="btn btn-sm btn-warning" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                            Trả lại
                          </button>
                        </>
                      )}

                      {c.status !== "Đã hủy" && c.status !== "Đã phê duyệt" && (
                        <button onClick={() => handleStatusUpdate(c.id, "Đã hủy")} className="btn btn-sm btn-danger" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                          Hủy
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
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: "800px", borderRadius: "12px", border: "none" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #f1f5f9", padding: "1.25rem 1.5rem", display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {editingContract ? "✏️ Cập nhật Hợp đồng" : "📄 Khởi tạo Hợp đồng mới"}
                    </h3>
                    <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                      Người tạo: <strong>{editingContract?.creator || currentUserName}</strong> | Ngày khởi tạo: <strong>{editingContract?.createdDate ? new Date(editingContract.createdDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}</strong>
                    </p>
                  </div>
                  <button onClick={handleClose} className="btn-icon" style={{ background: "#f8fafc", borderRadius: "50%", width: "32px", height: "32px" }}>✕</button>
                </div>
              </div>
              
              <div style={{ display: "flex", background: "#f8fafc", padding: "0 1rem", borderBottom: "1px solid #f1f5f9" }}>
                {[
                  { id: 1, label: "Thông tin hợp đồng" },
                  { id: 2, label: "Thông tin lương và phụ cấp" },
                  { id: 3, label: "Thông tin BHXH" }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)} 
                    style={{ 
                      padding: "1rem 1.25rem", 
                      borderBottom: activeTab === tab.id ? "3px solid var(--primary-color)" : "3px solid transparent", 
                      color: activeTab === tab.id ? "var(--primary-color)" : "#64748b", 
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      transition: "all 0.2s"
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
  
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ minHeight: "350px", padding: "1.5rem" }}>
                  {error && <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "0.5rem", fontSize: "0.9rem" }}>{error}</div>}
                  
                  {/* Tab 1: Thông tin hợp đồng */}
                  <div style={{ display: activeTab === 1 ? "block" : "none" }}>
                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                      <label>Loại hợp đồng *</label>
                      <select name="contractType" className="form-control" required defaultValue={editingContract?.contractType ?? ""}>
                        <option value="" disabled>-- Chọn loại hợp đồng --</option>
                        {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                      <div className="form-group">
                        <label>Số hợp đồng *</label>
                        <input type="text" name="contractNumber" className="form-control" defaultValue={editingContract?.contractNumber} disabled={!!editingContract} required />
                      </div>
                      <div className="form-group">
                        <label>Ngày hợp đồng *</label>
                        <input type="date" name="contractDate" className="form-control" required defaultValue={editingContract?.contractDate ? new Date(editingContract.contractDate).toISOString().split('T')[0] : ""} />
                      </div>
                      <div className="form-group">
                        <label>Ngày bắt đầu *</label>
                        <input type="date" name="startDate" className="form-control" required defaultValue={editingContract?.startDate ? new Date(editingContract.startDate).toISOString().split('T')[0] : ""} />
                      </div>
                    </div>
  
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                      <div className="form-group">
                        <label>Nhân viên *</label>
                        <select name="employeeName" className="form-control" required defaultValue={editingContract?.employeeName ?? ""} onChange={handleEmployeeChange}>
                          <option value="" disabled>-- Chọn nhân viên --</option>
                          {employees.map(e => <option key={e.fullName} value={e.fullName}>{e.fullName}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Chức vụ *</label>
                        <select name="position" className="form-control" required value={posValue} onChange={(e) => setPosValue(e.target.value)}>
                          <option value="" disabled>-- Chọn chức vụ --</option>
                          {positions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Bộ phận *</label>
                        <select name="department" className="form-control" required value={deptValue} onChange={(e) => setDeptValue(e.target.value)}>
                          <option value="" disabled>-- Chọn bộ phận --</option>
                          {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                    </div>
  
                    {/* Các trường ẩn để gửi lên server */}
                    <input type="hidden" name="creator" defaultValue={editingContract?.creator || currentUserName} />
                    <input type="hidden" name="createdDate" defaultValue={editingContract?.createdDate ? new Date(editingContract.createdDate).toISOString() : new Date().toISOString()} />
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Ghi chú</label>
                      <textarea name="note" className="form-control" rows={2} defaultValue={editingContract?.note ?? ""} placeholder="Nhập ghi chú thêm..."></textarea>
                    </div>
                  </div>
  
                  {/* Tab 2: Thông tin lương và phụ cấp */}
                  <div style={{ display: activeTab === 2 ? "block" : "none" }}>
                    <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                      <label>Bậc lương *</label>
                      <select name="salaryLevel" className="form-control" required value={salaryData.level} onChange={handleSalaryLevelChange}>
                        <option value="">-- Chọn bậc lương --</option>
                        {salaryLevels.map(l => {
                          const total = l.baseSalary + l.performanceBonus + l.attendanceBonus;
                          return (
                            <option key={l.id} value={l.levelCode}>
                              {l.levelCode} - Tổng: {new Intl.NumberFormat('vi-VN').format(total)}đ
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      <div className="form-group">
                        <label>Lương cơ bản (Tự động)</label>
                        <input type="number" name="salaryBase" className="form-control" style={{ background: "#f8fafc", fontWeight: 600 }} value={salaryData.base} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp chuyên cần (Tự động)</label>
                        <input type="number" name="attendanceAllowance" className="form-control" style={{ background: "#f8fafc" }} value={salaryData.attendance} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp hiệu quả (Tự động)</label>
                        <input type="number" name="performanceAllowance" className="form-control" style={{ background: "#f8fafc" }} value={salaryData.performance} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp trách nhiệm</label>
                        <input type="number" name="responsibilityAllowance" className="form-control" defaultValue={editingContract?.responsibilityAllowance ?? 0} />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp thu hút</label>
                        <input type="number" name="attractionAllowance" className="form-control" defaultValue={editingContract?.attractionAllowance ?? 0} />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp vị trí</label>
                        <input type="number" name="positionAllowance" className="form-control" defaultValue={editingContract?.positionAllowance ?? 0} />
                      </div>
                      <div className="form-group">
                        <label>Hỗ trợ khác</label>
                        <input type="number" name="otherAllowance" className="form-control" defaultValue={editingContract?.otherAllowance ?? 0} />
                      </div>
                    </div>
                  </div>
  
                  {/* Tab 3: BHXH */}
                  <div style={{ display: activeTab === 3 ? "block" : "none" }}>
                    <div className="card" style={{ maxWidth: "500px", padding: "2rem", margin: "1rem auto", background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
                      <div className="form-group">
                        <label style={{ fontSize: "1rem", fontWeight: 600 }}>Số tiền đóng BHXH</label>
                        <input type="number" name="socialInsurance" className="form-control" style={{ height: "45px", fontSize: "1.1rem" }} defaultValue={editingContract?.socialInsurance ?? 0} />
                        <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
                          * Nhập số tiền cụ thể làm căn cứ đóng Bảo hiểm xã hội cho nhân viên. <br/>
                          * Dữ liệu này sẽ được dùng để trích đóng hàng tháng trong bảng lương.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
  
                <div className="modal-footer" style={{ borderTop: "1px solid #f1f5f9", padding: "1.25rem 1.5rem" }}>
                  <button type="button" className="btn btn-outline" onClick={handleClose}>Đóng lại</button>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {activeTab > 1 && (
                      <button type="button" className="btn btn-outline" onClick={() => setActiveTab(prev => prev - 1)}>← Quay lại</button>
                    )}
                    {activeTab < 3 ? (
                      <button type="button" className="btn btn-primary" onClick={() => setActiveTab(prev => prev + 1)}>Tiếp tục →</button>
                    ) : (
                      <button type="submit" className="btn btn-primary" disabled={isPending} style={{ minWidth: "120px" }}>
                        {isPending ? "Đang xử lý..." : "💾 Lưu hợp đồng"}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
    </>
  );
}
