"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { 
  Plus, 
  Trash2, 
  Eye, 
  X, 
  Search,
  UserCheck,
  Pencil,
  RefreshCw,
  Check,
  RotateCcw,
  Filter,
  Clock
} from "lucide-react";
import HistoryModal from "../../HistoryModal";
import { formatNumber } from "@/lib/format";
import { 
  createPayroll, 
  deletePayroll, 
  updatePayrollStatus, 
  getPayrollDetails,
  updatePayrollDetail,
  updatePayroll,
  refreshAllPayrollDetails,
  getEmployeeEligibility
} from "./actions";

type Payroll = {
  id: string;
  month: number;
  year: number;
  creator: string;
  approver?: string | null;
  note?: string | null;
  status: string;
  createdAt: Date;
  _count?: { details: number };
};

type EmployeeShort = {
  employeeCode: string;
  fullName: string;
  position: string | null;
  department: string | null;
};

interface PayrollTableProps {
  initialPayrolls: Payroll[];
  employees: EmployeeShort[];
  approvers: EmployeeShort[];
  currentUserName: string;
  isAdmin: boolean;
}

const STATUS_CONFIG: Record<string, { label: string, badge: string }> = {
  "Tạo mới": { label: "Tạo mới", badge: "badge-warning" },
  "Chờ phê duyệt": { label: "Chờ phê duyệt", badge: "badge-primary" },
  "Đã phê duyệt": { label: "Đã phê duyệt", badge: "badge-success" },
  "Đã duyệt": { label: "Đã duyệt", badge: "badge-success" },
  "Đã hủy": { label: "Đã hủy", badge: "badge-danger" }
};

