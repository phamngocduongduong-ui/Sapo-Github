"use client";

import React from "react";
import { BarChart3, TrendingUp, PieChart, Download, Calendar } from "lucide-react";

export default function PurchasingReportPage() {
  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>📊 Báo cáo Mua hàng</h1>
          <p style={{ color: "#64748b", marginTop: "0.5rem" }}>Phân tích và thống kê hoạt động thu mua</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calendar size={18} /> Tháng này
          </button>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Download size={18} /> Xuất báo cáo
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem" }}>
        {/* Biểu đồ chính */}
        <div className="card" style={{ gridColumn: "span 8", minHeight: "400px", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <TrendingUp size={20} color="#3498db" /> Biến động chi phí mua hàng
            </h3>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexDirection: "column", gap: "1rem" }}>
            <BarChart3 size={64} opacity={0.2} />
            <p style={{ fontStyle: "italic" }}>Biểu đồ thống kê sẽ hiển thị tại đây khi có đủ dữ liệu</p>
          </div>
        </div>

        {/* Tỷ lệ nhà cung cấp */}
        <div className="card" style={{ gridColumn: "span 4", minHeight: "400px", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <PieChart size={20} color="#e67e22" /> Tỷ lệ theo nhà cung cấp
            </h3>
          </div>
          <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[
              { name: "Công ty Vải Việt", value: "45%", color: "#3498db" },
              { name: "Xưởng May Hồng Hà", value: "25%", color: "#2ecc71" },
              { name: "Phụ liệu May Mặc ABC", value: "20%", color: "#f1c40f" },
              { name: "Khác", value: "10%", color: "#94a3b8" },
            ].map((item) => (
              <div key={item.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
                <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: item.value, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thống kê nhanh */}
        {[
          { label: "Tổng chi tiêu", value: "345.000.000 đ", trend: "+12.5%", color: "#3498db" },
          { label: "Đơn giá trung bình", value: "12.400 đ", trend: "-2.1%", color: "#2ecc71" },
          { label: "Số lượng mặt hàng", value: "156", trend: "+5.4%", color: "#f1c40f" },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ gridColumn: "span 4", padding: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, marginBottom: "0.5rem" }}>{stat.label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: stat.trend.startsWith("+") ? "#2ecc71" : "#ef4444" }}>
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
