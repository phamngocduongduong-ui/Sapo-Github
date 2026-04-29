"use client";

import { useState, useEffect } from "react";
import { 
  getSalaryLevels, 
  createSalaryLevel, 
  updateSalaryLevel, 
  deleteSalaryLevel, 
  importSalaryLevels 
} from "./actions";
import SalaryLevelTable from "./SalaryLevelTable";
import SalaryLevelForm from "./SalaryLevelForm";
import * as XLSX from "xlsx";
import { Download, Upload, FileText, Search } from "lucide-react";

export default function SalaryLevelPage() {
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const data = await getSalaryLevels();
    setItems(data);
    setIsLoading(false);
  }

  const filteredItems = items.filter(item => 
    item.levelCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleSubmit(formData: any) {
    if (editingItem) {
      await updateSalaryLevel(editingItem.id, formData);
    } else {
      await createSalaryLevel(formData);
    }
    setIsFormOpen(false);
    setEditingItem(null);
    fetchData();
  }

  const openEdit = (item: any) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(items.map(item => ({
      "STT": item.stt,
      "Mã bậc": item.levelCode,
      "Lương cơ bản": item.baseSalary,
      "Chuyên cần": item.attendanceBonus,
      "Hiệu quả": item.performanceBonus,
      "Trách nhiệm": item.responsibilityBonus
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BacLuong");
    XLSX.writeFile(wb, "DanhSachBacLuong.xlsx");
  };

  const handleDownloadTemplate = () => {
    const template = [
      { "STT": 1, "Mã bậc": "L01.01", "Lương cơ bản": 5000000, "Chuyên cần": 300000, "Hiệu quả": 500000, "Trách nhiệm": 200000 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "MauImportBacLuong.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const formattedData = data.map((row: any) => ({
        stt: parseInt(row["STT"] || "0"),
        levelCode: String(row["Mã bậc"] || ""),
        baseSalary: parseFloat(row["Lương cơ bản"] || "0"),
        attendanceBonus: parseFloat(row["Chuyên cần"] || "0"),
        performanceBonus: parseFloat(row["Hiệu quả"] || "0"),
        responsibilityBonus: parseFloat(row["Trách nhiệm"] || "0")
      })).filter(item => item.levelCode); // Chỉ lấy bản ghi có mã bậc

      if (formattedData.length === 0) {
        alert("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
        return;
      }

      if (confirm("Import sẽ thay thế toàn bộ dữ liệu hiện tại. Bạn có chắc chắn không?")) {
        await importSalaryLevels(formattedData);
        fetchData();
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        💳 Khai báo bậc lương
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Thiết lập và quản lý các bậc lương cơ bản và phụ cấp cố định trong doanh nghiệp
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div className="spinner" style={{ marginBottom: "1rem" }}></div>
            <p style={{ color: "#64748b" }}>Đang tải danh mục bậc lương...</p>
          </div>
        ) : (
          <SalaryLevelTable 
            items={filteredItems} 
            onEdit={openEdit}
            onAdd={() => { setEditingItem(null); setIsFormOpen(true); }}
            onExport={handleExport}
            onImport={handleImport}
            onDownloadTemplate={handleDownloadTemplate}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}
      </div>

      {isFormOpen && (
        <SalaryLevelForm 
          onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
          onSubmit={handleSubmit}
          initialData={editingItem}
        />
      )}
    </main>
  );
}
