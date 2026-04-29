"use client";

import { useState } from "react";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Download, 
  Upload, 
  Search,
  X
} from "lucide-react";
import * as XLSX from "xlsx";
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

export default function AttendanceTable({ initialData }: { initialData: Attendance[] }) {
  const [data, setData] = useState<Attendance[]>(initialData);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredData = data.filter(item => 
    item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    item.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
    `${item.month}/${item.year}`.includes(search)
  );

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
      try {
        await deleteAttendance(id);
        setData(data.filter(item => item.id !== id));
      } catch (error) {
        alert("Lỗi khi xóa: " + (error as any).message);
      }
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
        window.location.reload();
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
        <div style={{ position: "relative", width: "300px" }}>
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
        
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={handleDownloadTemplate} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Download size={16} /> Tải file mẫu
          </button>
          
          <label className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", margin: 0 }}>
            <Upload size={16} /> Import Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
          </label>
          
          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="btn btn-primary" 
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Plus size={18} /> Thêm mới
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
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
              <th style={{ width: "100px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ textAlign: "center" }}>{index + 1}</td>
                  <td style={{ textAlign: "center", fontWeight: 500, color: "var(--primary-color)" }}>{item.month}/{item.year}</td>
                  <td style={{ fontWeight: 600 }}>{item.employeeCode}</td>
                  <td>{item.employeeName}</td>
                  <td>{item.gender}</td>
                  <td>{item.department}</td>
                  <td style={{ textAlign: "center" }}>{item.annualLeaveDays}</td>
                  <td style={{ textAlign: "center" }}>{item.paidLeaveDays}</td>
                  <td style={{ textAlign: "center" }}>{item.unpaidLeaveDays}</td>
                  <td style={{ textAlign: "center" }}>{item.weekdayOvertimeHours}</td>
                  <td style={{ textAlign: "center" }}>{item.sundayOvertimeHours}</td>
                  <td style={{ textAlign: "center" }}>{item.holidayOvertimeHours}</td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
                      <button 
                        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                        className="btn btn-sm btn-outline" 
                        style={{ gap: "4px" }}
                      >
                        <Pencil size={14} /> Sửa
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="btn btn-sm btn-danger" 
                        style={{ gap: "4px" }}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
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
                window.location.reload();
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
                    <label>Mã nhân viên *</label>
                    <input name="employeeCode" defaultValue={editingItem?.employeeCode} required className="form-control" placeholder="Nhập mã để tự lấy thông tin" />
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
    </div>
  );
}
