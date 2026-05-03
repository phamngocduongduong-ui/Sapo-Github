"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { createLaborContract, updateLaborContract, updateContractStatus, bulkUpsertLaborContracts } from "./actions";
import { generateNextContractNumber } from "../nhan-vien/actions";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { Check, FileSpreadsheet, Upload, Download, Plus, RotateCcw, Filter, Clock } from "lucide-react";
import HistoryModal from "../../HistoryModal";
import { formatNumber } from "@/lib/format";
import * as XLSX from "xlsx";

type LaborContract = {
  id: string;
  employeeName: string;
  contractNumber: string;
  contractType: string;
  contractDate: Date;
  startDate: Date;
  durationMonths: number | null;
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
  branch: string | null;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  "Tạo mới": { label: "Tạo mới", badge: "badge-warning" },
  "Chờ phê duyệt": { label: "Chờ phê duyệt", badge: "badge-primary" },
  "Đã phê duyệt": { label: "Đã phê duyệt", badge: "badge-success" },
  "Đã hủy": { label: "Đã hủy", badge: "badge-danger" },
};

const CONTRACT_TYPES = ["Hợp đồng chính thức", "Hợp đồng thử việc", "Hợp đồng khoán", "Hợp đồng cộng tác viên", "Hợp đồng khác"];

interface LaborContractTableProps { 
  initialContracts: LaborContract[], 
  employees: { fullName: string, position: string | null, department: string | null }[], 
  positions: { name: string }[], 
  departments: { name: string }[],
  approvers: { fullName: string, position: string | null, department: string | null }[],
  currentUserName: string,
  salaryLevels: any[],
  isAdmin: boolean
}

