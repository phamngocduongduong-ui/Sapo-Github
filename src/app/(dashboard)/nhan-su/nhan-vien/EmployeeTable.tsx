"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { createEmployee, updateEmployee, updateEmployeeStatus, bulkUpsertEmployees, generateNextEmployeeCode } from "./actions";
import { Pencil, Trash2, CheckCircle, PowerOff, FileSpreadsheet, Upload, Download, Plus, RotateCcw, Filter, Search, Clock } from "lucide-react";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtering logic
  const filteredEmployees = employees.filter(emp => 
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.branch || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.position || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Real-time Auto Sync
  useRealTimeSync("employees", employees, setEmployees);

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

  function handleStatusChange(id: string, status: string) {
    if (!confirm(`Xác nhận thay đổi trạng thái nhân viên?`)) return;
    startTransition(async () => {
      await updateEmployeeStatus(id, status);
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

  const reverseMapping: any = Object.fromEntries(Object.entries(fieldMapping).map(([k, v]) => [v, k]));

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

      const existingNames = employees.map(emp => `${emp.fullName}|${emp.branch}`);
      const conflictNames = processedData
        .filter(d => existingNames.includes(`${d.fullName}|${d.branch}`))
        .map(d => d.fullName);

      if (conflictNames.length > 0) {
        if (!confirm(`Các nhân viên sau đã tồn tại tại chi nhánh tương ứng: ${conflictNames.join(", ")}. Bạn có muốn cập nhật thông tin cho họ không?`)) {
          return;
        }
      }

      startTransition(async () => {
        try {
          await bulkUpsertEmployees(processedData);
          alert("Import dữ liệu thành công!");
        } catch (err: any) {
          alert("Lỗi import: " + err.message);
        }
      });
    };
    reader.readAsBinaryString(file);
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

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>👥 Danh sách nhân viên</h3>
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
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: "6px" }} /> Thêm mới
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ marginBottom: "1.5rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
            <Search size={18} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, mã NV, chi nhánh..." 
              className="form-control" 
              style={{ paddingLeft: "2.5rem" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Mã NV</th>
              <th>Họ và tên</th>
              <th>Giới tính</th>
              <th>Chi nhánh</th>
              <th>Bộ phận</th>
              <th>Chức vụ</th>
              <th>Ngày vào làm</th>
              <th>Thâm niên</th>
              <th>Trạng thái</th>
              <th style={{ width: "250px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((emp, idx) => (
              <tr key={emp.id}>
                <td style={{ fontWeight: 600 }}>{emp.employeeCode}</td>
                <td style={{ fontWeight: 500 }}>{emp.fullName}</td>
                <td>{emp.gender}</td>
                <td>{emp.branch || "—"}</td>
                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td>{emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}</td>
                <td style={{ fontWeight: 600, color: "var(--primary-color)" }}>{calculateSeniority(emp.startDate)}</td>
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
                    <button className="btn btn-sm btn-outline" onClick={() => setHistoryRecordId(emp.id)}>
                      Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    name="employeeCode" 
                    className="input" 
                    value={editingEmployee ? editingEmployee.employeeCode : (generatedCode || "")} 
                    readOnly 
                    placeholder="Sẽ tự động tạo sau khi chọn chi nhánh..."
                    style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                    required 
                  />
                </div>
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
                  <select 
                    name="branch" 
                    className="input" 
                    defaultValue={editingEmployee?.branch ?? ""}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                  >
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
      {historyRecordId && (
        <HistoryModal 
          tableName="Employee" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      <style>{`
        .form-label-left { width: 180px; font-size: 0.85rem; font-weight: 600; color: #475569; }
        .btn-icon { background: none; border: none; cursor: pointer; color: #3498db; padding: 4px; border-radius: 4px; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
      `}</style>
    </>
  );
}
