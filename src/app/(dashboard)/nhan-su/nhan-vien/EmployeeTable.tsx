"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { createEmployee, updateEmployee, updateEmployeeStatus, bulkUpsertEmployees, generateNextEmployeeCode } from "./actions";
import {
  Pencil, Trash2, CheckCircle, PowerOff, FileSpreadsheet,
  Upload, Download, Plus, RotateCcw, Filter, Search,
  Clock, MoreHorizontal, User, Mail, Phone, Briefcase, MapPin,
  ChevronDown, ExternalLink, History, AlertTriangle, Calendar,
  Fingerprint, Database
} from "lucide-react";
import HistoryModal from "../../HistoryModal";
import * as XLSX from "xlsx";

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
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterBranch, setFilterBranch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "success" | "warning";
    confirmText: string;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "danger",
    confirmText: "Xác nhận"
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtering logic
  const filteredEmployees = employees.filter(emp => {
    const matchSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.branch || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.position || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchBranch = !filterBranch || emp.branch === filterBranch;
    const matchDepartment = !filterDepartment || emp.department === filterDepartment;
    const matchGender = !filterGender || emp.gender === filterGender;

    return matchSearch && matchBranch && matchDepartment && matchGender;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBranch, filterDepartment, filterGender]);

  // Real-time Auto Sync
  useRealTimeSync("employees", employees, setEmployees);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  function handleClose() {
    setShowModal(false);
    setEditingEmployee(null);
    setError(null);
    setSelectedBranch("");
    setGeneratedCode("");
  }

  function handleEdit(employee: any) {
    setEditingEmployee(employee);
    setShowModal(true);
  }

  function handleStatusChange(id: string, status: string, name: string) {
    setConfirmDialog({
      show: true,
      title: status === "Nghỉ việc" ? "Cho nghỉ việc" : "Kích hoạt lại",
      message: status === "Nghỉ việc"
        ? `Bạn có chắc chắn muốn cho nhân viên "${name}" nghỉ việc không?`
        : `Bạn có chắc chắn muốn kích hoạt lại nhân viên "${name}" không?`,
      type: status === "Nghỉ việc" ? "danger" : "success",
      confirmText: status === "Nghỉ việc" ? "Xác nhận" : "Kích hoạt",
      onConfirm: async () => {
        startTransition(async () => {
          try {
            await updateEmployeeStatus(id, status);
            setConfirmDialog(prev => ({ ...prev, show: false }));
          } catch (err: any) {
            setError(err.message);
          }
        });
      }
    });
  }

  useEffect(() => {
    if (!editingEmployee && selectedBranch) {
      generateNextEmployeeCode(selectedBranch).then(code => {
        setGeneratedCode(code);
      });
    } else if (!selectedBranch) {
      setGeneratedCode("");
    }
  }, [selectedBranch, editingEmployee]);

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
        if (err.message.includes("Mã thẻ đã sử dụng cho nhân viên")) {
          alert(err.message);
        }
        setError(err.message);
      }
    });
  }

  // --- EXCEL HANDLERS ---
  const fieldMapping: any = {
    "Họ và tên": "fullName",
    "Giới tính": "gender",
    "Chi nhánh": "branch",
    "Chức vụ": "position",
    "Bộ phận": "department",
    "Ngày vào làm": "startDate",
    "Mã thẻ": "cardCode",
    "Số điện thoại": "phone",
    "Email": "email",
    "Số CCCD": "idCardNumber",
    "Ngày cấp CCCD": "idCardDate",
    "Địa chỉ": "address",
    "Trình độ học vấn": "educationLevel",
    "Tình trạng hôn nhân": "maritalStatus",
    "Nơi làm việc": "workplace",
    "Bậc lương": "salaryLevel"
  };

  const handleDownloadTemplate = () => {
    const headers = Object.keys(fieldMapping);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "mau_nhan_vien.xlsx");
  };

  const handleExportExcel = () => {
    const data = employees.map(emp => {
      const row: any = {};
      Object.keys(fieldMapping).forEach(header => {
        const field = fieldMapping[header];
        let val = emp[field];
        if (val instanceof Date || (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val)))) {
          val = new Date(val).toLocaleDateString("vi-VN");
        }
        row[header] = val || "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhanVien");
    XLSX.writeFile(wb, "danh_sach_nhan_vien.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          alert("File Excel không có dữ liệu!");
          return;
        }

        const processedData = rawData.map(row => {
          const item: any = {};
          // Normalize row keys to handle whitespace or case differences
          const normalizedRow: any = {};
          Object.keys(row).forEach(k => {
            normalizedRow[k.trim()] = row[k];
          });

          Object.keys(fieldMapping).forEach(header => {
            const mappedField = fieldMapping[header];
            // Check for exact match or trimmed match
            const value = normalizedRow[header] || normalizedRow[header.trim()];

            if (value !== undefined && value !== null) {
              let val = value;
              if (val instanceof Date) {
                val = val.toISOString();
              }
              item[mappedField] = val;
            }
          });
          return item;
        }).filter(item => item.fullName); // Ensure at least fullName exists

        if (processedData.length === 0) {
          alert("Không tìm thấy dữ liệu hợp lệ (vui lòng kiểm tra tiêu đề cột trong file Excel)!");
          return;
        }

        startTransition(async () => {
          try {
            await bulkUpsertEmployees(processedData);
            alert(`Import thành công ${processedData.length} nhân viên!`);
          } catch (err: any) {
            alert("Lỗi lưu dữ liệu: " + err.message);
          }
        });
      } catch (err: any) {
        alert("Lỗi đọc file Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset input
  };

  const calculateSeniority = (startDate: string | Date | null) => {
    if (!startDate) return "—";
    const start = new Date(startDate);
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years < 0) return "—";
    if (years === 0 && months === 0) return "Mới vào";

    let res = "";
    if (years > 0) res += `${years} năm `;
    if (months > 0) res += `${months} tháng`;

    return res.trim();
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(-2);
  };

  const getRandomColor = (name: string) => {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const calculateSeniorityLabel = (startDate: string | Date) => {
    const start = new Date(startDate);
    const now = new Date();
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const months = Math.floor((years % 1) * 12);

    if (years < 1) {
      const days = Math.floor(years * 365.25);
      if (days < 30) return `${days} ngày đồng hành`;
      return `${months} tháng đồng hành`;
    }
    return `Đã gắn bó ${Math.floor(years)} năm ${months > 0 ? months + ' th' : ''}`;
  };

  const getSeniorityClass = (startDate: string | Date | null) => {
    if (!startDate) return "";
    const start = new Date(startDate);
    const now = new Date();
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years >= 3) return "senior-legend";
    if (years >= 1) return "senior-stable";
    return "senior-fresh";
  };

  const renderSeniorityHierarchy = (startDate: string | Date | null) => {
    if (!startDate) return <span className="seniority-tag-empty">—</span>;
    const start = new Date(startDate);
    const now = new Date();
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    let tier = { name: "Thành viên mới", class: "bronze" };
    if (years >= 5) tier = { name: "Cống hiến", class: "diamond" };
    else if (years >= 3) tier = { name: "Gắn bó", class: "gold" };
    else if (years >= 1) tier = { name: "Ổn định", class: "silver" };

    return (
      <div className={`seniority-badge-simple ${tier.class}`}>
        {tier.name}
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .base-toolbar {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 0.75rem !important;
          padding: 0 !important;
          gap: 1rem !important;
          flex-wrap: nowrap !important;
          width: 100% !important;
          font-family: "Segoe UI", sans-serif !important;
        }
        .toolbar-left {
          display: flex !important;
          align-items: center !important;
          gap: 1rem !important;
        }
        .toolbar-right {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
        }
        .btn-group-base {
          display: flex !important;
          gap: 0.75rem !important;
        }
        .page-title-base {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          margin: 0 !important;
        }
        .badge-count {
          background: #e2e8f0 !important;
          color: #475569 !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          padding: 2px 8px !important;
          border-radius: 999px !important;
          margin-left: 0.25rem !important;
        }
        .base-table-wrapper {
          max-height: 485px !important;
          height: auto !important;
          overflow-y: auto !important;
          padding-bottom: 60px !important;
        }
        .base-table {
          height: auto !important;
        }
        .base-table th {
          background: #f1f5f9 !important;
          padding: 0px 0.75rem !important;
          font-weight: 700 !important;
          color: #334155 !important;
          border-bottom: 1px solid #e0e6ed !important;
          text-align: center !important;
          height: 35px !important;
        }
        .base-table td {
          padding: 0px 0.75rem !important;
          vertical-align: middle !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        /* Optimize Drawer Form spacing to prevent cardCode from being obscured */
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
        .form-section {
          gap: 0.4rem !important;
        }
        .form-row {
          gap: 0.5rem !important;
        }
        .form-group-base {
          gap: 0.05rem !important;
        }
        .form-group-base label {
          margin-bottom: 0.1rem !important;
          font-size: 12px !important;
        }
        .input-base, select.input-base {
          padding: 0.35rem 0.65rem !important;
          font-size: 13px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
        }
        select.input-base {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .section-title {
          font-size: 13px !important;
          padding-bottom: 2px !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
        }
        .drawer-footer {
          padding: 0.75rem 1.25rem !important;
        }
      ` }} />
      {/* Header Toolbar */}
      <div className="base-toolbar">
        <div className="toolbar-left">
          <h3 className="page-title-base">👥 Danh sách nhân viên</h3>
          <span className="badge-count">{employees.length}</span>
          <div className="search-box-base">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-base btn-outline" onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}>
            <Filter size={18} />
          </button>
        </div>
        <div className="toolbar-right">
          <div className="btn-group-base">
            <button className="btn-base btn-outline" onClick={handleDownloadTemplate} title="Tải file mẫu">
              <FileSpreadsheet size={18} style={{ marginRight: "5px" }} /> <span>File mẫu</span>
            </button>
            <label className="btn-base btn-outline" style={{ cursor: "pointer" }} title="Import Excel">
              <Upload size={18} style={{ marginRight: "5px" }} /> <span>Nhập Excel</span>
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
            </label>
            <button className="btn-base btn-outline" onClick={handleExportExcel} title="Xuất file Excel">
              <Download size={18} style={{ marginRight: "5px" }} /> <span>Xuất Excel</span>
            </button>
          </div>
          <button className="btn-base btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: "6px" }} /> Thêm mới
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="base-filters animate-fade-in" style={{ marginBottom: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <select
              className="form-control"
              style={{ maxWidth: "200px" }}
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              className="form-control"
              style={{ maxWidth: "200px" }}
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">Tất cả bộ phận</option>
              {activeDepartments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              className="form-control"
              style={{ maxWidth: "200px" }}
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
            >
              <option value="">Tất cả giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
            <button
              className="btn-base btn-outline"
              onClick={() => {
                setSearchTerm("");
                setFilterBranch("");
                setFilterDepartment("");
                setFilterGender("");
              }}
            >
              <RotateCcw size={16} /> Đặt lại
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="base-table-wrapper" style={paginatedEmployees.length === 0 ? { height: "auto" } : undefined}>
        <table className="base-table">
          <thead>
            <tr>
              <th className="th-first" style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th>Nhân viên</th>
              <th>Mã NV</th>
              <th>Đơn vị / Chức vụ</th>
              <th>Ngày gia nhập</th>
              <th style={{ textAlign: "center" }}>Mã thẻ</th>
              <th>Thâm niên</th>
              <th>Trạng thái</th>
              <th className="th-last" style={{ textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((emp, index) => (
              <tr key={emp.id}>
                <td style={{ textAlign: "center", color: "#64748b" }}>
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                <td>
                  <div className="employee-info-base">
                    <div className="avatar-base" style={{ backgroundColor: getRandomColor(emp.fullName) }}>
                      {getInitials(emp.fullName)}
                    </div>
                    <div className="info-text">
                      <div className="name">{emp.fullName}</div>
                      <div className="email">{emp.email || "Chưa có email"}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="code-pill">{emp.employeeCode}</span>
                </td>
                <td>
                  <div className="unit-info">
                    <div className="dept">{emp.department}</div>
                    <div className="pos">{emp.position}</div>
                  </div>
                </td>
                <td>
                  <span className="date-text">{emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}</span>
                </td>
                <td style={{ textAlign: "center" }}>
                  {emp.cardCode ? (
                    <span className="code-pill" style={{ background: "#f1f5f9", color: "#334155", fontWeight: 600 }}>{emp.cardCode}</span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>
                <td>
                  {renderSeniorityHierarchy(emp.startDate)}
                </td>
                <td>
                  <div className={`status-pill ${(emp.status === "Đang làm việc" || emp.status === "ACTIVE") ? "status-active" : "status-inactive"}`}>
                    {(emp.status === "Đang làm việc" || emp.status === "ACTIVE") ? "Đang làm việc" : "Nghỉ việc"}
                  </div>
                </td>
                <td style={{ textAlign: "right", position: "relative", zIndex: openMenuId === emp.id ? 50 : 1 }}>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isLastRows = index >= paginatedEmployees.length - 2;
                      const isFirstRow = index === 0;
                      setDropdownDirection((isLastRows && !isFirstRow) ? "up" : "down");
                      setOpenMenuId(openMenuId === emp.id ? null : emp.id);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {openMenuId === emp.id && (
                    <div className={`action-dropdown ${dropdownDirection === "up" ? "open-up" : ""}`} onClick={(e) => e.stopPropagation()}>
                      <div className="dropdown-item" onClick={() => { handleEdit(emp); setOpenMenuId(null); }}>
                        <Pencil size={14} /> Chỉnh sửa
                      </div>
                      <div className="dropdown-item" onClick={() => { setHistoryRecordId(emp.id); setOpenMenuId(null); }}>
                        <History size={14} /> Lịch sử
                      </div>
                      <div className="divider"></div>
                      {(emp.status === "Đang làm việc" || emp.status === "ACTIVE") ? (
                        <div className="dropdown-item danger" onClick={() => { handleStatusChange(emp.id, "Nghỉ việc", emp.fullName); setOpenMenuId(null); }}>
                          <PowerOff size={14} /> Cho nghỉ việc
                        </div>
                      ) : (
                        <div className="dropdown-item success" onClick={() => { handleStatusChange(emp.id, "Đang làm việc", emp.fullName); setOpenMenuId(null); }}>
                          <CheckCircle size={14} /> Kích hoạt lại
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {paginatedEmployees.length === 0 && (
              <tr style={{ height: "45px" }}>
                <td colSpan={9} style={{ textAlign: "center", color: "#64748b", verticalAlign: "middle", height: "45px" }}>
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
            Hiển thị <strong>{paginatedEmployees.length}</strong> / {filteredEmployees.length} nhân viên
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

      {/* Modern Side Drawer for Add/Edit */}
      {showModal && (
        <div className="drawer-overlay" onClick={handleClose}>
          <div className="drawer-content animate-drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="header-titles">
                <h3>{editingEmployee ? "✏️ Hiệu chỉnh hồ sơ" : "👤 Tiếp nhận nhân viên"}</h3>
                <p className="header-sub">Hồ sơ nhân sự • {editingEmployee ? editingEmployee.employeeCode : "Mới"}</p>
              </div>
              <button onClick={handleClose} className="drawer-close-btn">&times;</button>
            </div>

            <div className="drawer-body">
              {error && <div className="error-alert">⚠️ {error}</div>}

              <form id="employee-form" action={handleSubmit} className="drawer-form">
                {/* Section: Thông tin cơ bản */}
                <div className="form-section">
                  <h4 className="section-title">Thông tin cơ bản</h4>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Mã nhân viên</label>
                      <input
                        type="text"
                        name="employeeCode"
                        className="input-base readonly"
                        value={editingEmployee ? editingEmployee.employeeCode : (generatedCode || "")}
                        readOnly
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Họ và tên <span className="required">*</span></label>
                      <input type="text" name="fullName" className="input-base" placeholder="Họ và tên..." defaultValue={editingEmployee?.fullName} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Giới tính <span className="required">*</span></label>
                      <select name="gender" className="input-base" defaultValue={editingEmployee?.gender ?? "Nam"} required>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                    <div className="form-group-base">
                      <label>Ngày vào làm <span className="required">*</span></label>
                      <input type="date" name="startDate" className="input-base" defaultValue={editingEmployee?.startDate ? new Date(editingEmployee.startDate).toISOString().split('T')[0] : ""} required />
                    </div>
                  </div>
                </div>

                {/* Section: Công việc & Vị trí */}
                <div className="form-section">
                  <h4 className="section-title">Công việc & Vị trí</h4>
                  <div className="form-group-base full-width">
                    <label>Chi nhánh công tác <span className="required">*</span></label>
                    <select
                      name="branch"
                      className="input-base"
                      defaultValue={editingEmployee?.branch ?? ""}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn chi nhánh --</option>
                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Bộ phận <span className="required">*</span></label>
                      <select name="department" className="input-base" defaultValue={editingEmployee?.department ?? ""} required>
                        <option value="">-- Chọn bộ phận --</option>
                        {activeDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-group-base">
                      <label>Chức vụ <span className="required">*</span></label>
                      <select name="position" className="input-base" defaultValue={editingEmployee?.position ?? ""} required>
                        <option value="">-- Chọn chức vụ --</option>
                        {activePositions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Liên hệ */}
                <div className="form-section">
                  <h4 className="section-title">Thông tin liên hệ</h4>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Số điện thoại</label>
                      <input type="text" name="phone" className="input-base" placeholder="090..." defaultValue={editingEmployee?.phone} />
                    </div>
                    <div className="form-group-base">
                      <label>Email</label>
                      <input type="email" name="email" className="input-base" placeholder="email@..." defaultValue={editingEmployee?.email} />
                    </div>
                  </div>
                </div>

                {/* Section: Thẻ quản lý */}
                <div className="form-section">
                  <h4 className="section-title">Thẻ quản lý</h4>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Mã thẻ</label>
                      <input
                        type="text"
                        name="cardCode"
                        className="input-base"
                        placeholder="Mã thẻ..."
                        defaultValue={editingEmployee?.cardCode}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-base btn-outline" onClick={handleClose}>Hủy bỏ</button>
              <button type="submit" form="employee-form" className="btn-base btn-primary" disabled={isPending}>
                {isPending ? "Đang xử lý..." : (editingEmployee ? "Cập nhật hồ sơ" : "Lưu hồ sơ")}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal
          tableName="Employee"
          recordId={historyRecordId}
          onClose={() => setHistoryRecordId(null)}
        />
      )}

      {confirmDialog.show && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: confirmDialog.type === "danger" ? "#fef2f2" : "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              color: confirmDialog.type === "danger" ? "#ef4444" : "#22c55e"
            }}>
              {confirmDialog.type === "danger" ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmDialog.title}
            </h3>
            <div style={{ color: "#475569", marginBottom: "2rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
              <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>{confirmDialog.message}</p>
              {confirmDialog.type === "danger" && (
                <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                  <PowerOff size={16} /> Dữ liệu hồ sơ sẽ được chuyển sang trạng thái nghỉ việc.
                </p>
              )}
              {confirmDialog.type === "success" && (
                <p style={{ fontSize: "0.875rem", color: "#22c55e", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#f0fdf4", padding: "8px", borderRadius: "6px" }}>
                  <CheckCircle size={16} /> Nhân viên có thể tiếp tục thực hiện các công việc trên hệ thống.
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}>Bỏ qua</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: confirmDialog.type === "danger" ? "#ef4444" : "#2563eb" }}
                onClick={confirmDialog.onConfirm}
                disabled={isPending}
              >
                {isPending ? "Đang xử lý..." : confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
