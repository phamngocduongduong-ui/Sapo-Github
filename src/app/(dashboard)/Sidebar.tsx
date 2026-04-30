"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logout } from "@/app/login/actions";
import { X, ChevronRight, LogOut } from "lucide-react";

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPerms() {
      try {
        const res = await fetch("/api/user-permissions");
        const data = await res.json();
        setUserPerms(data.permissions || []);
        setIsAdmin(data.isAdmin || false);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPerms();
  }, []);

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

  const allMenuGroups = [
    {
      id: "catalog",
      key: "DANH_MUC",
      label: "Danh mục",
      items: [
        { href: "/danh-muc/bo-phan", label: "Bộ phận", key: "DM_BO_PHAN" },
        { href: "/danh-muc/chi-nhanh", label: "Chi nhánh", key: "DM_CHI_NHANH" },
        { href: "/danh-muc/chuc-vu", label: "Chức vụ", key: "DM_CHUC_VU" },
        { href: "/danh-muc/khach-hang", label: "Khách hàng", key: "DM_KHACH_HANG" },
        { href: "/danh-muc/nha-cung-cap", label: "Nhà cung cấp", key: "DM_NHA_CUNG_CAP" },
        { href: "/danh-muc/nhom-san-pham", label: "Nhóm sản phẩm", key: "DM_NHOM_SP" },
        { href: "/danh-muc/quoc-gia", label: "Quốc gia", key: "DM_QUOC_GIA" },
        { href: "/danh-muc/san-pham", label: "Sản phẩm", key: "DM_SAN_PHAM" },
      ]
    },
    {
      id: "hr",
      key: "NHAN_SU",
      label: "Nhân sự",
      items: [
        { href: "/nhan-su/nhan-vien", label: "1. Nhân viên", key: "NS_NHAN_VIEN" },
        { href: "/nhan-su/hop-dong", label: "2. Hợp đồng lao động", key: "NS_HOP_DONG" },
        { href: "/nhan-su/nghi-phep", label: "3. Nghỉ phép", key: "NS_NGHI_PHEP" },
        { href: "/nhan-su/cham-cong", label: "4. Chấm công", key: "NS_CHAM_CONG" },
        { href: "/nhan-su/bang-luong", label: "5. Bảng lương", key: "NS_BANG_LUONG" },
        { href: "/nhan-su/tra-cuu-luong", label: "6. Tra cứu lương", key: "NS_TRA_CUU_LUONG" },
        { href: "/nhan-su/tang-giam-luong", label: "7. Tăng/Giảm lương", key: "NS_TANG_GIAM_LUONG" },
        { href: "/nhan-su/thuyen-chuyen-bo-nhiem", label: "8. Thuyên chuyển, Bổ nhiệm", key: "NS_DIEU_DONG" },
        { href: "/nhan-su/bac-luong", label: "9. Bậc lương", key: "NS_BAC_LUONG" },
        { href: "/nhan-su/phe-duyet", label: "10. Phê duyệt", key: "NS_APPROVE" },
      ]
    },
    {
      id: "sales",
      key: "KINH_DOANH",
      label: "Kinh doanh",
      items: [
        { href: "/sales/don-hang", label: "Đơn hàng", key: "KD_DON_HANG" },
      ]
    },
    {
      id: "purchasing",
      key: "THU_MUA",
      label: "Thu mua",
      items: [
        { href: "/purchasing", label: "Kế hoạch Thu mua", key: "TM_KE_HOACH" },
        { href: "/purchasing/dispatch", label: "Lệnh điều động", key: "TM_DIEU_DONG" },
      ]
    },
    {
      id: "production",
      key: "SAN_XUAT",
      label: "Sản xuất",
      items: [
        { href: "/production/ke-hoach-vat-tu", label: "Kế hoạch vật tư", key: "SX_VAT_TU" },
      ]
    },
    {
      id: "admin",
      key: "QUAN_TRI",
      label: "Quản trị",
      items: [
        { href: "/admin/tai-khoan", label: "Tài khoản", key: "QT_TAI_KHOAN" },
        { href: "/admin/muc-quyen", label: "Mục quyền", key: "QT_MUC_QUYEN" },
        { href: "/admin/quyen-su-dung", label: "Phân quyền", key: "QT_PHAN_QUYEN" },
      ]
    },
  ];

  // Lọc menu dựa trên quyền
  const menuGroups = isAdmin ? allMenuGroups : allMenuGroups
    .filter(group => userPerms.includes(group.key))
    .map(group => ({
      ...group,
      items: group.items.filter(item => userPerms.includes(item.key))
    }))
    .filter(group => group.items.length > 0);

  // Removed if (loading) return null; to fix flicker


  return (
    <aside className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-header">
        <span style={{ fontSize: "1.1rem", fontWeight: "700", letterSpacing: "0.5px" }}>SAPO EMS</span>
        <button className="mobile-only-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>
      
      <nav className="sidebar-nav" style={{ padding: "0.5rem 0" }}>
        <Link 
          href="/" 
          className={`nav-item ${pathname === "/" ? "active" : ""}`}
          style={{ fontSize: "1.0rem", fontWeight: "600", paddingLeft: "1.75rem", margin: "2px 0.5rem" }}
        >
          <span>Tổng quan</span>
        </Link>

        {loading ? (
          <div style={{ padding: "1rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: "1.25rem", background: "rgba(0,0,0,0.05)", borderRadius: "4px", width: i % 2 === 0 ? "70%" : "85%", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : menuGroups.map((group) => (
          <div key={group.id} style={{ marginBottom: "1px" }}>
            <button
              className={`nav-item ${pathname.startsWith("/" + group.items[0].href.split('/')[1]) ? "active" : ""}`}
              onClick={() => toggleMenu(group.id)}
              style={{ 
                width: "100%", 
                justifyContent: "space-between",
                fontSize: "1.0rem",
                fontWeight: "600",
                paddingLeft: "1.75rem",
                margin: "2px 0.5rem"
              }}
            >
              <span>{group.label}</span>
              <ChevronRight 
                size={14} 
                style={{ 
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                  transform: openMenu === group.id ? "rotate(90deg)" : "rotate(0deg)",
                  opacity: 0.5
                }} 
              />
            </button>
            <div style={{ 
              overflow: "hidden", 
              maxHeight: openMenu === group.id ? "1000px" : "0", 
              transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              background: "rgba(0,0,0,0.015)"
            }}>
              {group.items.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className={`nav-item ${pathname === item.href ? "active" : ""}`}
                  style={{ 
                    paddingLeft: "2.5rem", 
                    fontSize: "0.9rem", 
                    margin: "1px 0.5rem",
                    fontWeight: "400",
                    opacity: 0.9
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", padding: "0.75rem 0" }}>
          <form action={logout}>
            <button type="submit" className="nav-item" style={{ width: "100%", color: "var(--danger-color)", fontSize: "1.0rem", fontWeight: "600", paddingLeft: "1.75rem" }}>
              <LogOut size={16} style={{ marginRight: "0.75rem" }} />
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      </nav>

      <style>{`
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
