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
import ExcelJS from "exceljs";

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
  employees: { fullName: string, position: string | null, department: string | null, branch: string | null }[], 
  positions: { name: string }[], 
  departments: { name: string }[],
  approvers: { fullName: string, position: string | null, department: string | null, branch: string | null }[],
  currentUserName: string,
  salaryLevels: any[],
  isAdmin: boolean
}

const formatDate = (dateVal: string | Date | null | undefined): string => {
  if (!dateVal) return "";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "";
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

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
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const selectedContract = contracts.find(c => c.id === selectedContractId) || null;

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

  const handleDownloadTemplate = async () => {
    const headers = Object.keys(fieldMapping);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template_HDLD");

    // Add headers
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF003466" } // Sapo Blue color
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    // Create a hidden data list worksheet
    const dataListsSheet = workbook.addWorksheet("Data_Lists");
    dataListsSheet.state = "hidden";

    // Write option lists
    const employeeNames = employees.map(e => e.fullName).filter(Boolean);
    employeeNames.forEach((name, idx) => {
      dataListsSheet.getCell(`A${idx + 1}`).value = name;
    });

    CONTRACT_TYPES.forEach((type, idx) => {
      dataListsSheet.getCell(`B${idx + 1}`).value = type;
    });

    const activePositions = positions.map(p => p.name).filter(Boolean);
    activePositions.forEach((pos, idx) => {
      dataListsSheet.getCell(`C${idx + 1}`).value = pos;
    });

    const activeDepartments = departments.map(d => d.name).filter(Boolean);
    activeDepartments.forEach((dept, idx) => {
      dataListsSheet.getCell(`D${idx + 1}`).value = dept;
    });

    const activeBranches = Array.from(new Set(employees.map(e => e.branch).filter(Boolean) as string[]));
    activeBranches.forEach((branch, idx) => {
      dataListsSheet.getCell(`E${idx + 1}`).value = branch;
    });

    const activeSalaryLevels = salaryLevels.map(l => l.levelCode).filter(Boolean);
    activeSalaryLevels.forEach((level, idx) => {
      dataListsSheet.getCell(`F${idx + 1}`).value = level;
    });

    // Add validations for columns 2 to 500
    // Col A: Nhân viên
    if (employeeNames.length > 0) {
      (worksheet as any).dataValidations.add("A2:A500", {
        type: "list",
        allowBlank: true,
        formulae: [`=Data_Lists!$A$1:$A$${employeeNames.length}`],
        showErrorMessage: true,
        errorTitle: "Dữ liệu không hợp lệ",
        error: "Vui lòng chọn Nhân viên trong danh sách."
      });
    }

    // Col B: Loại hợp đồng
    (worksheet as any).dataValidations.add("B2:B500", {
      type: "list",
      allowBlank: true,
      formulae: [`=Data_Lists!$B$1:$B$${CONTRACT_TYPES.length}`],
      showErrorMessage: true,
      errorTitle: "Dữ liệu không hợp lệ",
      error: "Vui lòng chọn Loại hợp đồng trong danh sách."
    });

    // Col F: Chức vụ
    if (activePositions.length > 0) {
      (worksheet as any).dataValidations.add("F2:F500", {
        type: "list",
        allowBlank: true,
        formulae: [`=Data_Lists!$C$1:$C$${activePositions.length}`],
        showErrorMessage: true,
        errorTitle: "Dữ liệu không hợp lệ",
        error: "Vui lòng chọn Chức vụ trong danh sách."
      });
    }

    // Col G: Bộ phận
    if (activeDepartments.length > 0) {
      (worksheet as any).dataValidations.add("G2:G500", {
        type: "list",
        allowBlank: true,
        formulae: [`=Data_Lists!$D$1:$D$${activeDepartments.length}`],
        showErrorMessage: true,
        errorTitle: "Dữ liệu không hợp lệ",
        error: "Vui lòng chọn Bộ phận trong danh sách."
      });
    }

    // Col H: Chi nhánh
    if (activeBranches.length > 0) {
      (worksheet as any).dataValidations.add("H2:H500", {
        type: "list",
        allowBlank: true,
        formulae: [`=Data_Lists!$E$1:$E$${activeBranches.length}`],
        showErrorMessage: true,
        errorTitle: "Dữ liệu không hợp lệ",
        error: "Vui lòng chọn Chi nhánh trong danh sách."
      });
    }

    // Col I: Bậc lương
    if (activeSalaryLevels.length > 0) {
      (worksheet as any).dataValidations.add("I2:I500", {
        type: "list",
        allowBlank: true,
        formulae: [`=Data_Lists!$F$1:$F$${activeSalaryLevels.length}`],
        showErrorMessage: true,
        errorTitle: "Dữ liệu không hợp lệ",
        error: "Vui lòng chọn Bậc lương trong danh sách."
      });
    }

    // Auto-fit column widths
    worksheet.columns.forEach(column => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, cell => {
        const value = cell.value ? String(cell.value) : "";
        if (value.length > maxLen) {
          maxLen = value.length;
        }
      });
      column.width = Math.max(maxLen + 4, 15);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mau_hop_dong_lao_dong.xlsx";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const data = filteredContracts.map(c => {
      const row: any = {};
      Object.keys(fieldMapping).forEach(header => {
        const field = fieldMapping[header];
        let val = (c as any)[field];
        if (val instanceof Date || (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val)))) {
          val = formatDate(val);
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
              const useUTC = val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0;
              const year = useUTC ? val.getUTCFullYear() : val.getFullYear();
              const month = ((useUTC ? val.getUTCMonth() : val.getMonth()) + 1).toString().padStart(2, '0');
              const day = (useUTC ? val.getUTCDate() : val.getDate()).toString().padStart(2, '0');
              val = `${year}-${month}-${day}`;
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
    <div className="labor-contract-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .labor-contract-page-container {
          width: 100%;
          min-width: 0;
        }
        .labor-contract-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .labor-contract-layout input,
        .labor-contract-layout select,
        .labor-contract-layout textarea,
        .labor-contract-layout button,
        .labor-contract-layout table,
        .labor-contract-layout td,
        .labor-contract-layout th,
        .labor-contract-layout label,
        .labor-contract-layout .badge,
        .labor-contract-page-container .breadcrumb-banner {
          font-size: 13px !important;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          display: block;
          border-radius: 0 !important;
          margin-top: 0;
          margin-left: -10px;
          margin-right: -10px;
        }
        .panel-full {
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 5px 0px 10px 0px;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          border-radius: 4px;
          font-weight: 400;
          font-size: 13px !important;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn:active {
          transform: scale(0.98);
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .base-table-wrapper {
          max-height: 485px !important;
          height: auto !important;
          overflow-y: auto !important;
          padding-bottom: 60px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          table-layout: auto !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          text-align: center !important;
          height: 35px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .base-table td {
          padding: 2px 0.75rem !important;
          vertical-align: middle !important;
          color: #000 !important;
          font-weight: 600 !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .nowrap, .base-table .nowrap {
          white-space: nowrap !important;
        }
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
        }
        .form-control {
          padding: 6px 10px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          background: white !important;
        }
        .filter-label {
          display: block;
          margin-bottom: 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input:focus {
          border-color: var(--primary-color);
        }
        .drawer-header {
          padding: 0.65rem 1.25rem !important;
        }
        .drawer-body {
          padding: 0.75rem 1.25rem !important;
          gap: 0.65rem !important;
        }
        .drawer-form {
          gap: 0.65rem !important;
        }
        .drawer-footer {
          padding: 0.75rem 1.25rem !important;
        }
      `}} />

      {/* Header Toolbar */}
      <div className="breadcrumb-banner">
        DANH SÁCH HỢP ĐỒNG LAO ĐỘNG
      </div>

      <div className="labor-contract-layout">
        <div className="panel-full">
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center" }}>
            <button
              type="button"
              className="sapo-btn"
              onClick={() => {
                setEditingContract(null);
                setShowModal(true);
              }}
            >
              Thêm mới
            </button>

            {selectedContract && (
              <>
                {(isAdmin || selectedContract.status === "Tạo mới" || selectedContract.status === "Đã hủy") && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleEdit(selectedContract)}
                  >
                    Sửa
                  </button>
                )}

                {selectedContract.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusUpdate(selectedContract.id, "Chờ phê duyệt")}
                  >
                    Gửi
                  </button>
                )}

                {selectedContract.status === "Chờ phê duyệt" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusUpdate(selectedContract.id, "Tạo mới")}
                  >
                    Thu hồi
                  </button>
                )}

                {selectedContract.status === "Chờ phê duyệt" && isAdmin && (
                  <>
                    <button
                      type="button"
                      className="sapo-btn"
                      onClick={() => handleStatusUpdate(selectedContract.id, "Đã phê duyệt")}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="sapo-btn"
                      onClick={() => handleStatusUpdate(selectedContract.id, "Từ chối")}
                    >
                      Từ chối
                    </button>
                  </>
                )}

                {selectedContract.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusUpdate(selectedContract.id, "Đã hủy")}
                  >
                    Hủy
                  </button>
                )}
              </>
            )}

            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                className="sapo-btn"
                onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
              >
                Lọc
              </button>

              <button className="sapo-btn" onClick={handleDownloadTemplate} title="Tải file mẫu">
                Tải mẫu
              </button>
              <label className="sapo-btn" style={{ cursor: "pointer", margin: 0 }} title="Import Excel">
                Nhập Excel
                <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
              </label>
              <button className="sapo-btn" onClick={handleExportExcel} title="Xuất file Excel">
                Xuất Excel
              </button>


            </div>
          </div>

          {showFilters && (
            <div className="base-filters" style={{ marginBottom: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <select
                  className="form-control"
                  style={{ maxWidth: "200px" }}
                  value={filters.branch}
                  onChange={(e) => setFilters({...filters, branch: e.target.value})}
                >
                  {uniqueBranches.map(b => <option key={b} value={b}>{b === "Tất cả" ? "Tất cả chi nhánh" : b}</option>)}
                </select>
                <select
                  className="form-control"
                  style={{ maxWidth: "200px" }}
                  value={filters.department}
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                >
                  <option value="Tất cả">Tất cả bộ phận</option>
                  {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
                <select
                  className="form-control"
                  style={{ maxWidth: "200px" }}
                  value={filters.position}
                  onChange={(e) => setFilters({...filters, position: e.target.value})}
                >
                  <option value="Tất cả">Tất cả chức vụ</option>
                  {positions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => {
                    setSearchTerm("");
                    setFilters({
                      branch: "Tất cả",
                      department: "Tất cả",
                      position: "Tất cả"
                    });
                  }}
                  style={{ padding: "6px 12px" }}
                >
                  Đặt lại
                </button>
              </div>
            </div>
          )}

          {/* Main Table */}
          <div className="base-table-wrapper" style={paginatedContracts.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table">
              <thead>
                <tr>
                  <th className="th-first nowrap" style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                  <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Số hợp đồng</th>
                  <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Nhân viên</th>
                  <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Chi nhánh</th>
                  <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Loại hợp đồng</th>
                  <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Ngày hợp đồng</th>
                  <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Ngày kết thúc</th>
                  <th className="th-last nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map((c, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isSelected = selectedContractId === c.id;
                  const isExpanded = expandedId === c.id;
                  
                  // Status text styling
                  let statusColor = "#f59e0b"; // "Tạo mới"
                  if (c.status === "Chờ phê duyệt") statusColor = "#2563eb";
                  if (c.status === "Đã phê duyệt") statusColor = "#10b981";
                  if (c.status === "Đã hủy" || c.status === "Từ chối") statusColor = "#ef4444";

                  return (
                    <React.Fragment key={c.id}>
                      <tr 
                        className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          const nextId = selectedContractId === c.id ? null : c.id;
                          setSelectedContractId(nextId);
                          setExpandedId(nextId);
                        }}
                      >
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{globalIdx}</td>
                        <td style={{ fontWeight: 700, color: "#000" }}>{c.contractNumber}</td>
                        <td style={{ fontWeight: 600, color: "#000" }}>{c.employeeName}</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{c.branch || "—"}</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{c.contractType}</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{formatDate(c.contractDate)}</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{c.endDate ? formatDate(c.endDate) : "Vô thời hạn"}</td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          <span style={{ color: statusColor, fontWeight: 700 }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: "0", background: "#f8fafc" }}>
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
                                maxWidth: "850px"
                              }}>
                                {/* Section 1: Salary & Allowances */}
                                <div style={{ 
                                  background: "white", 
                                  padding: "0.75rem", 
                                  borderRadius: "8px", 
                                  border: "1px solid #e2e8f0",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                                  flex: "1 1 400px",
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
                                  flex: "1 1 300px",
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
                {paginatedContracts.length === 0 && (
                  <tr style={{ height: "45px" }}>
                    <td colSpan={8} style={{ textAlign: "center", color: "#64748b", verticalAlign: "middle", height: "45px" }}>
                      Chưa có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Modern Pagination */}
          {totalPages > 1 && (
            <div className="base-pagination">
              <div className="pagination-info">
                Hiển thị <strong>{paginatedContracts.length}</strong> / {filteredContracts.length} hợp đồng
              </div>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Trước
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="LaborContract" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {/* Modern Side Drawer for Add/Edit */}
      {showModal && (
        <div className="drawer-overlay" onClick={handleClose}>
          <div className="drawer-content animate-drawer-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className="drawer-header">
              <div className="header-titles">
                <h3>{editingContract ? "✏️ Cập nhật Hợp đồng" : "📄 Khởi tạo Hợp đồng mới"}</h3>
                <p className="header-sub" style={{ marginTop: "0.4rem", fontSize: "0.85rem", color: "#64748b" }}>
                  Số hợp đồng: <strong style={{ color: "var(--primary-color)" }}>{editingContract ? editingContract.contractNumber : (generatedContractNo || "(Sẽ tự động tạo)")}</strong>
                  {` | Người tạo: `}<strong>{editingContract?.creator || currentUserName}</strong>{` | Ngày: `}<strong>{editingContract?.createdDate ? new Date(editingContract.createdDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}</strong>
                </p>
              </div>
              <button onClick={handleClose} className="drawer-close-btn">&times;</button>
            </div>
            
            <div style={{ display: "flex", background: "#f8fafc", padding: "0 1rem", borderBottom: "1px solid #f1f5f9" }}>
              {[
                { id: 1, label: "Thông tin hợp đồng" },
                { id: 2, label: "Thông tin lương và phụ cấp" },
                { id: 3, label: "Thông tin BHXH" }
              ].map(tab => (
                <button 
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)} 
                  style={{ 
                    padding: "1rem 1.25rem", 
                    borderBottom: activeTab === tab.id ? "3px solid var(--primary-color)" : "3px solid transparent", 
                    color: activeTab === tab.id ? "var(--primary-color)" : "#64748b", 
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                    background: "none",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} id="labor-contract-form" style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
                {error && <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "0.5rem", fontSize: "0.9rem" }}>{error}</div>}
                
                {/* Tab 1: Thông tin hợp đồng */}
                <div style={{ display: activeTab === 1 ? "block" : "none" }} className="drawer-form">
                  
                  {/* Dòng 1: Số hợp đồng, Ngày hợp đồng */}
                  <div className="form-row" style={{ marginBottom: "1rem" }}>
                    <div className="form-group-base">
                      <label>Số hợp đồng <span style={{ color: "red" }}>*</span></label>
                      <input 
                        type="text" 
                        name="contractNumber" 
                        className="input-base readonly" 
                        value={contractNumberVal}
                        readOnly
                        placeholder="Tự động tạo..."
                        required 
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Ngày hợp đồng <span style={{ color: "red" }}>*</span></label>
                      <input 
                        type="date" 
                        name="contractDate" 
                        className="input-base" 
                        required 
                        value={contractDateVal}
                        onChange={(e) => setContractDateVal(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Dòng 2: Tên nhân viên, chức vụ, bộ phận */}
                  <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: "1rem" }}>
                    <div className="form-group-base">
                      <label>Nhân viên <span style={{ color: "red" }}>*</span></label>
                      <select 
                        name="employeeName" 
                        className="input-base" 
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
                    <div className="form-group-base">
                      <label>Chức vụ <span style={{ color: "red" }}>*</span></label>
                      <select name="position" className="input-base" required value={posValue} onChange={(e) => setPosValue(e.target.value)}>
                        <option value="" disabled>-- Chọn chức vụ --</option>
                        {positions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group-base">
                      <label>Bộ phận <span style={{ color: "red" }}>*</span></label>
                      <select name="department" className="input-base" required value={deptValue} onChange={(e) => setDeptValue(e.target.value)}>
                        <option value="" disabled>-- Chọn bộ phận --</option>
                        {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Dòng 3: Loại hợp đồng, Loại thời hạn */}
                  <div className="form-row" style={{ marginBottom: "1rem" }}>
                    <div className="form-group-base">
                      <label>Loại hợp đồng <span style={{ color: "red" }}>*</span></label>
                      <select name="contractType" className="input-base" required defaultValue={editingContract?.contractType ?? ""}>
                        <option value="" disabled>-- Chọn loại hợp đồng --</option>
                        {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group-base">
                      <label>Loại thời hạn <span style={{ color: "red" }}>*</span></label>
                      <select 
                        className="input-base" 
                        value={durationType} 
                        onChange={(e) => setDurationType(e.target.value)}
                      >
                        <option value="Có thời hạn">Có thời hạn</option>
                        <option value="Vô thời hạn">Vô thời hạn</option>
                      </select>
                    </div>
                  </div>

                  {/* Dòng 4: ngày bắt đầu, Thời gian, Dự kiến kết thúc */}
                  <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: "1rem" }}>
                    <div className="form-group-base">
                      <label>Ngày bắt đầu <span style={{ color: "red" }}>*</span></label>
                      <input 
                        type="date" 
                        name="startDate" 
                        className="input-base" 
                        required 
                        value={startDateVal}
                        onChange={(e) => setStartDateVal(e.target.value)}
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Thời gian (Tháng)</label>
                      <input 
                        type="number" 
                        name="durationMonths" 
                        className="input-base" 
                        placeholder="Nhập số tháng"
                        value={durationMonths}
                        onChange={(e) => setDurationMonths(e.target.value === "" ? "" : parseInt(e.target.value))}
                        disabled={durationType === "Vô thời hạn"}
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Dự kiến kết thúc</label>
                      <input 
                        type="date" 
                        name="endDate" 
                        className="input-base readonly" 
                        value={endDateVal}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Dòng 5: Ghi chú */}
                  <div className="form-group-base" style={{ marginBottom: 0 }}>
                    <label>Ghi chú</label>
                    <textarea name="note" className="input-base" rows={2} defaultValue={editingContract?.note ?? ""} placeholder="Nhập ghi chú thêm..."></textarea>
                  </div>

                  {/* Các trường ẩn để gửi lên server */}
                  <input type="hidden" name="creator" value={editingContract?.creator || currentUserName} />
                  <input type="hidden" name="createdDate" value={editingContract?.createdDate ? new Date(editingContract.createdDate).toISOString() : new Date().toISOString()} />
                </div>

                {/* Tab 2: Thông tin lương và phụ cấp */}
                <div style={{ display: activeTab === 2 ? "block" : "none" }} className="drawer-form">
                  <div className="form-group-base" style={{ marginBottom: "1rem" }}>
                    <label>Bậc lương <span style={{ color: "red" }}>*</span></label>
                    <select name="salaryLevel" className="input-base" required value={salaryData.level} onChange={handleSalaryLevelChange}>
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
                  <div className="form-row" style={{ gap: "0.75rem" }}>
                    <div className="form-group-base">
                      <label>Lương cơ bản (Tự động)</label>
                      <input type="text" name="salaryBase" className="input-base readonly" style={{ fontWeight: 600 }} value={formatNumber(salaryData.base)} readOnly />
                    </div>
                    <div className="form-group-base">
                      <label>Phụ cấp chuyên cần (Tự động)</label>
                      <input type="text" name="attendanceAllowance" className="input-base readonly" value={formatNumber(salaryData.attendance)} readOnly />
                    </div>
                    <div className="form-group-base">
                      <label>Phụ cấp hiệu quả (Tự động)</label>
                      <input type="text" name="performanceAllowance" className="input-base readonly" value={formatNumber(salaryData.performance)} readOnly />
                    </div>
                    <div className="form-group-base">
                      <label>Phụ cấp trách nhiệm (Tự động)</label>
                      <input type="text" name="responsibilityAllowance" className="input-base readonly" value={formatNumber(salaryData.responsibility)} readOnly />
                    </div>
                    <div className="form-group-base">
                      <label>Phụ cấp thu hút</label>
                      <input 
                        type="text" 
                        name="attractionAllowance" 
                        className="input-base" 
                        value={formatNumber(manualSalary.attraction)} 
                        onChange={(e) => setManualSalary(prev => ({ ...prev, attraction: parseInt(e.target.value.replace(/\./g, "")) || 0 }))}
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Phụ cấp vị trí</label>
                      <input 
                        type="text" 
                        name="positionAllowance" 
                        className="input-base" 
                        value={formatNumber(manualSalary.position)} 
                        onChange={(e) => setManualSalary(prev => ({ ...prev, position: parseInt(e.target.value.replace(/\./g, "")) || 0 }))}
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Hỗ trợ khác</label>
                      <input 
                        type="text" 
                        name="otherAllowance" 
                        className="input-base" 
                        value={formatNumber(manualSalary.other)} 
                        onChange={(e) => setManualSalary(prev => ({ ...prev, other: parseInt(e.target.value.replace(/\./g, "")) || 0 }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Tab 3: BHXH */}
                <div style={{ display: activeTab === 3 ? "block" : "none" }} className="drawer-form">
                  <div className="card" style={{ maxWidth: "500px", padding: "2rem", margin: "1rem auto", background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
                    <div className="form-group-base">
                      <label style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "0.5rem" }}>Số tiền đóng BHXH</label>
                      <input 
                        type="text" 
                        name="socialInsurance" 
                        className="input-base" 
                        style={{ height: "45px", fontSize: "18px", fontWeight: 700, color: "#10b981", textAlign: "center" }} 
                        value={formatNumber(manualSalary.social)} 
                        onChange={(e) => setManualSalary(prev => ({ ...prev, social: parseInt(e.target.value.replace(/\./g, "")) || 0 }))}
                      />
                      <p style={{ marginTop: "1rem", fontSize: "12px", color: "#64748b", lineHeight: 1.6, fontWeight: 400 }}>
                        * Nhập số tiền cụ thể làm căn cứ đóng Bảo hiểm xã hội cho nhân viên. <br/>
                        * Dữ liệu này sẽ được dùng để trích đóng hàng tháng trong bảng lương.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="drawer-footer" style={{ borderTop: "1px solid #f1f5f9", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" className="btn btn-outline" onClick={handleClose}>Đóng lại</button>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {activeTab > 1 && (
                    <button type="button" className="btn btn-outline" onClick={() => setActiveTab(prev => prev - 1)}>← Quay lại</button>
                  )}
                  {activeTab < 3 ? (
                    <button type="button" className="btn btn-primary" onClick={() => setActiveTab(prev => prev + 1)}>Tiếp tục →</button>
                  ) : (
                    <button type="submit" className="btn btn-primary" disabled={isPending} style={{ minWidth: "120px" }}>
                      {isPending ? "Đang xử lý..." : "Lưu hợp đồng"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
