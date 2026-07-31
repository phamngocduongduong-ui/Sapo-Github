"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { 
  Clock, Calendar, LogOut, Search, FileText, 
  ChevronLeft, ChevronRight, BarChart3, Info, CalendarDays, Loader2,
  ChevronDown
} from "lucide-react";
// @ts-ignore
import * as XLSX from "xlsx-js-style";
import { getAttendanceReport, getLeaveReport, getResignationReport, getAllEmployees, getAllBranches } from "./actions";

interface EmployeeMultiSelectProps {
  employees: Array<{ employeeCode: string; fullName: string; branch: string }>;
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  branches: string[];
}

function EmployeeMultiSelect({ employees, selectedCodes, onChange, branches }: EmployeeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTempSelected([...selectedCodes]);
      setSearch("");
      setSelectedBranch("");
    }
  }, [isOpen, selectedCodes]);

  const filtered = employees.filter(emp => {
    const matchSearch = emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
                        emp.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchBranch = selectedBranch === "" || emp.branch === selectedBranch;
    return matchSearch && matchBranch;
  });

  const isAllFilteredSelected = filtered.length > 0 && filtered.every(emp => tempSelected.includes(emp.employeeCode));

  const handleBranchChange = (branchName: string) => {
    setSelectedBranch(branchName);
    if (branchName !== "") {
      const branchCodes = employees
        .filter(emp => emp.branch === branchName)
        .map(emp => emp.employeeCode);
      setTempSelected(branchCodes);
    } else {
      setTempSelected(employees.map(emp => emp.employeeCode));
    }
  };

  const handleToggleAllFiltered = () => {
    const filteredCodes = filtered.map(emp => emp.employeeCode);
    if (isAllFilteredSelected) {
      setTempSelected(prev => prev.filter(code => !filteredCodes.includes(code)));
    } else {
      // Khi chọn tất cả, chỉ chọn những nhân viên khớp theo điều kiện lọc
      if (selectedBranch !== "" || search.trim() !== "") {
        setTempSelected(filteredCodes);
      } else {
        setTempSelected(employees.map(emp => emp.employeeCode));
      }
    }
  };

  const handleToggleOne = (code: string) => {
    if (tempSelected.includes(code)) {
      setTempSelected(tempSelected.filter(c => c !== code));
    } else {
      setTempSelected([...tempSelected, code]);
    }
  };

  const handleConfirm = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };

  const isAllSelected = selectedCodes.length === employees.length;
  let label = "Chọn nhân viên...";
  if (selectedCodes.length === 0) {
    label = "Chưa chọn nhân viên nào";
  } else if (isAllSelected && employees.length > 0) {
    label = "Tất cả nhân viên";
  } else if (selectedCodes.length === 1) {
    const selectedEmp = employees.find(e => e.employeeCode === selectedCodes[0]);
    label = selectedEmp ? `[${selectedEmp.employeeCode}] ${selectedEmp.fullName}` : "1 nhân viên";
  } else {
    label = `Đang chọn ${selectedCodes.length} nhân viên`;
  }

  return (
    <>
      <div className="multi-select-container">
        <div className="multi-select-trigger input-base" onClick={() => setIsOpen(true)}>
          <span className="trigger-label">{label}</span>
          <ChevronDown size={14} className="trigger-chevron" />
        </div>
      </div>

      {isOpen && (
        <div className="modal-overlay-select" onClick={() => setIsOpen(false)}>
          <div className="modal-content-select" onClick={e => e.stopPropagation()}>
            <div className="modal-header-select">
              <div>
                <h3>Lọc & chọn nhân viên</h3>
                <p>Chọn chi nhánh để lọc nhanh danh sách nhân viên</p>
              </div>
              <button className="close-btn" onClick={() => setIsOpen(false)}>&times;</button>
            </div>

            <div className="modal-filters-select">
              <div className="filter-field-search">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Tìm theo mã hoặc tên..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <div className="filter-field-branch">
                <select 
                  value={selectedBranch} 
                  onChange={e => handleBranchChange(e.target.value)}
                  className="input-base font-bold"
                  style={{ height: '32px', padding: '0 8px', fontSize: '12px' }}
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map(brName => (
                    <option key={brName} value={brName}>{brName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-table-wrapper-select">
              <table className="modal-table-select">
                <thead>
                  <tr>
                    <th style={{ width: "45px", textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={isAllFilteredSelected} 
                        onChange={handleToggleAllFiltered} 
                        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ width: "100px" }}>Mã NV</th>
                    <th>Họ và tên</th>
                    <th style={{ width: "180px" }}>Chi nhánh</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => {
                    const isChecked = tempSelected.includes(emp.employeeCode);
                    return (
                      <tr 
                        key={emp.employeeCode} 
                        className={isChecked ? "row-selected" : ""} 
                        onClick={() => handleToggleOne(emp.employeeCode)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => handleToggleOne(emp.employeeCode)} 
                            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                          />
                        </td>
                        <td><strong style={{ color: "#003466", fontFamily: "monospace" }}>{emp.employeeCode}</strong></td>
                        <td style={{ fontWeight: 600 }}>{emp.fullName}</td>
                        <td style={{ color: "#64748b", fontSize: "11px" }}>{emp.branch}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontWeight: 600 }}>
                        Không có nhân viên phù hợp với bộ lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer-select">
              <div className="selected-counter">
                Đang chọn: <strong>{tempSelected.length}</strong> / {employees.length} nhân viên (Khớp lọc: {filtered.length})
              </div>
              <div className="footer-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsOpen(false)}>Hủy bỏ</button>
                <button type="button" className="btn-confirm" onClick={handleConfirm}>Đồng ý</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ReportClient() {
  const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "resignation">("attendance");
  const [isPending, startTransition] = useTransition();

  const [employees, setEmployees] = useState<Array<{ employeeCode: string; fullName: string; branch: string }>>([]);
  const [branches, setBranches] = useState<string[]>([]);

  // Search parameters for Attendance Report
  const [attendanceSelectedCodes, setAttendanceSelectedCodes] = useState<string[]>([]);
  
  const getFirstDayOfMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [attendanceStartDate, setAttendanceStartDate] = useState(getFirstDayOfMonth());
  const [attendanceEndDate, setAttendanceEndDate] = useState(getTodayDateStr());
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [hasQueriedAttendance, setHasQueriedAttendance] = useState(false);

  // Search parameters for Leave Report
  const [leaveSelectedCodes, setLeaveSelectedCodes] = useState<string[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [hasQueriedLeave, setHasQueriedLeave] = useState(false);

  // Search parameters for Resignation Report
  const [resignationSelectedCodes, setResignationSelectedCodes] = useState<string[]>([]);
  const [resignationStartDate, setResignationStartDate] = useState("");
  const [resignationEndDate, setResignationEndDate] = useState("");
  const [resignationData, setResignationData] = useState<any[]>([]);
  const [hasQueriedResignation, setHasQueriedResignation] = useState(false);

  // Pagination states
  const [attendancePage, setAttendancePage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);
  const [resignationPage, setResignationPage] = useState(1);
  const itemsPerPage = 20;

  // Load all employees and branches on mount
  useEffect(() => {
    async function loadEmployeesAndBranches() {
      try {
        const [emps, brs] = await Promise.all([
          getAllEmployees(),
          getAllBranches()
        ]);
        setEmployees(emps);
        setBranches(brs);
        const codes = emps.map(e => e.employeeCode);
        setAttendanceSelectedCodes(codes);
        setLeaveSelectedCodes(codes);
        setResignationSelectedCodes(codes);
      } catch (err: any) {
        console.error("Lỗi khi tải dữ liệu khởi tạo:", err);
      }
    }
    loadEmployeesAndBranches();
  }, []);

  const handleQueryAttendance = () => {
    setAttendancePage(1);
    startTransition(async () => {
      try {
        const data = await getAttendanceReport(attendanceSelectedCodes, attendanceStartDate || undefined, attendanceEndDate || undefined);
        setAttendanceData(data);
        setHasQueriedAttendance(true);
      } catch (err: any) {
        alert(err.message || "Lỗi khi lấy báo cáo chấm công");
      }
    });
  };

  const handleQueryLeave = () => {
    setLeavePage(1);
    startTransition(async () => {
      try {
        const data = await getLeaveReport(leaveSelectedCodes, leaveStartDate || undefined, leaveEndDate || undefined);
        setLeaveData(data);
        setHasQueriedLeave(true);
      } catch (err: any) {
        alert(err.message || "Lỗi khi lấy báo cáo nghỉ phép");
      }
    });
  };

  const handleQueryResignation = () => {
    setResignationPage(1);
    startTransition(async () => {
      try {
        const data = await getResignationReport(resignationSelectedCodes, resignationStartDate || undefined, resignationEndDate || undefined);
        setResignationData(data);
        setHasQueriedResignation(true);
      } catch (err: any) {
        alert(err.message || "Lỗi khi lấy báo cáo nghỉ việc");
      }
    });
  };

  const applyExcelStyles = (ws: any, colWidths: any[], centerCols: string[]) => {
    ws["!cols"] = colWidths;
    ws["!rows"] = Array.from({ length: ws["!ref"] ? parseInt(ws["!ref"].split(":")[1].replace(/^[A-Z]+/, ""), 10) : 100 }).map(() => ({ hpt: 20 })); // set default height for rows
    ws["!rows"][0] = { hpt: 28 }; // Header row height

    const headerStyle = {
      font: { name: "Arial", sz: 12, bold: true, color: { rgb: "000000" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "cbd5e1" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "cbd5e1" } },
        right: { style: "thin", color: { rgb: "cbd5e1" } }
      },
      fill: { fgColor: { rgb: "f1f5f9" } }
    };

    const bodyStyleCenter = {
      font: { name: "Arial", sz: 11, color: { rgb: "334155" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: "e2e8f0" } },
        bottom: { style: "thin", color: { rgb: "e2e8f0" } },
        left: { style: "thin", color: { rgb: "e2e8f0" } },
        right: { style: "thin", color: { rgb: "e2e8f0" } }
      }
    };

    const bodyStyleLeft = {
      font: { name: "Arial", sz: 11, color: { rgb: "334155" } },
      alignment: { vertical: "center", horizontal: "left" },
      border: {
        top: { style: "thin", color: { rgb: "e2e8f0" } },
        bottom: { style: "thin", color: { rgb: "e2e8f0" } },
        left: { style: "thin", color: { rgb: "e2e8f0" } },
        right: { style: "thin", color: { rgb: "e2e8f0" } }
      }
    };

    for (const cellRef in ws) {
      if (cellRef.startsWith("!")) continue;
      const cell = ws[cellRef];
      const rowNum = parseInt(cellRef.replace(/^[A-Z]+/, ""), 10);
      const colLetter = cellRef.replace(/[0-9]+$/, "");

      if (rowNum === 1) {
        cell.s = headerStyle;
      } else {
        if (centerCols.includes(colLetter)) {
          cell.s = bodyStyleCenter;
        } else {
          cell.s = bodyStyleLeft;
        }
      }
    }
  };

  const exportAttendanceToExcel = () => {
    if (attendanceData.length === 0) return;
    const excelData = attendanceData.map((row, idx) => ({
      "STT": idx + 1,
      "Mã nhân viên": row.employeeCode,
      "Họ và tên": row.employeeName,
      "Ngày chấm công": row.dateStr,
      "Giờ vào": row.checkInTime,
      "Giờ ra": row.checkOutTime,
      "Thiết bị liên kết": row.boundDevice,
      "Cảnh báo": row.warning
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    applyExcelStyles(
      ws, 
      [
        { wch: 6 },   // A: STT
        { wch: 15 },  // B: Mã nhân viên
        { wch: 25 },  // C: Họ và tên
        { wch: 18 },  // D: Ngày chấm công
        { wch: 12 },  // E: Giờ vào
        { wch: 12 },  // F: Giờ ra
        { wch: 20 },  // G: Thiết bị liên kết
        { wch: 20 }   // H: Cảnh báo
      ],
      ["A", "D", "E", "F"]
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoChamCong");
    XLSX.writeFile(wb, `bao_cao_cham_cong_${attendanceStartDate}_to_${attendanceEndDate}.xlsx`);
  };

  const exportLeaveToExcel = () => {
    if (leaveData.length === 0) return;
    const excelData = leaveData.map((row, idx) => ({
      "STT": idx + 1,
      "Mã đơn": row.leaveCode || "—",
      "Họ và tên": row.employeeName,
      "Chi nhánh": row.branch || "—",
      "Bắt đầu": row.startDateStr,
      "Kết thúc": row.endDateStr,
      "Số ngày nghỉ": row.totalDays,
      "Lý do": row.reason + (row.subReason ? ` (Chi tiết: ${row.subReason})` : ''),
      "Trạng thái": row.status
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    applyExcelStyles(
      ws, 
      [
        { wch: 6 },   // A: STT
        { wch: 12 },  // B: Mã đơn
        { wch: 25 },  // C: Họ và tên
        { wch: 20 },  // D: Chi nhánh
        { wch: 15 },  // E: Bắt đầu
        { wch: 15 },  // F: Kết thúc
        { wch: 15 },  // G: Số ngày nghỉ
        { wch: 30 },  // H: Lý do
        { wch: 15 }   // I: Trạng thái
      ],
      ["A", "B", "E", "F", "G", "I"]
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoNghiPhep");
    XLSX.writeFile(wb, "bao_cao_nghi_phep.xlsx");
  };

  const exportResignationToExcel = () => {
    if (resignationData.length === 0) return;
    const excelData = resignationData.map((row, idx) => ({
      "STT": idx + 1,
      "Mã đơn": row.resignationCode || "—",
      "Họ và tên": row.employeeName,
      "Chi nhánh": row.branch || "—",
      "Ngày nộp đơn": row.requestDateStr,
      "Ngày nghỉ việc": row.resignationDateStr,
      "Lý do": row.reason,
      "Trạng thái": row.status
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    applyExcelStyles(
      ws, 
      [
        { wch: 6 },   // A: STT
        { wch: 12 },  // B: Mã đơn
        { wch: 25 },  // C: Họ và tên
        { wch: 20 },  // D: Chi nhánh
        { wch: 15 },  // E: Ngày nộp đơn
        { wch: 15 },  // F: Ngày nghỉ việc
        { wch: 30 },  // G: Lý do
        { wch: 15 }   // H: Trạng thái
      ],
      ["A", "B", "E", "F", "H"]
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoNghiViec");
    XLSX.writeFile(wb, "bao_cao_nghi_viec.xlsx");
  };

  // Helper for pagination
  const paginate = (data: any[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  return (
    <div className="report-page-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .report-page-container {
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 8px 15px 8px 15px;
          font-weight: 700;
          display: block;
          border-radius: 0 !important;
          margin-top: 0px;
          margin-bottom: 0;
          margin-left: -10px;
          margin-right: -10px;
          text-transform: uppercase;
        }
        .report-layout {
          padding: 10px 0px 10px 0px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .report-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        @media (max-width: 768px) {
          .report-tabs {
            grid-template-columns: 1fr;
          }
        }
        .tab-btn-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .tab-btn-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
          border-color: #003466;
        }
        .tab-btn-card.active {
          border-color: #003466;
          background: #f0f7ff;
          box-shadow: 0 4px 6px -1px rgba(0, 52, 102, 0.08);
          border-left: 4px solid #003466;
        }
        .tab-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tab-btn-card.active .tab-icon-wrapper.attendance { background: #e0f2fe; color: #003466; }
        .tab-btn-card.active .tab-icon-wrapper.leave { background: #ecfdf5; color: #10b981; }
        .tab-btn-card.active .tab-icon-wrapper.resignation { background: #fef2f2; color: #ef4444; }
        
        .tab-icon-wrapper.attendance { background: #f1f5f9; color: #64748b; }
        .tab-icon-wrapper.leave { background: #f1f5f9; color: #64748b; }
        .tab-icon-wrapper.resignation { background: #f1f5f9; color: #64748b; }

        .tab-text-wrapper h3 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }
        .tab-btn-card.active .tab-text-wrapper h3 {
          color: #003466;
        }
        .tab-text-wrapper p {
          margin: 0;
          font-size: 11px;
          color: #64748b;
          line-height: 1.3;
        }

        .report-content-panel {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }
        .panel-header {
          background-color: #f8fafc;
          border-bottom: 1px solid #cbd5e1;
          padding: 10px 15px;
          font-weight: 700;
          color: #003466;
          text-transform: uppercase;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .panel-body {
          padding: 15px;
        }
        .filter-grid {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .filter-item label {
          font-weight: 700;
          color: #003466;
          text-transform: uppercase;
          font-size: 11px;
        }
        .input-base {
          height: 34px;
          padding: 6px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          outline: none;
          font-size: 13px;
          font-weight: 700 !important;
          color: #000000 !important;
          background: #ffffff;
        }
        select.input-base {
          font-weight: 700 !important;
          color: #000000 !important;
        }
        .input-base:focus {
          border-color: #003466;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background-color: #003466;
          color: white;
          height: 34px;
          padding: 6px 20px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
        }
        .sapo-btn:hover:not(:disabled) {
          background-color: #002244;
        }
        .sapo-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .sapo-btn:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }
        .sapo-btn-excel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background-color: #22c55e;
          color: white;
          height: 34px;
          padding: 6px 20px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
        }
        .sapo-btn-excel:hover:not(:disabled) {
          background-color: #16a34a;
        }
        .sapo-btn-excel:active:not(:disabled) {
          transform: scale(0.98);
        }

        .base-table-wrapper {
          overflow-x: auto;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        .base-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .base-table th {
          background-color: #f1f5f9;
          color: #003466;
          font-weight: 700;
          text-transform: uppercase;
          padding: 10px 12px;
          font-size: 12px;
          border-bottom: 2px solid #ff5c00;
        }
        .base-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          color: #1e293b;
        }
        .base-table tbody tr:hover {
          background-color: #f8fafc;
        }
        
        .badge-status {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-status.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge-status.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .badge-status.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
        .badge-status.info { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
        }
        .pagination-info {
          font-size: 12px;
          color: #64748b;
        }
        .pagination-controls {
          display: flex;
          gap: 4px;
        }
        .page-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
        }
        .page-btn:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .page-btn.active {
          background: #003466;
          color: #ffffff;
          border-color: #003466;
        }
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .placeholder-panel {
          text-align: center;
          padding: 3rem 1.5rem;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #fafafa;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
        }
        .multi-select-container {
          position: relative;
          width: 260px;
          user-select: none;
        }
        .multi-select-trigger {
          display: flex !important;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          background: #ffffff;
          padding: 6px 12px !important;
          font-weight: 700 !important;
          color: #000000 !important;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
        }
        .trigger-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: 8px;
        }
        .trigger-chevron {
          transition: transform 0.2s ease;
          color: #64748b;
          flex-shrink: 0;
        }
        .trigger-chevron.open {
          transform: rotate(180deg);
        }

        .multi-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dropdown-search-wrapper {
          padding: 8px;
          border-bottom: 1px solid #f1f5f9;
          position: relative;
          display: flex;
          align-items: center;
        }
        .dropdown-search-wrapper .search-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
        }
        .dropdown-search-wrapper input {
          width: 100%;
          padding: 5px 8px 5px 28px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          outline: none;
        }
        .dropdown-search-wrapper input:focus {
          border-color: #003466;
        }

        .dropdown-options-list {
          max-height: 220px;
          overflow-y: auto;
          padding: 4px 0;
        }

        .dropdown-option-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .dropdown-option-item:hover {
          background-color: #f8fafc;
        }
        .dropdown-option-item input[type="checkbox"] {
          width: 14px;
          height: 14px;
          accent-color: #003466;
          cursor: pointer;
        }
        .option-text {
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dropdown-option-item.select-all {
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 4px;
          padding-bottom: 8px;
        }
        .code-badge {
          color: #003466;
          font-family: monospace;
          margin-right: 4px;
          font-size: 11px;
        }
        .dropdown-no-results {
          padding: 12px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
        }

        /* Modal custom select styles */
        .modal-overlay-select {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content-select {
          background: #ffffff;
          border-radius: 12px;
          width: 90%;
          max-width: 680px;
          max-height: 85vh;
          max-height: 85dvh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header-select {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-header-select h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .modal-header-select p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .modal-header-select .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
          transition: color 0.15s;
        }

        .modal-header-select .close-btn:hover {
          color: #475569;
        }

        .modal-filters-select {
          padding: 12px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .filter-field-search {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
        }

        .filter-field-search .search-icon {
          position: absolute;
          left: 12px;
          color: #94a3b8;
        }

        .filter-field-search input {
          width: 100%;
          height: 36px;
          padding: 6px 12px 6px 36px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          transition: border-color 0.15s;
        }

        .filter-field-search input:focus {
          border-color: #003466;
          box-shadow: 0 0 0 2px rgba(0, 52, 102, 0.1);
        }

        .filter-field-branch {
          width: 180px;
        }

        .filter-field-branch select {
          width: 100%;
          height: 36px;
          border-radius: 6px !important;
          border-color: #cbd5e1;
          font-weight: 700 !important;
        }

        .modal-table-wrapper-select {
          flex: 1;
          overflow-y: auto;
          max-height: 380px;
          min-height: 0;
          padding: 0;
        }

        .modal-table-select {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .modal-table-select th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          padding: 10px 16px;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .modal-table-select td {
          padding: 10px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
        }

        .modal-table-select tr {
          transition: background-color 0.15s;
        }

        .modal-table-select tr:hover {
          background-color: #f8fafc;
        }

        .modal-table-select tr.row-selected {
          background-color: #f0f7ff;
        }

        .modal-table-select tr.row-selected:hover {
          background-color: #e0f2fe;
        }

        .modal-footer-select {
          padding: 12px 20px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .selected-counter {
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }

        .selected-counter strong {
          color: #003466;
          font-size: 14px;
        }

        .footer-actions {
          display: flex;
          gap: 8px;
        }

        .footer-actions button {
          height: 36px;
          padding: 6px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-cancel {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
        }

        .btn-cancel:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #1e293b;
        }

        .btn-confirm {
          background: #003466;
          border: none;
          color: #ffffff;
        }

        .btn-confirm:hover {
          background: #002244;
        }

        @media (max-width: 640px) {
          .modal-content-select {
            width: 95%;
            max-height: 80vh;
            max-height: 80dvh;
          }
          .modal-filters-select {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            padding: 10px 16px;
          }
          .filter-field-branch {
            width: 100%;
          }
          .modal-footer-select {
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
            text-align: center;
          }
          .footer-actions {
            display: flex;
            gap: 8px;
            justify-content: space-between;
          }
          .footer-actions button {
            flex: 1;
            height: 38px;
          }
        }
      ` }} />

      <div className="breadcrumb-banner">
        QUẢN LÝ BÁO CÁO NHÂN SỰ
      </div>

      <div className="report-layout">
        {/* Tab Cards Select */}
        <div className="report-tabs">
          <div 
            className={`tab-btn-card ${activeTab === "attendance" ? "active" : ""}`}
            onClick={() => setActiveTab("attendance")}
          >
            <div className="tab-icon-wrapper attendance">
              <Clock size={22} />
            </div>
            <div className="tab-text-wrapper">
              <h3>Báo cáo chấm công</h3>
              <p>Chi tiết giờ vào/ra, thiết bị chấm công và cảnh báo đi muộn, về sớm hoặc vắng mặt.</p>
            </div>
          </div>

          <div 
            className={`tab-btn-card ${activeTab === "leave" ? "active" : ""}`}
            onClick={() => setActiveTab("leave")}
          >
            <div className="tab-icon-wrapper leave">
              <CalendarDays size={22} />
            </div>
            <div className="tab-text-wrapper">
              <h3>Báo cáo nghỉ phép</h3>
              <p>Thống kê danh sách nhân viên xin nghỉ phép, thời gian nghỉ và trạng thái phê duyệt phép.</p>
            </div>
          </div>

          <div 
            className={`tab-btn-card ${activeTab === "resignation" ? "active" : ""}`}
            onClick={() => setActiveTab("resignation")}
          >
            <div className="tab-icon-wrapper resignation">
              <LogOut size={22} />
            </div>
            <div className="tab-text-wrapper">
              <h3>Báo cáo nghỉ việc</h3>
              <p>Thống kê danh sách nhân viên xin nghỉ việc, thời gian chấm dứt hợp đồng và lý do.</p>
            </div>
          </div>
        </div>

        {/* Dynamic Content Panel */}
        <div className="report-content-panel">
          {activeTab === "attendance" && (
            <>
              <div className="panel-header">
                <Clock size={16} /> Báo cáo chi tiết chấm công trong tháng
              </div>
              <div className="panel-body">
                {/* Filters */}
                <div className="filter-grid">
                  <div className="filter-item" style={{ minWidth: "260px" }}>
                    <label>Mã nhân viên</label>
                    <EmployeeMultiSelect 
                      employees={employees} 
                      selectedCodes={attendanceSelectedCodes} 
                      onChange={setAttendanceSelectedCodes} 
                      branches={branches}
                    />
                  </div>
                  <div className="filter-item" style={{ width: "150px" }}>
                    <label>Từ ngày</label>
                    <input 
                      type="date" 
                      className="input-base"
                      value={attendanceStartDate}
                      onChange={(e) => setAttendanceStartDate(e.target.value)}
                    />
                  </div>
                  <div className="filter-item" style={{ width: "150px" }}>
                    <label>Đến ngày</label>
                    <input 
                      type="date" 
                      className="input-base"
                      value={attendanceEndDate}
                      onChange={(e) => setAttendanceEndDate(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="sapo-btn"
                    onClick={handleQueryAttendance}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                    Truy vấn
                  </button>
                  {hasQueriedAttendance && attendanceData.length > 0 && (
                    <button
                      type="button"
                      className="sapo-btn-excel"
                      onClick={exportAttendanceToExcel}
                    >
                      <FileText size={16} />
                      Xuất excel
                    </button>
                  )}
                </div>

                {/* Table Data */}
                {!hasQueriedAttendance ? (
                  <div className="placeholder-panel">
                    <Info size={36} strokeWidth={1.5} />
                    <span>Vui lòng điền thông tin lọc và nhấn nút "Truy vấn" để xem dữ liệu báo cáo chấm công.</span>
                  </div>
                ) : attendanceData.length === 0 ? (
                  <div className="placeholder-panel">
                    <Info size={36} strokeWidth={1.5} />
                    <span>Không tìm thấy dữ liệu chấm công phù hợp với tiêu chí tìm kiếm.</span>
                  </div>
                ) : (
                  <>
                    <div className="base-table-wrapper">
                      <table className="base-table">
                        <thead>
                          <tr>
                            <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                            <th>Mã nhân viên</th>
                            <th>Họ và tên</th>
                            <th style={{ width: "130px", textAlign: "center" }}>Ngày chấm công</th>
                            <th style={{ width: "100px", textAlign: "center" }}>Giờ vào</th>
                            <th style={{ width: "100px", textAlign: "center" }}>Giờ ra</th>
                            <th>Thiết bị liên kết</th>
                            <th style={{ width: "220px", textAlign: "center" }}>Cảnh báo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(attendanceData, attendancePage).map((row, idx) => {
                            const isLeave = row.checkInTime === "OFF" && row.checkOutTime === "OFF";
                            const warningClass = 
                              row.warning === "Đủ giờ công" ? "success" : 
                              row.warning === "Không đủ giờ công" ? "warning" : "danger";
                            return (
                              <tr key={idx}>
                                <td style={{ textAlign: "center" }}>{(attendancePage - 1) * itemsPerPage + idx + 1}</td>
                                <td>{row.employeeCode}</td>
                                <td style={{ color: "#003466", fontWeight: "700" }}>{row.employeeName}</td>
                                <td style={{ textAlign: "center" }}>{row.dateStr}</td>
                                <td style={{ textAlign: "center", color: "#1e3a8a" }}>{row.checkInTime}</td>
                                <td style={{ textAlign: "center", color: "#b45309" }}>{row.checkOutTime}</td>
                                <td style={{ fontSize: "11px", fontFamily: "monospace" }}>{row.boundDevice}</td>
                                <td style={{ textAlign: "center" }}>
                                  {isLeave ? (
                                    <span style={{ color: "#0284c7", fontWeight: "700", fontSize: "12px", textTransform: "uppercase" }}>
                                      {row.warning}
                                    </span>
                                  ) : (
                                    <span className={`badge-status ${warningClass}`}>
                                      {row.warning}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination */}
                    {attendanceData.length > itemsPerPage && (
                      <div className="pagination-container">
                        <div className="pagination-info">
                          Hiển thị <strong>{Math.min(attendancePage * itemsPerPage, attendanceData.length)}</strong> / {attendanceData.length} dòng dữ liệu
                        </div>
                        <div className="pagination-controls">
                          <button 
                            className="page-btn"
                            disabled={attendancePage === 1}
                            onClick={() => setAttendancePage(prev => prev - 1)}
                          >
                            Trước
                          </button>
                          {Array.from({ length: Math.ceil(attendanceData.length / itemsPerPage) }).map((_, i) => (
                            <button 
                              key={i}
                              className={`page-btn ${attendancePage === i + 1 ? "active" : ""}`}
                              onClick={() => setAttendancePage(i + 1)}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button 
                            className="page-btn"
                            disabled={attendancePage === Math.ceil(attendanceData.length / itemsPerPage)}
                            onClick={() => setAttendancePage(prev => prev + 1)}
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "leave" && (
            <>
              <div className="panel-header">
                <CalendarDays size={16} /> Báo cáo danh sách nghỉ phép của nhân viên
              </div>
              <div className="panel-body">
                {/* Filters */}
                <div className="filter-grid">
                  <div className="filter-item" style={{ minWidth: "260px" }}>
                    <label>Mã nhân viên</label>
                    <EmployeeMultiSelect 
                      employees={employees} 
                      selectedCodes={leaveSelectedCodes} 
                      onChange={setLeaveSelectedCodes} 
                      branches={branches}
                    />
                  </div>
                  <div className="filter-item" style={{ width: "150px" }}>
                    <label>Từ ngày nghỉ</label>
                    <input 
                      type="date" 
                      className="input-base"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                    />
                  </div>
                  <div className="filter-item" style={{ width: "150px" }}>
                    <label>Đến ngày nghỉ</label>
                    <input 
                      type="date" 
                      className="input-base"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="sapo-btn"
                    onClick={handleQueryLeave}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                    Truy vấn
                  </button>
                  {hasQueriedLeave && leaveData.length > 0 && (
                    <button
                      type="button"
                      className="sapo-btn-excel"
                      onClick={exportLeaveToExcel}
                    >
                      <FileText size={16} />
                      Xuất excel
                    </button>
                  )}
                </div>

                {/* Table Data */}
                {!hasQueriedLeave ? (
                  <div className="placeholder-panel">
                    <Info size={36} strokeWidth={1.5} />
                    <span>Vui lòng điền thông tin lọc và nhấn nút "Truy vấn" để xem dữ liệu báo cáo nghỉ phép.</span>
                  </div>
                ) : leaveData.length === 0 ? (
                  <div className="placeholder-panel">
                    <Info size={36} strokeWidth={1.5} />
                    <span>Không tìm thấy dữ liệu nghỉ phép nào trong khoảng thời gian đã chọn.</span>
                  </div>
                ) : (
                  <>
                    <div className="base-table-wrapper">
                      <table className="base-table">
                        <thead>
                          <tr>
                            <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                            <th>Mã đơn</th>
                            <th>Họ và tên</th>
                            <th>Chi nhánh</th>
                            <th style={{ textAlign: "center" }}>Bắt đầu</th>
                            <th style={{ textAlign: "center" }}>Kết thúc</th>
                            <th style={{ textAlign: "center", width: "100px" }}>Số ngày nghỉ</th>
                            <th>Lý do</th>
                            <th style={{ textAlign: "center" }}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(leaveData, leavePage).map((row, idx) => {
                            const isApproved = row.status === "Phê duyệt" || row.status === "Đã duyệt";
                            const isPendingApprove = row.status === "Chờ duyệt" || row.status === "Tạo mới";
                            const statusClass = 
                              isApproved ? "success" : 
                              isPendingApprove ? "warning" : "danger";
                            return (
                              <tr key={row.id}>
                                <td style={{ textAlign: "center" }}>{(leavePage - 1) * itemsPerPage + idx + 1}</td>
                                <td style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>{row.leaveCode || "—"}</td>
                                <td style={{ color: "#003466", fontWeight: "700" }}>{row.employeeName}</td>
                                <td>{row.branch || "—"}</td>
                                <td style={{ textAlign: "center" }}>{row.startDateStr}</td>
                                <td style={{ textAlign: "center" }}>{row.endDateStr}</td>
                                <td style={{ textAlign: "center", color: "#dc2626" }}>{row.totalDays} ngày</td>
                                <td>
                                  <div>{row.reason}</div>
                                  {row.subReason && <div style={{ fontSize: "11px", color: "#64748b" }}>Chi tiết: {row.subReason}</div>}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <span className={`badge-status ${statusClass}`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination */}
                    {leaveData.length > itemsPerPage && (
                      <div className="pagination-container">
                        <div className="pagination-info">
                          Hiển thị <strong>{Math.min(leavePage * itemsPerPage, leaveData.length)}</strong> / {leaveData.length} dòng dữ liệu
                        </div>
                        <div className="pagination-controls">
                          <button 
                            className="page-btn"
                            disabled={leavePage === 1}
                            onClick={() => setLeavePage(prev => prev - 1)}
                          >
                            Trước
                          </button>
                          {Array.from({ length: Math.ceil(leaveData.length / itemsPerPage) }).map((_, i) => (
                            <button 
                              key={i}
                              className={`page-btn ${leavePage === i + 1 ? "active" : ""}`}
                              onClick={() => setLeavePage(i + 1)}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button 
                            className="page-btn"
                            disabled={leavePage === Math.ceil(leaveData.length / itemsPerPage)}
                            onClick={() => setLeavePage(prev => prev + 1)}
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "resignation" && (
            <>
              <div className="panel-header">
                <LogOut size={16} /> Báo cáo nghỉ việc của nhân viên
              </div>
              <div className="panel-body">
                {/* Filters */}
                <div className="filter-grid">
                  <div className="filter-item" style={{ minWidth: "260px" }}>
                    <label>Mã nhân viên</label>
                    <EmployeeMultiSelect 
                      employees={employees} 
                      selectedCodes={resignationSelectedCodes} 
                      onChange={setResignationSelectedCodes} 
                      branches={branches}
                    />
                  </div>
                  <div className="filter-item" style={{ width: "150px" }}>
                    <label>Nghỉ từ ngày</label>
                    <input 
                      type="date" 
                      className="input-base"
                      value={resignationStartDate}
                      onChange={(e) => setResignationStartDate(e.target.value)}
                    />
                  </div>
                  <div className="filter-item" style={{ width: "150px" }}>
                    <label>Nghỉ đến ngày</label>
                    <input 
                      type="date" 
                      className="input-base"
                      value={resignationEndDate}
                      onChange={(e) => setResignationEndDate(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="sapo-btn"
                    onClick={handleQueryResignation}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                    Truy vấn
                  </button>
                  {hasQueriedResignation && resignationData.length > 0 && (
                    <button
                      type="button"
                      className="sapo-btn-excel"
                      onClick={exportResignationToExcel}
                    >
                      <FileText size={16} />
                      Xuất excel
                    </button>
                  )}
                </div>

                {/* Table Data */}
                {!hasQueriedResignation ? (
                  <div className="placeholder-panel">
                    <Info size={36} strokeWidth={1.5} />
                    <span>Vui lòng điền thông tin lọc và nhấn nút "Truy vấn" để xem dữ liệu báo cáo nghỉ việc.</span>
                  </div>
                ) : resignationData.length === 0 ? (
                  <div className="placeholder-panel">
                    <Info size={36} strokeWidth={1.5} />
                    <span>Không tìm thấy dữ liệu nghỉ việc nào phù hợp với khoảng thời gian đã lọc.</span>
                  </div>
                ) : (
                  <>
                    <div className="base-table-wrapper">
                      <table className="base-table">
                        <thead>
                          <tr>
                            <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                            <th>Mã đơn</th>
                            <th>Họ và tên</th>
                            <th>Chi nhánh</th>
                            <th style={{ textAlign: "center" }}>Ngày nộp đơn</th>
                            <th style={{ textAlign: "center" }}>Ngày nghỉ việc</th>
                            <th>Lý do</th>
                            <th style={{ textAlign: "center" }}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(resignationData, resignationPage).map((row, idx) => {
                            const isApproved = row.status === "Phê duyệt" || row.status === "Đã duyệt";
                            const isPendingApprove = row.status === "Chờ duyệt" || row.status === "Tạo mới";
                            const statusClass = 
                              isApproved ? "success" : 
                              isPendingApprove ? "warning" : "danger";
                            return (
                              <tr key={row.id}>
                                <td style={{ textAlign: "center" }}>{(resignationPage - 1) * itemsPerPage + idx + 1}</td>
                                <td style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>{row.resignationCode || "—"}</td>
                                <td style={{ color: "#003466", fontWeight: "700" }}>{row.employeeName}</td>
                                <td>{row.branch || "—"}</td>
                                <td style={{ textAlign: "center" }}>{row.requestDateStr}</td>
                                <td style={{ textAlign: "center", color: "#b91c1c" }}>{row.resignationDateStr}</td>
                                <td>{row.reason}</td>
                                <td style={{ textAlign: "center" }}>
                                  <span className={`badge-status ${statusClass}`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination */}
                    {resignationData.length > itemsPerPage && (
                      <div className="pagination-container">
                        <div className="pagination-info">
                          Hiển thị <strong>{Math.min(resignationPage * itemsPerPage, resignationData.length)}</strong> / {resignationData.length} dòng dữ liệu
                        </div>
                        <div className="pagination-controls">
                          <button 
                            className="page-btn"
                            disabled={resignationPage === 1}
                            onClick={() => setResignationPage(prev => prev - 1)}
                          >
                            Trước
                          </button>
                          {Array.from({ length: Math.ceil(resignationData.length / itemsPerPage) }).map((_, i) => (
                            <button 
                              key={i}
                              className={`page-btn ${resignationPage === i + 1 ? "active" : ""}`}
                              onClick={() => setResignationPage(i + 1)}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button 
                            className="page-btn"
                            disabled={resignationPage === Math.ceil(resignationData.length / itemsPerPage)}
                            onClick={() => setResignationPage(prev => prev + 1)}
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
