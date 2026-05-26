"use client";

import { useState } from "react";
import { Search, Ship, Truck, Activity, LayoutDashboard, BarChart3 } from "lucide-react";

export default function OverviewPage() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="authenticated-dashboard-container">

      {/* Dashboard Bar */}
      <div className="dashboard-header">
        <h2 className="dashboard-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LayoutDashboard size={18} color="#2b6cb0" />
          Bảng điều khiển hệ thống
        </h2>
        
        <button 
          type="button"
          className="mobile-search-toggle" 
          onClick={() => setSearchOpen(!searchOpen)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            color: "#2b6cb0",
            display: "none",
            alignItems: "center",
            justifyContent: "center"
          }}
          title="Tìm kiếm"
        >
          <Search size={18} />
        </button>

        <div className={`search-wrapper ${searchOpen ? "mobile-show" : "mobile-hide"}`}>
          <input type="text" className="search-input" placeholder="Nhập nội dung cần tìm..." />
          <button className="search-btn" title="Tìm kiếm">
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* Dashboard Widgets Content */}
      <div className="dashboard-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          {/* Stat 1 */}
          <div className="stat-widget">
            <div className="stat-icon-wrapper" style={{ background: "#e0f2fe", color: "#0284c7" }}>
              <Ship size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">Tàu đang cập cảng</span>
              <span className="stat-val">12 tàu</span>
              <span className="stat-desc">▲ +2 tàu so với hôm qua</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="stat-widget">
            <div className="stat-icon-wrapper" style={{ background: "#ecfdf5", color: "#059669" }}>
              <BarChart3 size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">Container thông qua</span>
              <span className="stat-val">85,240 TEU</span>
              <span className="stat-desc" style={{ color: "#059669" }}>▲ +8% tuần này</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="stat-widget">
            <div className="stat-icon-wrapper" style={{ background: "#fef3c7", color: "#d97706" }}>
              <Truck size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">Lượt xe cổng cảng</span>
              <span className="stat-val">3,150 lượt</span>
              <span className="stat-desc" style={{ color: "#d97706" }}>▼ -3% giờ cao điểm</span>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="stat-widget">
            <div className="stat-icon-wrapper" style={{ background: "#f3e8ff", color: "#7c3aed" }}>
              <Activity size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">Hiệu suất vận hành</span>
              <span className="stat-val">98.4%</span>
              <span className="stat-desc" style={{ color: "#7c3aed" }}>▲ Tối ưu công suất</span>
            </div>
          </div>
        </div>

        {/* Dashboard Row */}
        <div className="dashboard-row">
          {/* Chart widget */}
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title">Sản lượng hàng hóa qua cảng (6 tháng gần đây)</span>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700" }}>Đơn vị: Nghìn TEU</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
              <svg viewBox="0 0 500 200" style={{ width: "100%", height: "100%" }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="140" x2="480" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="180" x2="480" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Chart labels */}
                <text x="15" y="24" fill="#64748b" fontSize="9" fontWeight="700">100</text>
                <text x="15" y="64" fill="#64748b" fontSize="9" fontWeight="700">75</text>
                <text x="15" y="104" fill="#64748b" fontSize="9" fontWeight="700">50</text>
                <text x="15" y="144" fill="#64748b" fontSize="9" fontWeight="700">25</text>
                <text x="20" y="184" fill="#64748b" fontSize="9" fontWeight="700">0</text>

                <text x="65" y="195" fill="#000000" fontSize="9" fontWeight="700" textAnchor="middle">T12</text>
                <text x="145" y="195" fill="#000000" fontSize="9" fontWeight="700" textAnchor="middle">T01</text>
                <text x="225" y="195" fill="#000000" fontSize="9" fontWeight="700" textAnchor="middle">T02</text>
                <text x="305" y="195" fill="#000000" fontSize="9" fontWeight="700" textAnchor="middle">T03</text>
                <text x="385" y="195" fill="#000000" fontSize="9" fontWeight="700" textAnchor="middle">T04</text>
                <text x="465" y="195" fill="#000000" fontSize="9" fontWeight="700" textAnchor="middle">T05</text>

                {/* Path and Gradient */}
                <path d="M 65 140 L 145 110 L 225 130 L 305 70 L 385 50 L 465 30 L 465 180 L 65 180 Z" fill="url(#chartGrad)" />
                <path d="M 65 140 L 145 110 L 225 130 L 305 70 L 385 50 L 465 30" fill="none" stroke="#2b6cb0" strokeWidth="3" />

                {/* Data Points */}
                <circle cx="65" cy="140" r="4" fill="#ffffff" stroke="#2b6cb0" strokeWidth="2" />
                <circle cx="145" cy="110" r="4" fill="#ffffff" stroke="#2b6cb0" strokeWidth="2" />
                <circle cx="225" cy="130" r="4" fill="#ffffff" stroke="#2b6cb0" strokeWidth="2" />
                <circle cx="305" cy="70" r="4" fill="#ffffff" stroke="#2b6cb0" strokeWidth="2" />
                <circle cx="385" cy="50" r="4" fill="#ffffff" stroke="#2b6cb0" strokeWidth="2" />
                <circle cx="465" cy="30" r="4" fill="#ffffff" stroke="#2b6cb0" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Vessel Schedules widget */}
          <div className="vessels-card">
            <span className="chart-title">Lịch tàu cập cảng (Hôm nay)</span>
            <div className="table-wrapper">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Tên Tàu</th>
                    <th>Cảng cập</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>ASIAN BRIDGE V.24</td>
                    <td>Tân Cảng Cát Lái</td>
                    <td>08:30</td>
                    <td><span className="status-badge status-active">Đang làm hàng</span></td>
                  </tr>
                  <tr>
                    <td>GREEN HORIZON V.12</td>
                    <td>Cái Mép Terminal</td>
                    <td>11:45</td>
                    <td><span className="status-badge status-active">Đang làm hàng</span></td>
                  </tr>
                  <tr>
                    <td>PACIFIC VOYAGER 06</td>
                    <td>Tân Cảng Hiệp Phước</td>
                    <td>15:20</td>
                    <td><span className="status-badge status-pending">Đang neo chờ</span></td>
                  </tr>
                  <tr>
                    <td>OOCL BANGKOK 09</td>
                    <td>Tân Cảng Cát Lái</td>
                    <td>18:00</td>
                    <td><span className="status-badge status-pending">Đang neo chờ</span></td>
                  </tr>
                  <tr>
                    <td>WAN HAI 203 V.10</td>
                    <td>Tân Cảng Cát Lái</td>
                    <td>05:30</td>
                    <td><span className="status-badge status-closed">Đã rời cảng</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
