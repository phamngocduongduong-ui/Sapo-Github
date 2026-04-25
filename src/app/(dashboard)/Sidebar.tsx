"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/login/actions";

export default function Sidebar() {
  const pathname = usePathname();
  const [productionOpen, setProductionOpen] = useState(pathname.startsWith("/production"));
  const [salesOpen, setSalesOpen] = useState(pathname.startsWith("/sales"));
  const [purchasingOpen, setPurchasingOpen] = useState(
    pathname.startsWith("/purchasing")
  );
  const [hrOpen, setHrOpen] = useState(pathname.startsWith("/nhan-su"));
  const [catalogOpen, setCatalogOpen] = useState(pathname.startsWith("/danh-muc"));

  const isPurchasingActive = pathname.startsWith("/purchasing");
  const isHrActive = pathname.startsWith("/nhan-su");
  const isCatalogActive = pathname.startsWith("/danh-muc");

  return (
    <aside className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
      <div className="sidebar-header">EMS System</div>
      <nav
        className="sidebar-nav"
        style={{ display: "flex", flexDirection: "column", flex: 1 }}
      >
        <Link
          href="/"
          className={`nav-item${pathname === "/" ? " active" : ""}`}
        >
          📊 Tổng quan
        </Link>
        <Link
          href="/admin"
          className={`nav-item${pathname.startsWith("/admin") ? " active" : ""}`}
        >
          Quản lý Tài khoản (Admin)
        </Link>
        {/* Kinh doanh với sub-menu */}
        <div>
          <button
            className={`nav-item nav-item--expandable${pathname.startsWith("/sales") ? " active" : ""}`}
            onClick={() => setSalesOpen((prev) => !prev)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>💰 Kinh doanh (Sales)</span>
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.25s ease",
                transform: salesOpen ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: "0.75rem",
                opacity: 0.7,
              }}
            >
              ▶
            </span>
          </button>
          <div
            style={{
              overflow: "hidden",
              maxHeight: salesOpen ? "100px" : "0",
              transition: "max-height 0.3s ease",
            }}
          >
            <Link
              href="/sales/don-hang"
              className={`nav-item nav-item--sub${pathname.startsWith("/sales/don-hang") ? " active" : ""}`}
              style={{ paddingLeft: "2rem", fontSize: "0.9rem" }}
            >
              📦 Đơn hàng
            </Link>
          </div>
        </div>

        {/* Sản xuất với sub-menu */}
        <div>
          <button
            className={`nav-item nav-item--expandable${pathname.startsWith("/production") ? " active" : ""}`}
            onClick={() => setProductionOpen((prev) => !prev)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>🏭 Sản xuất (Production)</span>
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.25s ease",
                transform: productionOpen ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: "0.75rem",
                opacity: 0.7,
              }}
            >
              ▶
            </span>
          </button>
          <div
            style={{
              overflow: "hidden",
              maxHeight: productionOpen ? "150px" : "0",
              transition: "max-height 0.3s ease",
            }}
          >
            <Link
              href="/production/ke-hoach-vat-tu"
              className={`nav-item nav-item--sub${pathname === "/production/ke-hoach-vat-tu" ? " active" : ""}`}
              style={{ paddingLeft: "2rem", fontSize: "0.9rem" }}
            >
              📋 Kế hoạch vật tư
            </Link>
          </div>
        </div>


        {/* Danh mục với sub-menu */}
        <div>
          <button
            className={`nav-item nav-item--expandable${isCatalogActive ? " active" : ""}`}
            onClick={() => setCatalogOpen((prev) => !prev)}
            aria-expanded={catalogOpen}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>📁 Danh mục (Catalog)</span>
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.25s ease",
                transform: catalogOpen ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: "0.75rem",
                opacity: 0.7,
              }}
            >
              ▶
            </span>
          </button>

          {/* Sub-menu Danh mục */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: catalogOpen ? "400px" : "0",
              transition: "max-height 0.3s ease",
            }}
          >
            {[
              { href: "/danh-muc/khach-hang", label: "👥 Khách hàng" },
              { href: "/danh-muc/nha- cung-cap", label: "🏭 Nhà cung cấp" },
              { href: "/danh-muc/nhom-san-pham", label: "📦 Nhóm sản phẩm" },
              { href: "/danh-muc/san-pham", label: "🍎 Sản phẩm" },
              { href: "/danh-muc/phong-ban", label: "🏢 Phòng ban" },
              { href: "/danh-muc/chuc-vu", label: "🎖️ Chức vụ" },
              { href: "/danh-muc/chi-nhanh", label: "📍 Chi nhánh" },
              { href: "/danh-muc/quoc-gia", label: "🌍 Quốc gia" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item nav-item--sub${pathname === item.href ? " active" : ""}`}
                style={{ paddingLeft: "2rem", fontSize: "0.9rem" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Thu mua với sub-menu */}
        <div>
          <button
            className={`nav-item nav-item--expandable${isPurchasingActive ? " active" : ""}`}
            onClick={() => setPurchasingOpen((prev) => !prev)}
            aria-expanded={purchasingOpen}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Thu mua (Purchasing)</span>
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.25s ease",
                transform: purchasingOpen ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: "0.75rem",
                opacity: 0.7,
              }}
            >
              ▶
            </span>
          </button>

          {/* Sub-menu Thu mua */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: purchasingOpen ? "200px" : "0",
              transition: "max-height 0.3s ease",
            }}
          >
            <Link
              href="/purchasing"
              className={`nav-item nav-item--sub${pathname === "/purchasing" ? " active" : ""}`}
              style={{ paddingLeft: "2rem", fontSize: "0.9rem" }}
            >
              📋 Kế hoạch Thu mua
            </Link>
            <Link
              href="/purchasing/dispatch"
              className={`nav-item nav-item--sub${pathname.startsWith("/purchasing/dispatch") ? " active" : ""}`}
              style={{ paddingLeft: "2rem", fontSize: "0.9rem" }}
            >
              🚚 Lệnh điều động
            </Link>
          </div>
        </div>

        {/* Nhân sự với sub-menu */}
        <div>
          <button
            className={`nav-item nav-item--expandable${isHrActive ? " active" : ""}`}
            onClick={() => setHrOpen((prev) => !prev)}
            aria-expanded={hrOpen}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>👥 Nhân sự (HR)</span>
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.25s ease",
                transform: hrOpen ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: "0.75rem",
                opacity: 0.7,
              }}
            >
              ▶
            </span>
          </button>

          {/* Sub-menu Nhân sự */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: hrOpen ? "200px" : "0",
              transition: "max-height 0.3s ease",
            }}
          >
            <Link
              href="/nhan-su/nhan-vien"
              className={`nav-item nav-item--sub${pathname.startsWith("/nhan-su/nhan-vien") ? " active" : ""}`}
              style={{ paddingLeft: "2rem", fontSize: "0.9rem" }}
            >
              🧑‍💼 Nhân viên
            </Link>
            <Link
              href="/nhan-su/cham-cong"
              className={`nav-item nav-item--sub${pathname.startsWith("/nhan-su/cham-cong") ? " active" : ""}`}
              style={{ paddingLeft: "2rem", fontSize: "0.9rem" }}
            >
              🕐 Chấm công
            </Link>
            <Link
              href="/nhan-su/nghi-phep"
              className={`nav-item nav-item--sub${pathname.startsWith("/nhan-su/nghi-phep") ? " active" : ""}`}
              style={{ paddingLeft: "2rem", fontSize: "0.9rem" }}
            >
              🏖️ Nghỉ phép
            </Link>
          </div>
        </div>

        <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
          <div
            style={{
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              color: "#888",
              fontWeight: 600,
            }}
          >
            Cài đặt
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="nav-item"
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#e74c3c",
              }}
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}
