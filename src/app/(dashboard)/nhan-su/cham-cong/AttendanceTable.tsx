"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Download, 
  Upload, 
  Search,
  X,
  RotateCcw,
  Filter,
  Clock,
  MoreHorizontal,
  History,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import HistoryModal from "../../HistoryModal";
import * as XLSX from "xlsx";
import { formatNumber } from "@/lib/format";
import { 
  createAttendance, 
  updateAttendance, 
  deleteAttendance, 
  importAttendances,
  checkExistingAttendances
} from "./actions";

interface Attendance {
  id: string;
  employeeCode: string;
  employeeName: string;
  gender: string | null;
  department: string | null;
  annualLeaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  sundayOvertimeHours: number;
  holidayOvertimeHours: number;
  weekdayOvertimeHours: number;
  month: number;
  year: number;
}

export default function AttendanceTable({ 
  initialData, 
  eligibleEmployees 
}: { 
  initialData: Attendance[],
  eligibleEmployees: { employeeCode: string, fullName: string, department: string | null }[]
}) {
  const router = useRouter();
  const [data, setData] = useState<Attendance[]>(initialData);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useRealTimeSync("attendance", data, setData);

  const filteredData = data.filter(item => 
    item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    item.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
    `${item.month}/${item.year}`.includes(search)
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await deleteAttendance(id);
      setData(data.filter(item => item.id !== id));
    } catch (error) {
      alert("Lỗi khi xóa: " + (error as any).message);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        "Tháng": new Date().getMonth() + 1,
        "Năm": new Date().getFullYear(),
        "Mã nhân viên": "NV001",
        "Số ngày nghỉ phép năm": 1,
        "Số ngày nghỉ việc hưởng lương": 0,
        "Số ngày nghỉ việc không hưởng lương": 0,
        "Số giờ làm thêm ngày thường": 2,
        "Số giờ làm thêm chủ nhật": 4,
        "Số giờ làm thêm ngày lễ": 0
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MauChamCong");
    XLSX.writeFile(wb, "Mau_Cham_Cong.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        setIsLoading(true);
        
        const confirmMsg = `Cảnh báo: Import sẽ XÓA TOÀN BỘ dữ liệu chấm công cũ và thay thế bằng dữ liệu mới từ file này. Bạn có chắc chắn muốn tiếp tục không?`;
        if (!confirm(confirmMsg)) {
          setIsLoading(false);
          if (e.target) e.target.value = "";
          return;
        }

        await importAttendances(jsonData);
        router.refresh();
      } catch (error) {
        alert("Lỗi khi import: " + (error as any).message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>📋 Bảng chấm công</h3>
        
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={handleDownloadTemplate} className="btn btn-sm btn-outline" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Download size={14} /> File mẫu
          </button>
          
          <label className="btn btn-sm btn-outline" style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", margin: 0 }}>
            <Upload size={14} /> Nhập Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
          </label>
          
          <button 
            onClick={() => router.refresh()}
            className="btn btn-outline" 
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RotateCcw size={18} /> Làm mới
          </button>

          <button className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} style={{ marginRight: "6px" }} /> {showFilters ? "Ẩn lọc" : "Lọc"}
          </button>

          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="btn btn-primary" 
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Plus size={18} /> Thêm mới
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ marginBottom: "1.5rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
            <Search size={18} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, mã NV hoặc tháng/năm..." 
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
              <th>Mã NV</th>
              <th>Tên nhân viên</th>
              <th>Giới tính</th>
              <th>Bộ phận</th>
              <th style={{ textAlign: "center" }}>Nghỉ phép</th>
              <th style={{ textAlign: "center" }}>Nghỉ lương</th>
              <th style={{ textAlign: "center" }}>Nghỉ ko lương</th>
              <th style={{ textAlign: "center" }}>OT Thường</th>
              <th style={{ textAlign: "center" }}>OT CN</th>
              <th style={{ textAlign: "center" }}>OT Lễ</th>
              <th style={{ width: "200px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr key={item.id}>
                  <td style={{ textAlign: "center", fontWeight: 500, color: "var(--primary-color)" }}>{item.month}/{item.year}</td>
                  <td style={{ fontWeight: 600 }}>{item.employeeCode}</td>
                  <td>{item.employeeName}</td>
                  <td>{item.gender}</td>
                  <td>{item.department}</td>
                  <td style={{ textAlign: "center" }}>{formatNumber(item.annualLeaveDays)}</td>
                  <td style={{ textAlign: "center" }}>{formatNumber(item.paidLeaveDays)}</td>
                  <td style={{ textAlign: "center" }}>{formatNumber(item.unpaidLeaveDays)}</td>
                  <td style={{ textAlign: "center" }}>{formatNumber(item.weekdayOvertimeHours)}</td>
                  <td style={{ textAlign: "center" }}>{formatNumber(item.sundayOvertimeHours)}</td>
                  <td style={{ textAlign: "center" }}>{formatNumber(item.holidayOvertimeHours)}</td>
                  <td style={{ textAlign: "right", position: "relative" }}>
                    <button 
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === item.id ? null : item.id);
                      }}
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {openMenuId === item.id && (
                      <div className="action-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown-item" onClick={() => { setEditingItem(item); setIsModalOpen(true); setOpenMenuId(null); }}>
                          <Pencil size={14} /> Chỉnh sửa
                        </div>
                        <div className="dropdown-item" onClick={() => { setHistoryRecordId(item.id); setOpenMenuId(null); }}>
                          <History size={14} /> Lịch sử
                        </div>
                        <div className="divider"></div>
                        <div className="dropdown-item danger" onClick={() => { setConfirmDeleteId(item.id); setOpenMenuId(null); }}>
                          <Trash2 size={14} /> Xóa bản ghi
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
                  {isLoading ? "Đang xử lý..." : "Không tìm thấy dữ liệu chấm công."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="Attendance" 
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

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h3>{editingItem ? "Sửa bản ghi chấm công" : "Thêm mới chấm công"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <form action={async (formData) => {
              try {
                if (editingItem) {
                  await updateAttendance(editingItem.id, formData);
                } else {
                  await createAttendance(formData);
                }
                setIsModalOpen(false);
                router.refresh();
              } catch (error) {
                alert((error as any).message);
              }
            }}>
              <div className="modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", background: "#f8fafc", borderRadius: "0.5rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tháng *</label>
                    <input name="month" type="number" min="1" max="12" defaultValue={editingItem?.month || new Date().getMonth() + 1} required className="form-control" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Năm *</label>
                    <input name="year" type="number" defaultValue={editingItem?.year || new Date().getFullYear()} required className="form-control" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Nhân viên *</label>
                    {editingItem ? (
                      <input name="employeeCode" value={editingItem.employeeCode} readOnly className="form-control" style={{ background: "#f1f5f9" }} />
                    ) : (
                      <select name="employeeCode" required className="form-control">
                        <option value="">-- Chọn nhân viên --</option>
                        {eligibleEmployees.map(emp => (
                          <option key={emp.employeeCode} value={emp.employeeCode}>
                            {emp.employeeCode} - {emp.fullName} ({emp.department})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Số ngày nghỉ phép năm</label>
                    <input name="annualLeaveDays" type="number" step="0.5" defaultValue={editingItem?.annualLeaveDays || 0} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Nghỉ hưởng lương</label>
                    <input name="paidLeaveDays" type="number" step="0.5" defaultValue={editingItem?.paidLeaveDays || 0} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Nghỉ không lương</label>
                    <input name="unpaidLeaveDays" type="number" step="0.5" defaultValue={editingItem?.unpaidLeaveDays || 0} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Số giờ OT Ngày thường</label>
                    <input name="weekdayOvertimeHours" type="number" step="0.5" defaultValue={editingItem?.weekdayOvertimeHours || 0} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Số giờ OT Chủ nhật</label>
                    <input name="sundayOvertimeHours" type="number" step="0.5" defaultValue={editingItem?.sundayOvertimeHours || 0} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Số giờ OT Ngày lễ</label>
                    <input name="holidayOvertimeHours" type="number" step="0.5" defaultValue={editingItem?.holidayOvertimeHours || 0} className="form-control" />
                  </div>
                </div>
                
                <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem" }}>
                  * Tên, Giới tính và Bộ phận sẽ được hệ thống tự động cập nhật từ danh mục nhân viên.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDeleteId && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: "#fef2f2", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 1.5rem",
              color: "#ef4444"
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              Xác nhận xóa
            </h3>
            <div style={{ color: "#475569", marginBottom: "2rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
              <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn muốn xóa bản ghi chấm công này không?</p>
              <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                <Trash2 size={16} /> Dữ liệu sau khi xóa sẽ không thể khôi phục.
              </p>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)}>Bỏ qua</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: "#ef4444" }} 
                onClick={executeDelete}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
