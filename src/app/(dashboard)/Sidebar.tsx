"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logout } from "@/app/login/actions";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Initialize open menu based on current path
  useEffect(() => {
    if (isCollapsed) return;
    if (pathname.startsWith("/sales")) setOpenMenu("sales");
    else if (pathname.startsWith("/production")) setOpenMenu("production");
    else if (pathname.startsWith("/purchasing")) setOpenMenu("purchasing");
    else if (pathname.startsWith("/nhan-su")) setOpenMenu("hr");
    else if (pathname.startsWith("/danh-muc")) setOpenMenu("catalog");
  }, [pathname, isCollapsed]);

  const toggleMenu = (menu: string) => {
    if (isCollapsed) {
      onToggle();
      setOpenMenu(menu);
    } else {
      setOpenMenu(openMenu === menu ? null : menu);
    }
  };

  const isPurchasingActive = pathname.startsWith("/purchasing");
  const isHrActive = pathname.startsWith("/nhan-su");
  const isCatalogActive = pathname.startsWith("/danh-muc");

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`} style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh",
      width: isCollapsed ? "70px" : "280px",
      transition: "width 0.3s ease",
      overflow: "hidden"
    }}>
      <div className="sidebar-header" style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: isCollapsed ? "center" : "space-between",
        padding: isCollapsed ? "0" : "0 1.5rem"
      }}>
        {!isCollapsed && <span>EMS System</span>}
        <button 
          onClick={onToggle}
          style={{ 
            background: "none", 
            border: "none", 
            color: "#fff", 
            cursor: "pointer", 
            padding: "5px",
            display: "flex",
            alignItems: "center"
          }}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav
        className="sidebar-nav"
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          flex: 1, 
          overflowY: "auto",
          scrollbarWidth: "thin"
        }}
      >
        <Link
          href="/"
          className={`nav-item${pathname === "/" ? " active" : ""}`}
          title="Tổng quan"
        >
          <span style={{ minWidth: "24px" }}>📊</span>
          {!isCollapsed && <span style={{ marginLeft: "0.75rem" }}>Tổng quan</span>}
        </Link>
        <Link
          href="/admin"
          className={`nav-item${pathname.startsWith("/admin") ? " active" : ""}`}
          title="Quản lý Tài khoản"
        >
          <span style={{ minWidth: "24px" }}>👤</span>
          {!isCollapsed && <span style={{ marginLeft: "0.75rem" }}>Tài khoản (Admin)</span>}
        </Link>
        
        {/* Kinh doanh */}
        <div>
          <button
            className={`nav-item nav-item--expandable${pathname.startsWith("/sales") ? " active" : ""}`}
            onClick={() => toggleMenu("sales")}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between" }}
            title="Kinh doanh"
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ minWidth: "24px" }}>💰</span>
              {!isCollapsed && <span style={{ marginLeft: "0.75rem" }}>Kinh doanh</span>}
            </div>
            {!isCollapsed && <span style={{ transition: "transform 0.25s", transform: openMenu === "sales" ? "rotate(90deg)" : "rotate(0deg)", fontSize: "0.7rem" }}>▶</span>}
          </button>
          {!isCollapsed && (
            <div style={{ overflow: "hidden", maxHeight: openMenu === "sales" ? "500px" : "0", transition: "max-height 0.3s ease" }}>
              <Link href="/sales/don-hang" className={`nav-item nav-item--sub${pathname.startsWith("/sales/don-hang") ? " active" : ""}`} style={{ paddingLeft: "3rem", fontSize: "0.9rem" }}>📦 Đơn hàng</Link>
            </div>
          )}
        </div>

        {/* Sản xuất */}
        <div>
          <button
            className={`nav-item nav-item--expandable${pathname.startsWith("/production") ? " active" : ""}`}
            onClick={() => toggleMenu("production")}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between" }}
            title="Sản xuất"
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ minWidth: "24px" }}>🏭</span>
              {!isCollapsed && <span style={{ marginLeft: "0.75rem" }}>Sản xuất</span>}
            </div>
            {!isCollapsed && <span style={{ transition: "transform 0.25s", transform: openMenu === "production" ? "rotate(90deg)" : "rotate(0deg)", fontSize: "0.7rem" }}>▶</span>}
          </button>
          {!isCollapsed && (
            <div style={{ overflow: "hidden", maxHeight: openMenu === "production" ? "500px" : "0", transition: "max-height 0.3s ease" }}>
              <Link href="/production/ke-hoach-vat-tu" className={`nav-item nav-item--sub${pathname === "/production/ke-hoach-vat-tu" ? " active" : ""}`} style={{ paddingLeft: "3rem", fontSize: "0.9rem" }}>📋 Kế hoạch vật tư</Link>
            </div>
          )}
        </div>

        {/* Danh mục */}
        <div>
          <button
            className={`nav-item nav-item--expandable${isCatalogActive ? " active" : ""}`}
            onClick={() => toggleMenu("catalog")}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between" }}
            title="Danh mục"
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ minWidth: "24px" }}>📁</span>
              {!isCollapsed && <span style={{ marginLeft: "0.75rem" }}>Danh mục</span>}
            </div>
            {!isCollapsed && <span style={{ transition: "transform 0.25s", transform: openMenu === "catalog" ? "rotate(90deg)" : "rotate(0deg)", fontSize: "0.7rem" }}>▶</span>}
          </button>
          {!isCollapsed && (
            <div style={{ overflow: "hidden", maxHeight: openMenu === "catalog" ? "800px" : "0", transition: "max-height 0.3s ease" }}>
              {[
                { href: "/danh-muc/khach-hang", label: "👥 Khách hàng" },
                { href: "/danh-muc/nha-cung-cap", label: "🏭 Nhà cung cấp" },
                { href: "/danh-muc/nhom-san-pham", label: "📦 Nhóm sản phẩm" },
                { href: "/danh-muc/san-pham", label: "🍎 Sản phẩm" },
                { href: "/danh-muc/chi-nhanh", label: "📍 Chi nhánh" },
                { href: "/danh-muc/quoc-gia", label: "🌍 Quốc gia" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className={`nav-item nav-item--sub${pathname === item.href ? " active" : ""}`} style={{ paddingLeft: "3rem", fontSize: "0.9rem" }}>{item.label}</Link>
              ))}
            </div>
          )}
        </div>

        {/* Thu mua */}
        <div>
          <button
            className={`nav-item nav-item--expandable${isPurchasingActive ? " active" : ""}`}
            onClick={() => toggleMenu("purchasing")}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between" }}
            title="Thu mua"
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ minWidth: "24px" }}>🛒</span>
              {!isCollapsed && <span style={{ marginLeft: "0.75rem" }}>Thu mua</span>}
            </div>
            {!isCollapsed && <span style={{ transition: "transform 0.25s", transform: openMenu === "purchasing" ? "rotate(90deg)" : "rotate(0deg)", fontSize: "0.7rem" }}>▶</span>}
          </button>
          {!isCollapsed && (
            <div style={{ overflow: "hidden", maxHeight: openMenu === "purchasing" ? "500px" : "0", transition: "max-height 0.3s ease" }}>
              <Link href="/purchasing" className={`nav-item nav-item--sub${pathname === "/purchasing" ? " active" : ""}`} style={{ paddingLeft: "3rem", fontSize: "0.9rem" }}>📋 Kế hoạch Thu mua</Link>
              <Link href="/purchasing/dispatch" className={`nav-item nav-item--sub${pathname.startsWith("/purchasing/dispatch") ? " active" : ""}`} style={{ paddingLeft: "3rem", fontSize: "0.9rem" }}>🚚 Lệnh điều động</Link>
            </div>
          )}
        </div>

        {/* Nhân sự */}
        <div>
          <button
            className={`nav-item nav-item--expandable${isHrActive ? " active" : ""}`}
            onClick={() => toggleMenu("hr")}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between" }}
            title="Nhân sự"
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ minWidth: "24px" }}>👥</span>
              {!isCollapsed && <span style={{ marginLeft: "0.75rem" }}>Nhân sự (HR)</span>}
            </div>
            {!isCollapsed && <span style={{ transition: "transform 0.25s", transform: openMenu === "hr" ? "rotate(90deg)" : "rotate(0deg)", fontSize: "0.7rem" }}>▶</span>}
          </button>
          {!isCollapsed && (
            <div style={{ overflow: "hidden", maxHeight: openMenu === "hr" ? "1200px" : "0", transition: "max-height 0.3s ease" }}>
              {[
                { href: "/nhan-su/nhan-vien", label: "🧑‍💼 Nhân viên" },
                { href: "/nhan-su/hop-dong", label: "📄 Hợp đồng lao động" },
                { href: "/nhan-su/bo-phan", label: "🏢 Bộ phận" },
                { href: "/nhan-su/chuc-vu", label: "🎖️ Chức vụ" },
                { href: "/nhan-su/bac-luong", label: "💳 Bậc lương" },
                { href: "/nhan-su/tang-giam-luong", label: "📈 Tăng/Giảm lương" },
                { href: "/nhan-su/thuyen-chuyen-bo-nhiem", label: "🔄 Thuyên chuyển, Bổ nhiệm" },
                { href: "/nhan-su/cham-cong", label: "🕐 Chấm công" },
                { href: "/nhan-su/bang-luong", label: "💰 Bảng lương" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className={`nav-item nav-item--sub${pathname.startsWith(item.href) ? " active" : ""}`} style={{ paddingLeft: "3rem", fontSize: "0.9rem" }}>{item.label}</Link>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: "auto", padding: "1rem 0" }}>
          {!isCollapsed && <div style={{ padding: "0.75rem 1.5rem", fontSize: "0.85rem", textTransform: "uppercase", color: "#888", fontWeight: 600 }}>Cài đặt</div>}
          <form action={logout}>
            <button type="submit" className="nav-item" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "#e74c3c", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start" }} title="Đăng xuất">
              <span style={{ minWidth: "24px" }}>🚪</span>
              {!isCollapsed && <span style={{ marginLeft: "0.75rem" }}>Đăng xuất</span>}
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}
