"use client";

import { useState, useTransition } from "react";
import { 
  Plus, 
  Trash2, 
  Eye, 
  X, 
  Search,
  UserCheck,
  Pencil,
  RefreshCw
} from "lucide-react";
import { 
  createPayroll, 
  deletePayroll, 
  updatePayrollStatus, 
  getPayrollDetails,
  updatePayrollDetail,
  updatePayroll
} from "./actions";

type Payroll = {
  id: string;
  month: number;
  year: number;
  creator: string;
  approver: string;
  note: string | null;
  status: string;
  createdAt: Date;
  _count: { details: number };
};

type EmployeeShort = {
  employeeCode: string;
  fullName: string;
  position: string | null;
  department: string | null;
};

export default function PayrollTable({ 
  initialPayrolls, 
  employees, 
  approvers,
  currentUserName 
}: { 
  initialPayrolls: Payroll[], 
  employees: EmployeeShort[], 
  approvers: EmployeeShort[],
  currentUserName: string
}) {
  const [payrolls, setPayrolls] = useState<Payroll[]>(initialPayrolls);
  const [showModal, setShowModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [showEmployeeSelect, setShowEmployeeSelect] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [viewingDetails, setViewingDetails] = useState<any[] | null>(null);
  const [currentViewingId, setCurrentViewingId] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEmployee = (code: string) => {
    setSelectedCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    if (selectedCodes.length === filteredEmployees.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(filteredEmployees.map(e => e.employeeCode));
    }
  };

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa bảng lương này?")) return;
    try {
      await deletePayroll(id);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleViewDetails(id: string) {
    setIsRefreshing(true);
    try {
      const details = await getPayrollDetails(id);
      setViewingDetails(details);
      setCurrentViewingId(id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  const handleUpdateDetail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDetail) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      incomePerWorkday: formData.get("income") as string,
      attendanceBonus: formData.get("bonus") as string,
      performanceBonus: formData.get("performance") as string,
      responsibilityBonus: formData.get("responsibility") as string,
      overtimePay: formData.get("overtime") as string,
      socialInsuranceDeduction: formData.get("bhxh") as string
    };
    try {
      await updatePayrollDetail(editingDetail.id, data);
      setViewingDetails(prev => prev ? prev.map(d => d.id === editingDetail.id ? { ...d, ...data } : d) : null);
      setEditingDetail(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingPayroll) {
          await updatePayroll(editingPayroll.id, formData);
        } else {
          await createPayroll(formData, selectedCodes);
        }
        setShowModal(false);
        setEditingPayroll(null);
        setSelectedCodes([]);
        window.location.reload();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Bảng lương tháng</h3>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditingPayroll(null); setError(null); }}>
          <Plus size={18} style={{ marginRight: "0.5rem" }} /> Tạo bảng lương
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th style={{ textAlign: "center" }}>Tháng/Năm</th>
              <th>Người tạo</th>
              <th>Người phê duyệt</th>
              <th style={{ textAlign: "center" }}>Số NV</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: "center", width: "180px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.length > 0 ? payrolls.map((p, idx) => (
              <tr key={p.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td style={{ textAlign: "center", fontWeight: 600, color: "var(--primary-color)" }}>{p.month}/{p.year}</td>
                <td>{p.creator}</td>
                <td>{p.approver}</td>
                <td style={{ textAlign: "center" }}>{p._count.details}</td>
                <td>
                  <span className={`badge ${p.status === "Đã duyệt" ? "badge-success" : p.status === "Chờ phê duyệt" ? "badge-primary" : "badge-warning"}`}>
                    {p.status}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", whiteSpace: "nowrap" }}>
                    <button onClick={() => handleViewDetails(p.id)} className="btn btn-sm btn-outline" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>Xem</button>
                    <button onClick={() => { setEditingPayroll(p); setShowModal(true); }} className="btn btn-sm btn-outline" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>Sửa</button>
                    <button onClick={() => handleDelete(p.id)} className="btn btn-sm btn-danger" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>Xóa</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>Chưa có bảng lương nào được tạo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tạo/Sửa Bảng Lương */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3>{editingPayroll ? "Cập nhật thông tin bảng lương" : "Tạo bảng lương mới"}</h3>
              <button onClick={() => { setShowModal(false); setEditingPayroll(null); }} className="btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>{error}</div>}
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="form-group">
                    <label>Tháng *</label>
                    <select name="month" className="form-control" required defaultValue={editingPayroll?.month || new Date().getMonth() + 1}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Năm *</label>
                    <select name="year" className="form-control" required defaultValue={editingPayroll?.year || new Date().getFullYear()}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <option key={2026 + i} value={2026 + i}>{2026 + i}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Người tạo</label>
                  <input name="creator" className="form-control" readOnly defaultValue={editingPayroll?.creator || currentUserName} />
                </div>

                <div className="form-group">
                  <label>Người phê duyệt *</label>
                  <select name="approver" className="form-control" required defaultValue={editingPayroll?.approver || ""}>
                    <option value="" disabled>-- Chọn người duyệt --</option>
                    {approvers.map(a => (
                      <option key={a.fullName} value={a.fullName}>{a.fullName} ({a.position})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea name="note" className="form-control" rows={2} defaultValue={editingPayroll?.note || ""}></textarea>
                </div>

                {!editingPayroll && (
                  <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f8fafc", borderRadius: "0.5rem", border: "1px dashed #cbd5e1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600 }}>Nhân viên đã chọn: <span style={{ color: "var(--primary-color)" }}>{selectedCodes.length}</span></span>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowEmployeeSelect(true)}>
                        <UserCheck size={16} style={{ marginRight: "0.4rem" }} /> Chọn nhân viên
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditingPayroll(null); }}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Đang xử lý..." : editingPayroll ? "Cập nhật" : "Tạo bảng lương"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chọn Nhân Viên */}
      {showEmployeeSelect && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: "800px" }}>
            <div className="modal-header">
              <h3>Chọn nhân viên vào bảng lương</h3>
              <button onClick={() => setShowEmployeeSelect(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ position: "relative", marginBottom: "1rem" }}>
                <Search size={18} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
                <input 
                  type="text" 
                  placeholder="Tìm nhân viên..." 
                  className="form-control" 
                  style={{ paddingLeft: "2.5rem" }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}><input type="checkbox" onChange={handleSelectAll} checked={selectedCodes.length === filteredEmployees.length && filteredEmployees.length > 0} /></th>
                      <th>Mã NV</th>
                      <th>Họ tên</th>
                      <th>Bộ phận</th>
                      <th>Chức vụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(e => (
                      <tr key={e.employeeCode} onClick={() => toggleEmployee(e.employeeCode)} style={{ cursor: "pointer" }}>
                        <td><input type="checkbox" checked={selectedCodes.includes(e.employeeCode)} onChange={() => {}} /></td>
                        <td style={{ fontWeight: 600 }}>{e.employeeCode}</td>
                        <td>{e.fullName}</td>
                        <td>{e.department}</td>
                        <td>{e.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowEmployeeSelect(false)}>Xác nhận ({selectedCodes.length})</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Bảng Lương */}
      {viewingDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "1200px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <h3 style={{ margin: 0 }}>Chi tiết bảng lương</h3>
                <button 
                  onClick={() => currentViewingId && handleViewDetails(currentViewingId)} 
                  className={`btn-icon ${isRefreshing ? 'spin' : ''}`}
                  title="Làm mới dữ liệu"
                  style={{ color: "var(--primary-color)" }}
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              <button onClick={() => { setViewingDetails(null); setCurrentViewingId(null); }} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã NV</th>
                      <th>Họ tên</th>
                      <th style={{ textAlign: "right" }}>Ngày công</th>
                      <th style={{ textAlign: "right" }}>C.Cần</th>
                      <th style={{ textAlign: "right" }}>Hiệu quả</th>
                      <th style={{ textAlign: "right" }}>T.Nhiệm</th>
                      <th style={{ textAlign: "right" }}>OT</th>
                      <th style={{ textAlign: "right" }}>BHXH (10.5%)</th>
                      <th style={{ textAlign: "right" }}>Thực lĩnh</th>
                      <th style={{ width: "60px", textAlign: "center" }}>Sửa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingDetails.map(d => {
                      const netPay = (d.incomePerWorkday + d.attendanceBonus + d.performanceBonus + d.responsibilityBonus + d.overtimePay) - d.socialInsuranceDeduction;
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.employeeCode}</td>
                          <td>{d.employeeName}</td>
                          <td style={{ textAlign: "right" }}>{new Intl.NumberFormat('vi-VN').format(d.incomePerWorkday)}</td>
                          <td style={{ textAlign: "right" }}>{new Intl.NumberFormat('vi-VN').format(d.attendanceBonus)}</td>
                          <td style={{ textAlign: "right" }}>{new Intl.NumberFormat('vi-VN').format(d.performanceBonus)}</td>
                          <td style={{ textAlign: "right" }}>{new Intl.NumberFormat('vi-VN').format(d.responsibilityBonus)}</td>
                          <td style={{ textAlign: "right" }}>{new Intl.NumberFormat('vi-VN').format(d.overtimePay)}</td>
                          <td style={{ textAlign: "right", color: "var(--danger-color)" }}>{new Intl.NumberFormat('vi-VN').format(d.socialInsuranceDeduction)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "var(--primary-color)" }}>{new Intl.NumberFormat('vi-VN').format(netPay)}</td>
                          <td style={{ textAlign: "center" }}>
                            <button onClick={() => setEditingDetail(d)} className="btn-icon" style={{ color: "var(--primary-color)" }}>
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setViewingDetails(null); setCurrentViewingId(null); }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa Chi Tiết Lương */}
      {editingDetail && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3>Sửa chi tiết lương</h3>
              <button onClick={() => setEditingDetail(null)} className="btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateDetail}>
              <div className="modal-body">
                <p>Nhân viên: <strong>{editingDetail.employeeName}</strong></p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                  <div className="form-group">
                    <label>Thu nhập ngày công</label>
                    <input type="number" name="income" className="form-control" defaultValue={editingDetail.incomePerWorkday} required />
                  </div>
                  <div className="form-group">
                    <label>Tiền chuyên cần</label>
                    <input type="number" name="bonus" className="form-control" defaultValue={editingDetail.attendanceBonus} required />
                  </div>
                  <div className="form-group">
                    <label>Tiền hiệu quả</label>
                    <input type="number" name="performance" className="form-control" defaultValue={editingDetail.performanceBonus} required />
                  </div>
                  <div className="form-group">
                    <label>Tiền trách nhiệm</label>
                    <input type="number" name="responsibility" className="form-control" defaultValue={editingDetail.responsibilityBonus} required />
                  </div>
                  <div className="form-group">
                    <label>Tiền làm thêm giờ</label>
                    <input type="number" name="overtime" className="form-control" defaultValue={editingDetail.overtimePay} required />
                  </div>
                  <div className="form-group">
                    <label>BHXH (Khấu trừ)</label>
                    <input type="number" name="bhxh" className="form-control" defaultValue={editingDetail.socialInsuranceDeduction} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditingDetail(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}
