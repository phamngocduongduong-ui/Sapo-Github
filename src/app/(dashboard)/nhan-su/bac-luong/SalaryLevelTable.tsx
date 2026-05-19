"use client";

import { Pencil, FileText, Upload, Download, Search, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";
import HistoryModal from "../../HistoryModal";

interface SalaryLevelTableProps {
  items: any[];
  onEdit: (item: any) => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export default function SalaryLevelTable({ 
  items, onEdit, onAdd, onExport, onImport, onDownloadTemplate,
  searchTerm, onSearchChange
}: SalaryLevelTableProps) {
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Khai báo bậc lương</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn" onClick={onDownloadTemplate} style={{ background: "#f1f5f9", color: "#475569", display: "flex", alignItems: "center", gap: "5px" }}>
            <FileText size={18} /> File mẫu
          </button>
          <label className="btn" style={{ background: "#f1f5f9", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
            <Upload size={18} /> Nhập Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={onImport} />
          </label>
          <button className="btn" onClick={onExport} style={{ background: "#27ae60", color: "#fff", display: "flex", alignItems: "center", gap: "5px" }}>
            <Download size={18} /> Xuất Excel
          </button>
          <button className="btn btn-primary" onClick={onAdd}>+ Thêm mới</button>
        </div>
      </div>

      {/* Search Bar integrated below the header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
          <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#888" }} size={18} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Tìm kiếm mã bậc..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ paddingLeft: "40px", borderRadius: "8px", height: "38px" }}
          />
        </div>
        <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>
          Hiển thị {items.length} bậc lương
        </div>
      </div>

      <div className="table-container" style={{ overflowX: "auto" }}>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: "50px", textAlign: "center" }}>STT</th>
            <th>Mã bậc</th>
            <th>Lương cơ bản</th>
            <th>Chuyên cần</th>
            <th>Hiệu quả</th>
            <th>Trách nhiệm</th>
            <th>Thu hút</th>
            <th>Hỗ trợ khác</th>
            <th style={{ width: "180px", textAlign: "center" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Chưa có bậc lương nào được khai báo</td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center" }}>{item.stt || idx + 1}</td>
                <td style={{ fontWeight: "600" }}>{item.levelCode}</td>
                <td>{formatCurrency(item.baseSalary)}</td>
                <td>{formatCurrency(item.attendanceBonus)}</td>
                <td>{formatCurrency(item.performanceBonus)}</td>
                <td>{formatCurrency(item.responsibilityBonus)}</td>
                <td>{formatCurrency(item.attractionBonus)}</td>
                <td>{formatCurrency(item.otherBonus)}</td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => onEdit(item)}
                      style={{ gap: "4px" }}
                    >
                      <Pencil size={14} /> Sửa
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => setHistoryRecordId(item.id)}
                      title="Lịch sử thay đổi"
                    >
                      Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {historyRecordId && (
      <HistoryModal 
        tableName="SalaryLevel" 
        recordId={historyRecordId} 
        onClose={() => setHistoryRecordId(null)} 
      />
    )}
    </>
  );
}
