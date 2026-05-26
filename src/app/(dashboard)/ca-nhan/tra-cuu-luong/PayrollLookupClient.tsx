"use client";

import { useState } from "react";
import { Search, Printer, Download } from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/format";

type PayrollDetail = {
  id: string;
  employeeCode: string;
  employeeName: string;
  incomePerWorkday: number;
  attendanceBonus: number;
  performanceBonus: number;
  responsibilityBonus: number;
  overtimePay: number;
  socialInsuranceDeduction: number;
  payroll: {
    month: number;
    year: number;
  };
};

type EmployeeInfo = {
  employeeCode: string;
  fullName: string;
  position: string;
  department: string;
  workplace: string | null;
};

export default function PayrollLookupClient({ 
  initialInfo, 
  allHistory 
}: { 
  initialInfo: EmployeeInfo, 
  allHistory: PayrollDetail[] 
}) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const currentPayroll = allHistory.find(h => h.payroll.month === month && h.payroll.year === year);

  const totalGross = currentPayroll 
    ? (currentPayroll.incomePerWorkday + currentPayroll.attendanceBonus + currentPayroll.performanceBonus + currentPayroll.responsibilityBonus + currentPayroll.overtimePay) 
    : 0;
  
  const netIncome = currentPayroll ? (totalGross - currentPayroll.socialInsuranceDeduction) : 0;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: "2rem", padding: "2rem", background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", color: "#fff", borderRadius: "1rem", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.8rem" }}>{initialInfo.fullName}</h2>
            <div style={{ display: "flex", gap: "1.5rem", opacity: 0.9, fontSize: "0.95rem" }}>
              <span>Mã NV: <strong>{initialInfo.employeeCode}</strong></span>
              <span>•</span>
              <span>Chức vụ: <strong>{initialInfo.position}</strong></span>
              <span>•</span>
              <span>Bộ phận: <strong>{initialInfo.department}</strong></span>
            </div>
            <div style={{ marginTop: "0.5rem", opacity: 0.8, fontSize: "0.9rem" }}>
              📍 Chi nhánh: {initialInfo.workplace || "Chưa cập nhật"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "0.5rem" }}>Kỳ tính lương</div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <select 
                value={month} 
                onChange={(e) => setMonth(parseInt(e.target.value))}
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "0.4rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer" }}
              >
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1} style={{ color: "#000" }}>Tháng {i+1}</option>)}
              </select>
              <select 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "0.4rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer" }}
              >
                {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y} style={{ color: "#000" }}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {currentPayroll ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "2rem" }}>
          <div className="card" style={{ padding: "2rem" }}>
            <h4 style={{ margin: "0 0 1.5rem 0", color: "#64748b", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>Chi tiết thu nhập & Khấu trừ</h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Thu nhập */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#334155" }}>Thu nhập ngày công</span>
                <span style={{ fontWeight: 600 }}>{formatNumber(currentPayroll.incomePerWorkday)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#334155" }}>Tiền chuyên cần</span>
                <span style={{ fontWeight: 600 }}>{formatNumber(currentPayroll.attendanceBonus)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#334155" }}>Tiền hiệu quả</span>
                <span style={{ fontWeight: 600 }}>{formatNumber(currentPayroll.performanceBonus)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#334155" }}>Tiền trách nhiệm</span>
                <span style={{ fontWeight: 600 }}>{formatNumber(currentPayroll.responsibilityBonus)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#334155" }}>Tiền làm thêm giờ</span>
                <span style={{ fontWeight: 600 }}>{formatNumber(currentPayroll.overtimePay)}</span>
              </div>

              <hr style={{ margin: "0.5rem 0", border: "none", borderTop: "1px solid #f1f5f9" }} />

              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger-color)" }}>
                <span style={{ fontWeight: 600 }}>Khấu trừ BHXH (10.5%)</span>
                <span style={{ fontWeight: 600 }}>- {formatNumber(currentPayroll.socialInsuranceDeduction)}</span>
              </div>
            </div>

            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "2px dashed #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e293b" }}>THỰC LĨNH</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--primary-color)" }}>
                {formatCurrency(netIncome)}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
              <h5 style={{ margin: "0 0 1rem 0", color: "#64748b" }}>Trạng thái thanh toán</h5>
              <div style={{ padding: "0.5rem 1rem", background: "#f0fdf4", color: "#166534", borderRadius: "2rem", fontWeight: 600, display: "inline-block" }}>
                Đã phê duyệt
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button className="btn btn-outline" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }} onClick={() => window.print()}>
                <Printer size={18} /> In phiếu lương
              </button>
              <button className="btn btn-outline" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <Download size={18} /> Tải file PDF
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "5rem", textAlign: "center", color: "#94a3b8" }}>
          <Search size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
          <h3>Không tìm thấy dữ liệu</h3>
          <p>Hiện chưa có bảng lương cho tháng {month} năm {year}.</p>
        </div>
      )}
    </div>
  );
}