export default function LaborContractTable({ 
  initialContracts, 
  employees, 
  positions, 
  departments,
  approvers,
  currentUserName,
  salaryLevels,
  isAdmin
}: LaborContractTableProps) {
  const router = useRouter();
  const [contracts, setContracts] = useState<LaborContract[]>(initialContracts);
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<LaborContract | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // States for auto-fill
  const [posValue, setPosValue] = useState("");
  const [deptValue, setDeptValue] = useState("");
  const [salaryData, setSalaryData] = useState({
    level: "",
    base: 0,
    performance: 0,
    attendance: 0,
    responsibility: 0
  });
  const [manualSalary, setManualSalary] = useState({
    attraction: 0,
    position: 0,
    other: 0,
    social: 0
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatedContractNo, setGeneratedContractNo] = useState("");
  const [selectedEmployeeForCode, setSelectedEmployeeForCode] = useState("");

  // New states for duration
  const [contractNumberVal, setContractNumberVal] = useState<string>("");
  const [durationType, setDurationType] = useState<string>("Có thời hạn");
  const [durationMonths, setDurationMonths] = useState<number | string>("");
  const [contractDateVal, setContractDateVal] = useState<string>("");
  const [startDateVal, setStartDateVal] = useState<string>("");
  const [endDateVal, setEndDateVal] = useState<string>("");

  useEffect(() => {
    if (editingContract) {
      setPosValue(editingContract.position);
      setDeptValue(editingContract.department);
      setSalaryData({
        level: editingContract.salaryLevel || "",
        base: editingContract.salaryBase,
        performance: editingContract.performanceAllowance,
        attendance: editingContract.attendanceAllowance,
        responsibility: editingContract.responsibilityAllowance
      });
      setManualSalary({
        attraction: editingContract.attractionAllowance,
        position: editingContract.positionAllowance,
        other: editingContract.otherAllowance,
        social: editingContract.socialInsurance
      });
      
      // Init duration states
      setContractNumberVal(editingContract.contractNumber);
      setDurationMonths(editingContract.durationMonths || "");
      setContractDateVal(editingContract.contractDate ? new Date(editingContract.contractDate).toISOString().split('T')[0] : "");
      setStartDateVal(editingContract.startDate ? new Date(editingContract.startDate).toISOString().split('T')[0] : "");
      setEndDateVal(editingContract.endDate ? new Date(editingContract.endDate).toISOString().split('T')[0] : "");
      setDurationType(editingContract.endDate ? "Có thời hạn" : "Vô thời hạn");

      setActiveTab(1);
    } else {
      setPosValue("");
      setDeptValue("");
      setSalaryData({ level: "", base: 0, performance: 0, attendance: 0, responsibility: 0 });
      setManualSalary({ attraction: 0, position: 0, other: 0, social: 0 });
      setGeneratedContractNo("");
      setSelectedEmployeeForCode("");
      
      setContractNumberVal("");
      setDurationMonths("");
      setContractDateVal("");
      setStartDateVal("");
      setEndDateVal("");
      setDurationType("Có thời hạn");

      setActiveTab(1);
    }
  }, [editingContract, showModal]);

  useEffect(() => {
    if (!editingContract && selectedEmployeeForCode) {
      generateNextContractNumber(selectedEmployeeForCode).then(no => {
        setGeneratedContractNo(no);
        setContractNumberVal(no);
      });
    } else if (!selectedEmployeeForCode && !editingContract) {
      setGeneratedContractNo("");
      setContractNumberVal("");
    }
  }, [selectedEmployeeForCode, editingContract]);

  useEffect(() => {
    if (durationType === "Có thời hạn" && contractDateVal && durationMonths) {
      const start = new Date(contractDateVal);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setMonth(start.getMonth() + Number(durationMonths));
        setEndDateVal(end.toISOString().split('T')[0]);
      }
    } else if (durationType === "Vô thời hạn") {
      setEndDateVal("");
      setDurationMonths("");
    }
  }, [contractDateVal, durationMonths, durationType]);

  function handleClose() {
    setShowModal(false);
    setEditingContract(null);
    setPosValue("");
    setDeptValue("");
    setSalaryData({ level: "", base: 0, performance: 0, attendance: 0, responsibility: 0 });
    setGeneratedContractNo("");
    setSelectedEmployeeForCode("");
    setManualSalary({ attraction: 0, position: 0, other: 0, social: 0 });
    setContractNumberVal("");
    setDurationMonths("");
    setContractDateVal("");
    setStartDateVal("");
    setEndDateVal("");
    setDurationType("Có thời hạn");
    setActiveTab(1);
  }

  function handleEdit(contract: LaborContract) {
    setEditingContract(contract);
    setShowModal(true);
  }

  function handleEmployeeChange(name: string) {
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
        attendance: levelObj.attendanceBonus,
        responsibility: levelObj.responsibilityBonus
      });
    } else {
      setSalaryData({ level: levelCode, base: 0, performance: 0, attendance: 0, responsibility: 0 });
    }
  }

  function handleStatusUpdate(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái sang "${newStatus}"?`)) return;
    startTransition(async () => {
      try {
        await updateContractStatus(id, newStatus);
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const rawFormData = new FormData(e.currentTarget);
    const formData = new FormData();
    
    rawFormData.forEach((value, key) => {
      const currencyFields = ["salaryBase", "attendanceAllowance", "performanceAllowance", "responsibilityAllowance", "attractionAllowance", "positionAllowance", "otherAllowance", "socialInsurance"];
      if (currencyFields.includes(key)) {
        formData.append(key, value.toString().replace(/\./g, ""));
      } else {
        formData.append(key, value);
      }
    });

    startTransition(async () => {
      try {
        if (editingContract) {
          await updateLaborContract(editingContract.id, formData, editingContract.status);
        } else {
          await createLaborContract(formData);
        }
        handleClose();
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  // --- EXCEL HANDLERS ---
  const fieldMapping: any = {
    "Nhân viên": "employeeName",
    "Loại hợp đồng": "contractType",
    "Ngày hợp đồng": "contractDate",
    "Ngày bắt đầu": "startDate",
    "Ngày kết thúc": "endDate",
    "Chức vụ": "position",
    "Bộ phận": "department",
    "Chi nhánh": "branch",
    "Bậc lương": "salaryLevel",
    "Lương cơ bản": "salaryBase",
    "PC Chuyên cần": "attendanceAllowance",
    "PC Hiệu quả": "performanceAllowance",
    "PC Trách nhiệm": "responsibilityAllowance",
    "PC Thu hút": "attractionAllowance",
    "PC Vị trí": "positionAllowance",
    "PC Khác": "otherAllowance",
    "Đóng BHXH": "socialInsurance",
    "Ghi chú": "note"
  };

  const handleDownloadTemplate = () => {
    const headers = Object.keys(fieldMapping);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_HDLD");
    XLSX.writeFile(wb, "mau_hop_dong_lao_dong.xlsx");
  };

  const handleExportExcel = () => {
    const data = filteredContracts.map(c => {
      const row: any = {};
      Object.keys(fieldMapping).forEach(header => {
        const field = fieldMapping[header];
        let val = (c as any)[field];
        if (val instanceof Date || (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val)))) {
          val = new Date(val).toLocaleDateString("vi-VN");
        }
        row[header] = val || "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HDLD");
    XLSX.writeFile(wb, "danh_sach_hop_dong.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData: any[] = XLSX.utils.sheet_to_json(ws);

      const processedData = rawData.map(row => {
        const item: any = {};
        Object.keys(fieldMapping).forEach(header => {
          if (row[header] !== undefined) {
            let val = row[header];
            if (val instanceof Date) {
              val = val.toISOString();
            }
            item[fieldMapping[header]] = val;
          }
        });
        return item;
      });

      const existingKeys = contracts.map(c => `${c.employeeName}|${c.contractType}`);
      const conflictNames = processedData
        .filter(d => existingKeys.includes(`${d.employeeName}|${d.contractType}`))
        .map(d => `${d.employeeName} (${d.contractType})`);

      if (conflictNames.length > 0) {
        if (!confirm(`Các hợp đồng sau đã tồn tại: ${conflictNames.join(", ")}. Bạn có muốn cập nhật thông tin cho chúng không?`)) {
          return;
        }
      }

      startTransition(async () => {
        try {
          await bulkUpsertLaborContracts(processedData);
          alert("Import dữ liệu thành công!");
          router.refresh();
        } catch (err: any) {
          alert("Lỗi import: " + err.message);
        }
      });
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    branch: "Tất cả",
    position: "Tất cả",
    department: "Tất cả"
  });
  // Real-time Auto Sync
  useRealTimeSync("labor-contracts", contracts, (data: any) => setContracts(data));

  const filteredContracts = contracts.filter(c => {
    const matchSearch = 
      c.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchBranch = filters.branch === "Tất cả" || c.branch === filters.branch;
    const matchPosition = filters.position === "Tất cả" || c.position === filters.position;
    const matchDepartment = filters.department === "Tất cả" || c.department === filters.department;

    return matchSearch && matchBranch && matchPosition && matchDepartment;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const uniqueBranches = ["Tất cả", ...new Set(contracts.map(c => c.branch).filter(Boolean) as string[])];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Hợp đồng lao động</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn btn-outline" onClick={handleDownloadTemplate}>
            <FileSpreadsheet size={18} style={{ marginRight: "6px" }} /> File mẫu
          </button>
          <label className="btn btn-outline" style={{ cursor: "pointer" }}>
            <Upload size={18} style={{ marginRight: "6px" }} /> Import Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
          </label>
          <button className="btn btn-outline" onClick={handleExportExcel}>
            <Download size={18} style={{ marginRight: "6px" }} /> Tải Excel
          </button>
          <button className="btn btn-outline" onClick={() => router.refresh()}>
            <RotateCcw size={18} style={{ marginRight: "6px" }} /> Làm mới
          </button>
          <button className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} style={{ marginRight: "6px" }} /> {showFilters ? "Ẩn lọc" : "Lọc"}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingContract(null); setShowModal(true); }}>
            <Plus size={18} style={{ marginRight: "6px" }} /> Thêm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div>
          <label className="filter-label">Tìm kiếm</label>
          <input type="text" className="input" placeholder="Tên NV, Số HĐ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div>
          <label className="filter-label">Chi nhánh</label>
          <select className="input" value={filters.branch} onChange={(e) => setFilters({...filters, branch: e.target.value})}>
            {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="filter-label">Bộ phận</label>
          <select className="input" value={filters.department} onChange={(e) => setFilters({...filters, department: e.target.value})}>
            <option value="Tất cả">Tất cả</option>
            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="filter-label">Chức vụ</label>
          <select className="input" value={filters.position} onChange={(e) => setFilters({...filters, position: e.target.value})}>
            <option value="Tất cả">Tất cả</option>
            {positions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>
      </div>
    )}

      <div className="table-container" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Số hợp đồng</th>
              <th>Nhân viên</th>
              <th>Chi nhánh</th>
              <th>Trạng thái</th>
              <th>Loại hợp đồng</th>
              <th>Ngày hợp đồng</th>
              <th>Ngày kết thúc</th>
              <th style={{ width: "280px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedContracts.map((c, idx) => {
              const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
              const st = STATUS_MAP[c.status] ?? { label: c.status, badge: "badge-warning" };
              const isExpanded = expandedId === c.id;
              
              return (
                <React.Fragment key={c.id}>
                  <tr 
                    style={{ cursor: "pointer", background: isExpanded ? "#f8fafc" : "inherit" }}
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <td>{globalIdx}</td>
                    <td style={{ fontWeight: 600 }}>{c.contractNumber}</td>
                    <td style={{ fontWeight: 500 }}>{c.employeeName}</td>
                    <td>{c.branch || "—"}</td>
                    <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                    <td>{c.contractType}</td>
                    <td>{new Date(c.contractDate).toLocaleDateString("vi-VN")}</td>
                    <td>{c.endDate ? new Date(c.endDate).toLocaleDateString("vi-VN") : "Vô thời hạn"}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        {isAdmin || (c.status !== "Đã phê duyệt") ? (
                          <>
                            {(isAdmin || c.status === "Tạo mới" || c.status === "Đã hủy") && (
                              <button onClick={() => handleEdit(c)} className="btn btn-sm btn-outline">Sửa</button>
                            )}
                            
                            {c.status === "Tạo mới" && (
                              <button onClick={() => handleStatusUpdate(c.id, "Chờ phê duyệt")} className="btn btn-sm btn-primary">Gửi</button>
                            )}
                            
                            {c.status === "Chờ phê duyệt" && (
                              <button onClick={() => handleStatusUpdate(c.id, "Tạo mới")} className="btn btn-sm btn-warning">Thu hồi</button>
                            )}

                            {c.status === "Chờ phê duyệt" && isAdmin && (
                              <>
                                <button onClick={() => handleStatusUpdate(c.id, "Đã phê duyệt")} className="btn btn-sm btn-primary">Duyệt</button>
                                <button onClick={() => handleStatusUpdate(c.id, "Từ chối")} className="btn btn-sm btn-danger">Từ chối</button>
                              </>
                            )}
  
                            {c.status === "Tạo mới" && (
                              <button onClick={() => handleStatusUpdate(c.id, "Đã hủy")} className="btn btn-sm btn-danger">Hủy</button>
                            )}

                            {c.status === "Đã phê duyệt" && isAdmin && (
                              <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", marginLeft: "4px" }}>
                                <Check size={14} /> Admin
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                            <Check size={14} /> Hoàn tất
                          </span>
                        )}
                        <button 
                          className="btn btn-sm btn-outline" 
                          onClick={() => setHistoryRecordId(c.id)}
                          title="Lịch sử thay đổi"
                        >
                          Lịch sử
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} style={{ padding: "0", background: "#f8fafc" }}>
                        <div style={{ 
                          padding: "0.75rem", 
                          position: "sticky",
                          left: 0,
                          width: "min-content",
                          minWidth: "100%",
                          maxWidth: "calc(100vw - 280px)",
                          borderBottom: "2px solid var(--primary-color)",
                          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                        }}>
                          <div style={{ 
                            display: "flex", 
                            flexWrap: "wrap", 
                            gap: "0.75rem",
                            maxWidth: "850px" // More compact total width
                          }}>
                            {/* Section 1: Salary & Allowances */}
                            <div style={{ 
                              background: "white", 
                              padding: "0.75rem", 
                              borderRadius: "8px", 
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                              flex: "1 1 400px", // Reduced from 500px
                              minWidth: "280px"
                            }}>
                              <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--primary-color)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                                💰 Lương & Phụ cấp
                              </h4>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 1rem" }}>
                                {[
                                  { label: "Bậc lương", value: c.salaryLevel || "—", bold: true },
                                  { label: "Lương cơ bản", value: `${formatNumber(c.salaryBase)}đ` },
                                  { label: "PC Chuyên cần", value: `${formatNumber(c.attendanceAllowance)}đ` },
                                  { label: "PC Hiệu quả", value: `${formatNumber(c.performanceAllowance)}đ` },
                                  { label: "PC Trách nhiệm", value: `${formatNumber(c.responsibilityAllowance)}đ` },
                                  { label: "PC Thu hút", value: `${formatNumber(c.attractionAllowance)}đ` },
                                  { label: "PC Vị trí", value: `${formatNumber(c.positionAllowance)}đ` },
                                  { label: "Hỗ trợ khác", value: `${formatNumber(c.otherAllowance)}đ` }
                                ].map((item, i) => (
                                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", borderBottom: "1px solid #f8fafc", paddingBottom: "1px" }}>
                                    <span style={{ color: "#64748b" }}>{item.label}:</span>
                                    <span style={{ fontWeight: item.bold ? 700 : 600, color: item.bold ? "var(--primary-color)" : "inherit" }}>{item.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Section 2: Insurance & Note */}
                            <div style={{ 
                              display: "flex", 
                              flexDirection: "column", 
                              gap: "0.5rem",
                              flex: "1 1 300px", // Reduced from 350px
                              minWidth: "260px"
                            }}>
                              <div style={{ 
                                background: "white", 
                                padding: "0.75rem", 
                                borderRadius: "8px", 
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                              }}>
                                <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--success-color)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                                  🛡️ Bảo hiểm xã hội
                                </h4>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ color: "#64748b", fontSize: "0.75rem" }}>Mức đóng BHXH:</span>
                                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--success-color)" }}>{formatNumber(c.socialInsurance)}đ</span>
                                </div>
                              </div>

                              <div style={{ 
                                background: "white", 
                                padding: "0.6rem 0.75rem", 
                                borderRadius: "8px", 
                                border: "1px solid #e2e8f0",
                                flex: 1
                              }}>
                                <span style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}>📝 Ghi chú:</span>
                                <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.75rem", color: "#475569", lineHeight: "1.2" }}>
                                  {c.note || "Không có ghi chú bổ sung."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="LaborContract" 
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


        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: "800px", borderRadius: "12px", border: "none" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #f1f5f9", padding: "1.25rem 1.5rem", display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {editingContract ? "✏️ Cập nhật Hợp đồng" : "📄 Khởi tạo Hợp đồng mới"}
                    </h3>
                    <div style={{ marginTop: "0.6rem", fontSize: "0.95rem", color: "#1e293b" }}>
                       Số hợp đồng: <strong style={{ color: "var(--primary-color)" }}>{editingContract ? editingContract.contractNumber : (generatedContractNo || "(Sẽ tự động tạo)")}</strong>
                    </div>
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
                    
                    {/* Dòng 1: Số hợp đồng, Ngày hợp đồng */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                      <div className="form-group">
                        <label>Số hợp đồng *</label>
                        <input 
                          type="text" 
                          name="contractNumber" 
                          className="form-control" 
                          value={contractNumberVal}
                          readOnly
                          style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                          placeholder="Tự động tạo..."
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label>Ngày hợp đồng *</label>
                        <input 
                          type="date" 
                          name="contractDate" 
                          className="form-control" 
                          required 
                          value={contractDateVal}
                          onChange={(e) => setContractDateVal(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Dòng 2: Tên nhân viên, chức vụ, bộ phận */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                      <div className="form-group">
                        <label>Nhân viên *</label>
                        <select 
                          name="employeeName" 
                          className="form-control" 
                          required 
                          defaultValue={editingContract?.employeeName ?? ""}
                          onChange={(e) => {
                            handleEmployeeChange(e.target.value);
                            setSelectedEmployeeForCode(e.target.value);
                          }}
                        >
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

                    {/* Dòng 3: Loại hợp đồng, Loại thời hạn */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                      <div className="form-group">
                        <label>Loại hợp đồng *</label>
                        <select name="contractType" className="form-control" required defaultValue={editingContract?.contractType ?? ""}>
                          <option value="" disabled>-- Chọn loại hợp đồng --</option>
                          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Loại thời hạn *</label>
                        <select 
                          className="form-control" 
                          value={durationType} 
                          onChange={(e) => setDurationType(e.target.value)}
                        >
                          <option value="Có thời hạn">Có thời hạn</option>
                          <option value="Vô thời hạn">Vô thời hạn</option>
                        </select>
                      </div>
                    </div>

                    {/* Dòng 4: ngày bắt đầu, Thời gian, Dự kiến kết thúc */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                      <div className="form-group">
                        <label>Ngày bắt đầu *</label>
                        <input 
                          type="date" 
                          name="startDate" 
                          className="form-control" 
                          required 
                          value={startDateVal}
                          onChange={(e) => setStartDateVal(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Thời gian (Tháng)</label>
                        <input 
                          type="number" 
                          name="durationMonths" 
                          className="form-control" 
                          placeholder="Nhập số tháng"
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value === "" ? "" : parseInt(e.target.value))}
                          disabled={durationType === "Vô thời hạn"}
                        />
                      </div>
                      <div className="form-group">
                        <label>Dự kiến kết thúc</label>
                        <input 
                          type="date" 
                          name="endDate" 
                          className="form-control" 
                          style={{ background: "#f1f5f9" }}
                          value={endDateVal}
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Dòng 5: Ghi chú */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Ghi chú</label>
                      <textarea name="note" className="form-control" rows={2} defaultValue={editingContract?.note ?? ""} placeholder="Nhập ghi chú thêm..."></textarea>
                    </div>

                    {/* Các trường ẩn để gửi lên server */}
                    <input type="hidden" name="creator" value={editingContract?.creator || currentUserName} />
                    <input type="hidden" name="createdDate" value={editingContract?.createdDate ? new Date(editingContract.createdDate).toISOString() : new Date().toISOString()} />
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
                              {l.levelCode} - Tổng: {formatNumber(total)}đ
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      <div className="form-group">
                        <label>Lương cơ bản (Tự động)</label>
                        <input type="text" name="salaryBase" className="form-control" style={{ background: "#f8fafc", fontWeight: 600 }} value={formatNumber(salaryData.base)} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp chuyên cần (Tự động)</label>
                        <input type="text" name="attendanceAllowance" className="form-control" style={{ background: "#f8fafc" }} value={formatNumber(salaryData.attendance)} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp hiệu quả (Tự động)</label>
                        <input type="text" name="performanceAllowance" className="form-control" style={{ background: "#f8fafc" }} value={formatNumber(salaryData.performance)} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp trách nhiệm (Tự động)</label>
                        <input type="text" name="responsibilityAllowance" className="form-control" style={{ background: "#f8fafc" }} value={formatNumber(salaryData.responsibility)} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp thu hút</label>
                        <input 
                          type="text" 
                          name="attractionAllowance" 
                          className="form-control" 
                          value={formatNumber(manualSalary.attraction)} 
                          onChange={(e) => setManualSalary(prev => ({ ...prev, attraction: parseInt(e.target.value.replace(/\./g, "")) || 0 }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Phụ cấp vị trí</label>
                        <input 
                          type="text" 
                          name="positionAllowance" 
                          className="form-control" 
                          value={formatNumber(manualSalary.position)} 
                          onChange={(e) => setManualSalary(prev => ({ ...prev, position: parseInt(e.target.value.replace(/\./g, "")) || 0 }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Hỗ trợ khác</label>
                        <input 
                          type="text" 
                          name="otherAllowance" 
                          className="form-control" 
                          value={formatNumber(manualSalary.other)} 
                          onChange={(e) => setManualSalary(prev => ({ ...prev, other: parseInt(e.target.value.replace(/\./g, "")) || 0 }))}
                        />
                      </div>
                    </div>
                  </div>
   
                  {/* Tab 3: BHXH */}
                  <div style={{ display: activeTab === 3 ? "block" : "none" }}>
                    <div className="card" style={{ maxWidth: "500px", padding: "2rem", margin: "1rem auto", background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
                      <div className="form-group">
                        <label style={{ fontSize: "1rem", fontWeight: 600 }}>Số tiền đóng BHXH</label>
                        <input 
                          type="text" 
                          name="socialInsurance" 
                          className="form-control" 
                          style={{ height: "45px", fontSize: "1.1rem" }} 
                          value={formatNumber(manualSalary.social)} 
                          onChange={(e) => setManualSalary(prev => ({ ...prev, social: parseInt(e.target.value.replace(/\./g, "")) || 0 }))}
                        />
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
      <style>{`
        .filter-label { display: block; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .input { width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; transition: border-color 0.2s; }
        .input:focus { border-color: var(--primary-color); }
        .btn-icon { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 1.1rem; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
      `}</style>
    </>
  );
}