export default function PayrollTable({ 
  initialPayrolls, 
  employees, 
  approvers, 
  currentUserName,
  isAdmin
}: PayrollTableProps) {
  const router = useRouter();
  const [payrolls, setPayrolls] = useState<Payroll[]>(initialPayrolls);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtering logic
  const filteredPayrolls = payrolls.filter(p => 
    `${p.month}/${p.year}`.includes(search) ||
    p.creator.toLowerCase().includes(search.toLowerCase()) ||
    p.status.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredPayrolls.length / itemsPerPage);
  const paginatedPayrolls = filteredPayrolls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  const [showModal, setShowModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [showEmployeeSelect, setShowEmployeeSelect] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [viewingDetails, setViewingDetails] = useState<any[] | null>(null);
  const [currentViewingId, setCurrentViewingId] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, { hasContract: boolean, hasAttendance: boolean }>>({});
  const [payrollMonth, setPayrollMonth] = useState(editingPayroll?.month || new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(editingPayroll?.year || new Date().getFullYear());
  const [isValidating, setIsValidating] = useState(false);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  useRealTimeSync("payroll", payrolls, setPayrolls);

  const filteredEmployees = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEmployee = (code: string) => {
    const el = eligibility[code];
    if (el && (!el.hasContract || !el.hasAttendance)) {
      alert(`Nhân viên ${code} chưa đủ điều kiện:\n${!el.hasContract ? "- Chưa có hợp đồng phê duyệt\n" : ""}${!el.hasAttendance ? "- Chưa có dữ liệu chấm công" : ""}`);
      return;
    }
    setSelectedCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  useEffect(() => {
    if (showEmployeeSelect) {
      setIsValidating(true);
      getEmployeeEligibility(employees.map(e => e.employeeCode), payrollMonth, payrollYear)
        .then(res => {
          setEligibility(res);
          setIsValidating(false);
        })
        .catch(() => setIsValidating(false));
    }
  }, [showEmployeeSelect, payrollMonth, payrollYear]);

  const handleSelectAll = () => {
    if (selectedCodes.length === filteredEmployees.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(filteredEmployees.map(e => e.employeeCode));
    }
  };

  async function handleStatusUpdate(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái sang "${newStatus}"?`)) return;
    try {
      await updatePayrollStatus(id, newStatus);
      router.refresh();
    } catch (err: any) {
      alert("Lỗi cập nhật trạng thái: " + err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa bảng lương này?")) return;
    try {
      await deletePayroll(id);
      router.refresh();
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

  async function handleRefreshDetails(id: string) {
    if (!confirm("Hệ thống sẽ tính toán lại toàn bộ lương dựa trên dữ liệu Chấm công và Bậc lương mới nhất. Bạn có chắc chắn muốn tiếp tục?")) return;
    setIsRefreshing(true);
    try {
      const details = await refreshAllPayrollDetails(id);
      setViewingDetails(details);
      alert("✅ Đã cập nhật lại toàn bộ dữ liệu bảng lương thành công!");
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
      attractionBonus: formData.get("attraction") as string,
      otherBonus: formData.get("other_bonus") as string,
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
          await updatePayroll(editingPayroll.id, formData, selectedCodes);
        } else {
          await createPayroll(formData, selectedCodes);
        }
        setShowModal(false);
        setEditingPayroll(null);
        setSelectedCodes([]);
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  async function openEditModal(p: Payroll) {
    setEditingPayroll(p);
    setError(null);
    try {
      const details = await getPayrollDetails(p.id);
      setSelectedCodes(details.map(d => d.employeeCode));
      setShowModal(true);
    } catch (err: any) {
      alert("Không thể tải danh sách nhân viên: " + err.message);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Bảng lương tháng</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={() => router.refresh()}>
            <RotateCcw size={18} style={{ marginRight: "6px" }} /> Làm mới
          </button>
          <button className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} style={{ marginRight: "6px" }} /> {showFilters ? "Ẩn lọc" : "Lọc"}
          </button>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditingPayroll(null); setError(null); }}>
            <Plus size={18} style={{ marginRight: "0.5rem" }} /> Tạo bảng lương
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ marginBottom: "1.5rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
            <Search size={18} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
            <input 
              type="text" 
              placeholder="Tìm theo tháng/năm, người tạo..." 
              className="form-control" 
              style={{ paddingLeft: "2.5rem" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Tháng/Năm</th>
              <th>Người tạo</th>
              <th style={{ textAlign: "center" }}>Số NV</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: "center", width: "250px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPayrolls.length > 0 ? paginatedPayrolls.map((p) => (
              <tr key={p.id}>
                <td style={{ textAlign: "center", fontWeight: 600, color: "var(--primary-color)" }}>{p.month}/{p.year}</td>
                <td>{p.creator}</td>
                <td style={{ textAlign: "center" }}>{p._count?.details || 0}</td>
                <td>
                  <span className={`badge ${(STATUS_CONFIG[p.status] || {badge: "badge-warning"}).badge}`}>
                    {p.status}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", whiteSpace: "nowrap" }}>
                    <button onClick={() => handleViewDetails(p.id)} className="btn btn-sm btn-outline">Xem</button>
                    
                    {(isAdmin || p.status === "Tạo mới") && (
                      <>
                        <button onClick={() => openEditModal(p)} className="btn btn-sm btn-outline">Sửa</button>
                        {p.status === "Tạo mới" && (
                          <button onClick={() => handleDelete(p.id)} className="btn btn-sm btn-danger">Xóa</button>
                        )}
                      </>
                    )}

                    {p.status === "Tạo mới" && (
                      <button onClick={() => handleStatusUpdate(p.id, "Chờ phê duyệt")} className="btn btn-sm btn-primary">Gửi</button>
                    )}

                    {p.status === "Chờ phê duyệt" && (
                      <button onClick={() => handleStatusUpdate(p.id, "Tạo mới")} className="btn btn-sm btn-warning">Thu hồi</button>
                    )}

                    {p.status === "Tạo mới" && (
                      <button onClick={() => handleStatusUpdate(p.id, "Đã hủy")} className="btn btn-sm btn-danger">Hủy</button>
                    )}

                    {(p.status === "Đã duyệt" || p.status === "Đã phê duyệt") && !isAdmin && (
                      <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Check size={14} /> Hoàn tất
                      </span>
                    )}

                    {(p.status === "Đã duyệt" || p.status === "Đã phê duyệt") && isAdmin && (
                      <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Check size={14} /> Admin
                      </span>
                    )}
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => setHistoryRecordId(p.id)}
                      title="Lịch sử thay đổi"
                    >
                      Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>Chưa có bảng lương nào được tạo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="Payroll" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button 
            className="btn btn-sm btn-outline" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Trước
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i} 
              className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button 
            className="btn btn-sm btn-outline" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Sau
          </button>
        </div>
      )}

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
                    <select 
                      name="month" 
                      className="form-control" 
                      required 
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Năm *</label>
                    <select 
                      name="year" 
                      className="form-control" 
                      required 
                      value={payrollYear}
                      onChange={(e) => setPayrollYear(parseInt(e.target.value))}
                    >
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
                  <label>Ghi chú</label>
                  <textarea name="note" className="form-control" rows={2} defaultValue={editingPayroll?.note || ""}></textarea>
                </div>

                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f8fafc", borderRadius: "0.5rem", border: "1px dashed #cbd5e1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>Nhân viên đã chọn: <span style={{ color: "var(--primary-color)" }}>{selectedCodes.length}</span></span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowEmployeeSelect(true)}>
                      <UserCheck size={16} style={{ marginRight: "0.4rem" }} /> Chọn nhân viên
                    </button>
                  </div>
                </div>
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
                      <th>Trạng thái dữ liệu</th>
                    </tr>
                  </thead>
                  <tbody>
                     {filteredEmployees.map(e => {
                      const el = eligibility[e.employeeCode];
                      const isEligible = el?.hasContract && el?.hasAttendance;
                      
                      return (
                        <tr 
                          key={e.employeeCode} 
                          onClick={() => toggleEmployee(e.employeeCode)} 
                          style={{ 
                            cursor: "pointer", 
                            opacity: isEligible ? 1 : 0.6,
                            background: isEligible ? "inherit" : "#fff1f2"
                          }}
                        >
                          <td>
                            <input 
                              type="checkbox" 
                              checked={selectedCodes.includes(e.employeeCode)} 
                              disabled={!isEligible}
                              onChange={() => {}} 
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{e.employeeCode}</td>
                          <td>{e.fullName}</td>
                          <td>{e.department}</td>
                          <td>
                            {isValidating ? (
                              <span style={{ fontSize: "0.75rem", color: "#666" }}>Đang kiểm tra...</span>
                            ) : (
                              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                <span className={`badge ${el?.hasContract ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: "0.7rem" }}>
                                  {el?.hasContract ? 'HĐ OK' : 'Thiếu HĐ'}
                                </span>
                                <span className={`badge ${el?.hasAttendance ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: "0.7rem" }}>
                                  {el?.hasAttendance ? 'Chấm công OK' : 'Thiếu CC'}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
                  onClick={() => currentViewingId && handleRefreshDetails(currentViewingId)} 
                  className={`btn-icon ${isRefreshing ? 'spin' : ''}`}
                  title="Làm mới dữ liệu"
                  style={{ color: "var(--primary-color)" }}
                  disabled={isRefreshing || (!isAdmin && payrolls.find(p => p.id === currentViewingId)?.status !== "Tạo mới")}
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
                      <th style={{ textAlign: "right" }}>Thu hút</th>
                      <th style={{ textAlign: "right" }}>Hỗ trợ khác</th>
                      <th style={{ textAlign: "right" }}>OT</th>
                      <th style={{ textAlign: "right" }}>BHXH (10.5%)</th>
                      <th style={{ textAlign: "right" }}>Thực lĩnh</th>
                      <th style={{ width: "60px", textAlign: "center" }}>Sửa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingDetails.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>{d.employeeCode}</td>
                        <td>{d.employeeName}</td>
                        <td style={{ textAlign: "right" }}>{formatNumber(d.incomePerWorkday)}</td>
                        <td style={{ textAlign: "right" }}>{formatNumber(d.attendanceBonus)}</td>
                        <td style={{ textAlign: "right" }}>{formatNumber(d.performanceBonus)}</td>
                        <td style={{ textAlign: "right" }}>{formatNumber(d.responsibilityBonus)}</td>
                        <td style={{ textAlign: "right" }}>{formatNumber(d.attractionBonus || 0)}</td>
                        <td style={{ textAlign: "right" }}>{formatNumber(d.otherBonus || 0)}</td>
                        <td style={{ textAlign: "right" }}>{formatNumber(d.overtimePay)}</td>
                        <td style={{ textAlign: "right", color: "var(--danger-color)" }}>{formatNumber(d.socialInsuranceDeduction)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--primary-color)" }}>{formatNumber((d.incomePerWorkday + d.attendanceBonus + d.performanceBonus + d.responsibilityBonus + (d.attractionBonus || 0) + (d.otherBonus || 0) + d.overtimePay) - d.socialInsuranceDeduction)}</td>
                        <td style={{ textAlign: "center" }}>
                          <button 
                            onClick={() => setEditingDetail(d)} 
                            className="btn-icon" 
                            style={{ color: "var(--primary-color)" }}
                            disabled={!isAdmin && payrolls.find(p => p.id === currentViewingId)?.status !== "Tạo mới"}
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
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
                    <label>Tiền thu hút</label>
                    <input type="number" name="attraction" className="form-control" defaultValue={editingDetail.attractionBonus || 0} required />
                  </div>
                  <div className="form-group">
                    <label>Hỗ trợ khác</label>
                    <input type="number" name="other_bonus" className="form-control" defaultValue={editingDetail.otherBonus || 0} required />
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
