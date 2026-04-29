"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logout } from "@/app/login/actions";
import { X, LayoutDashboard, Users, ShoppingCart, Factory, Database, UserCircle, LogOut, ChevronRight } from "lucide-react";

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/sales")) setOpenMenu("sales");
    else if (pathname.startsWith("/production")) setOpenMenu("production");
    else if (pathname.startsWith("/purchasing")) setOpenMenu("purchasing");
    else if (pathname.startsWith("/nhan-su")) setOpenMenu("hr");
    else if (pathname.startsWith("/danh-muc")) setOpenMenu("catalog");
  }, [pathname]);

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const menuGroups = [
    {
      id: "catalog",
      label: "Danh mục",
      icon: <Database size={20} />,
      items: [
        { href: "/danh-muc/khach-hang", label: "Khách hàng" },
        { href: "/danh-muc/nha-cung-cap", label: "Nhà cung cấp" },
        { href: "/danh-muc/nhom-san-pham", label: "Nhóm sản phẩm" },
        { href: "/danh-muc/san-pham", label: "Sản phẩm" },
        { href: "/danh-muc/chi-nhanh", label: "Chi nhánh" },
        { href: "/danh-muc/quoc-gia", label: "Quốc gia" },
      ]
    },
    {
      id: "sales",
      label: "Kinh doanh",
      icon: <ShoppingCart size={20} />,
      items: [
        { href: "/sales/don-hang", label: "Đơn hàng" },
      ]
    },
    {
      id: "production",
      label: "Sản xuất",
      icon: <Factory size={20} />,
      items: [
        { href: "/production/ke-hoach-vat-tu", label: "Kế hoạch vật tư" },
      ]
    },
    {
      id: "purchasing",
      label: "Thu mua",
      icon: <ShoppingCart size={20} />,
      items: [
        { href: "/purchasing", label: "Kế hoạch Thu mua" },
        { href: "/purchasing/dispatch", label: "Lệnh điều động" },
      ]
    },
    {
      id: "hr",
      label: "Nhân sự",
      icon: <Users size={20} />,
      items: [
        { href: "/nhan-su/nhan-vien", label: "Nhân viên" },
        { href: "/nhan-su/hop-dong", label: "Hợp đồng lao động" },
        { href: "/nhan-su/bo-phan", label: "Bộ phận" },
        { href: "/nhan-su/chuc-vu", label: "Chức vụ" },
        { href: "/nhan-su/bac-luong", label: "Bậc lương" },
        { href: "/nhan-su/tang-giam-luong", label: "Tăng/Giảm lương" },
        { href: "/nhan-su/cham-cong", label: "Chấm công" },
        { href: "/nhan-su/bang-luong", label: "Bảng lương" },
      ]
    }
  ];

  return (
    <aside className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-header">
        <span>EMS System</span>
        <button className="mobile-only-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>
      
      <nav className="sidebar-nav">
        <Link href="/" className={`nav-item ${pathname === "/" ? "active" : ""}`}>
          <LayoutDashboard size={20} />
          <span style={{ marginLeft: "0.75rem" }}>Tổng quan</span>
        </Link>
        
        <Link href="/admin" className={`nav-item ${pathname.startsWith("/admin") ? "active" : ""}`}>
          <UserCircle size={20} />
          <span style={{ marginLeft: "0.75rem" }}>Tài khoản (Admin)</span>
        </Link>

        {menuGroups.map((group) => (
          <div key={group.id}>
            <button
              className={`nav-item ${pathname.startsWith(group.items[0].href.split('/')[1]) ? "active" : ""}`}
              onClick={() => toggleMenu(group.id)}
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                {group.icon}
                <span style={{ marginLeft: "0.75rem" }}>{group.label}</span>
              </div>
              <ChevronRight 
                size={16} 
                style={{ 
                  transition: "transform 0.2s", 
                  transform: openMenu === group.id ? "rotate(90deg)" : "rotate(0deg)" 
                }} 
              />
            </button>
            <div style={{ 
              overflow: "hidden", 
              maxHeight: openMenu === group.id ? "1000px" : "0", 
              transition: "max-height 0.3s ease-in-out",
              background: "rgba(0,0,0,0.02)"
            }}>
              {group.items.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}
                  style={{ paddingLeft: "3rem", fontSize: "0.9rem", margin: "2px 0.75rem" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", padding: "1rem 0" }}>
          <form action={logout}>
            <button type="submit" className="nav-item" style={{ width: "100%", color: "var(--danger-color)" }}>
              <LogOut size={20} />
              <span style={{ marginLeft: "0.75rem" }}>Đăng xuất</span>
            </button>
          </form>
        </div>
      </nav>

      <style jsx>{`
        .mobile-only-btn {
          display: none;
        }
        @media (max-width: 1024px) {
          .mobile-only-btn {
            display: block;
          }
        }
      `}</style>
    </aside>
  );
}
