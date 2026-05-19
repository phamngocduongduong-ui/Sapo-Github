"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logout } from "@/app/login/actions";
import { 
  X, ChevronRight, ChevronLeft, LogOut, LayoutDashboard, Database, Users, 
  CreditCard, ShoppingBag, ShoppingCart, Factory, Box, Settings, ShieldCheck,
  Briefcase, MapPin, UserCog, Truck, Layers, Globe, Package, Ruler, Warehouse as WarehouseIcon, 
  Locate, User, FileText, GitPullRequest, CheckCircle2, Clock, Map, Calculator, 
  TrendingUp, BarChart, FileCheck, Calendar, FilePlus, ArrowRightLeft, BarChart3, 
  ClipboardList, Archive, PackageCheck, UserCircle, Key, Shield, ClipboardEdit, List
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPerms() {
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 3000); // 3s fallback

      try {
        const res = await fetch("/api/user-permissions");
        if (!res.ok) {
          // Xoá cookie session trên client side để tránh vòng lặp chuyển hướng của middleware
          document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          window.location.href = "/login";
          throw new Error("Không xác định được người dùng");
        }
        const data = await res.json();
        setUserPerms(data.permissions || []);
        setIsAdmin(data.isAdmin || false);
      } catch (e) {
        console.error(e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    }
    fetchPerms();
  }, []);



  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      if (!isOpen) {
        setOpenMenu(null);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.nav-item') && !target.closest('.sub-menu')) {
        setOpenMenu(null);
      }
    };
    // Hover menus don't necessarily need this, but it doesn't hurt. 
    // However, the user specifically asked for hover behavior.
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [menuTop, setMenuTop] = useState<number>(0);

  const handleMouseEnter = (e: React.MouseEvent, menu: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuTop(rect.top);
    setOpenMenu(menu);
  };

  const allMenuGroups = [
    {
      id: "catalog",
      key: "DANH_MUC",
      label: "Danh mục",
      icon: <Database size={18} color="#10b981" />,
      items: [
        { href: "/danh-muc/bo-phan", label: "Bộ phận", key: "DM_BO_PHAN", icon: <Briefcase size={14} color="#10b981" /> },
        { href: "/danh-muc/chi-nhanh", label: "Chi nhánh", key: "DM_CHI_NHANH", icon: <MapPin size={14} color="#10b981" /> },
        { href: "/danh-muc/chuc-vu", label: "Chức vụ", key: "DM_CHUC_VU", icon: <UserCog size={14} color="#10b981" /> },
        { href: "/danh-muc/khach-hang", label: "Khách hàng", key: "DM_KHACH_HANG", icon: <Users size={14} color="#10b981" /> },
        { href: "/danh-muc/nha-cung-cap", label: "Nhà cung cấp", key: "DM_NHA_CUNG_CAP", icon: <Truck size={14} color="#10b981" /> },
        { href: "/danh-muc/nhom-san-pham", label: "Nhóm sản phẩm", key: "DM_NHOM_SP", icon: <Layers size={14} color="#10b981" /> },
        { href: "/danh-muc/quoc-gia", label: "Quốc gia", key: "DM_QUOC_GIA", icon: <Globe size={14} color="#10b981" /> },
        { href: "/danh-muc/san-pham", label: "Sản phẩm", key: "DM_SAN_PHAM", icon: <Package size={14} color="#10b981" /> },
        { href: "/danh-muc/don-vi-tinh", label: "Đơn vị tính", key: "DM_DON_VI_TINH", icon: <Ruler size={14} color="#10b981" /> },
        { href: "/danh-muc/kho-hang", label: "Kho hàng", key: "DM_KHO_HANG", icon: <WarehouseIcon size={14} color="#10b981" /> },
        { href: "/danh-muc/vi-tri", label: "Vị trí kho", key: "DM_VI_TRI", icon: <Locate size={14} color="#10b981" /> },
      ]
    },
    {
      id: "hr",
      key: "NHAN_SU",
      label: "Nhân sự",
      icon: <Users size={18} color="#ec4899" />,
      items: [
        { href: "/nhan-su/nhan-vien", label: "Nhân viên", key: "NS_NHAN_VIEN", icon: <User size={14} color="#ec4899" /> },
        { href: "/nhan-su/hop-dong", label: "Hợp đồng lao động", key: "NS_HOP_DONG", icon: <FileText size={14} color="#ec4899" /> },
        { href: "/nhan-su/thuyen-chuyen-bo-nhiem", label: "Thuyên chuyển, Bổ nhiệm", key: "NS_DIEU_DONG", icon: <GitPullRequest size={14} color="#ec4899" /> },
        { href: "/nhan-su/phe-duyet", label: "Phê duyệt", key: "NS_APPROVE", icon: <CheckCircle2 size={14} color="#ec4899" /> },
      ]
    },
    {
      id: "payroll",
      key: "LUONG_BHXH",
      label: "Lương và BHXH",
      icon: <CreditCard size={18} color="#f59e0b" />,
      items: [
        { href: "/luong-bhxh/cham-cong", label: "Chấm công", key: "LB_CHAM_CONG", icon: <Clock size={14} color="#f59e0b" /> },
        { href: "/luong-bhxh/khu-vuc", label: "Khu vực", key: "LB_KHU_VUC", icon: <Map size={14} color="#f59e0b" /> },
        { href: "/nhan-su/bang-luong", label: "Bảng lương", key: "NS_BANG_LUONG", icon: <Calculator size={14} color="#f59e0b" /> },
        { href: "/nhan-su/tang-giam-luong", label: "Tăng/Giảm lương", key: "NS_TANG_GIAM_LUONG", icon: <TrendingUp size={14} color="#f59e0b" /> },
        { href: "/nhan-su/bac-luong", label: "Bậc lương", key: "NS_BAC_LUONG", icon: <BarChart size={14} color="#f59e0b" /> },
      ]
    },
    {
      id: "sales",
      key: "KINH_DOANH",
      label: "Kinh doanh",
      icon: <ShoppingBag size={18} color="#06b6d4" />,
      items: [
        { href: "/sales/don-hang", label: "Đơn hàng", key: "KD_DON_HANG", icon: <FileCheck size={14} color="#06b6d4" /> },
      ]
    },
    {
      id: "purchasing",
      key: "THU_MUA",
      label: "Mua hàng",
      icon: <ShoppingCart size={18} color="#8b5cf6" />,
      items: [
        { href: "/purchasing", label: "Kế hoạch Thu mua", key: "TM_KE_HOACH", icon: <Calendar size={14} color="#8b5cf6" /> },
        { href: "/purchasing/lenh-mua", label: "Lệnh mua", key: "TM_LENH_MUA", icon: <FilePlus size={14} color="#8b5cf6" /> },
        { href: "/purchasing/phe-duyet", label: "Phê duyệt", key: "TM_APPROVE", icon: <CheckCircle2 size={14} color="#8b5cf6" /> },
        { href: "/purchasing/don-mua", label: "Đơn mua", key: "TM_DON_MUA", icon: <ShoppingCart size={14} color="#8b5cf6" /> },
        { href: "/purchasing/dispatch", label: "Lệnh điều động", key: "TM_DIEU_DONG", icon: <ArrowRightLeft size={14} color="#8b5cf6" /> },
        { href: "/purchasing/bao-cao", label: "Báo cáo", key: "TM_BAO_CAO", icon: <BarChart3 size={14} color="#8b5cf6" /> },
      ]
    },
    {
      id: "production",
      key: "SAN_XUAT",
      label: "Sản xuất",
      icon: <Factory size={18} color="#eab308" />,
      items: [
        { href: "/production/ke-hoach-vat-tu", label: "Kế hoạch vật tư", key: "SX_VAT_TU", icon: <ClipboardList size={14} color="#eab308" /> },
      ]
    },
    {
      id: "warehouse",
      key: "THU_KHO",
      label: "Thủ kho",
      icon: <Box size={18} color="#f97316" />,
      items: [
        { href: "/thu-kho/kho-vat-tu", label: "Kho vật tư", key: "TK_KHO_VAT_TU", icon: <Archive size={14} color="#f97316" /> },
        { href: "/thu-kho/kho-thanh-pham", label: "Kho thành phẩm", key: "TK_KHO_THANH_PHAM", icon: <PackageCheck size={14} color="#f97316" /> },
      ]
    },
    {
      id: "admin",
      key: "QUAN_TRI",
      label: "Quản trị",
      icon: <Settings size={18} color="#6366f1" />,
      items: [
        { href: "/admin/tai-khoan", label: "Tài khoản", key: "QT_TAI_KHOAN", icon: <UserCircle size={14} color="#6366f1" /> },
        { href: "/admin/muc-quyen", label: "Mục quyền", key: "QT_MUC_QUYEN", icon: <Key size={14} color="#6366f1" /> },
        { href: "/admin/quyen-su-dung", label: "Phân quyền", key: "QT_PHAN_QUYEN", icon: <Shield size={14} color="#6366f1" /> },
      ]
    },
    {
      id: "security",
      key: "AN_NINH",
      label: "An ninh",
      icon: <ShieldCheck size={18} color="#ef4444" />,
      items: [
        { href: "/an-ninh/dang-ky", label: "Đăng ký", key: "AN_DANG_KY", icon: <ClipboardEdit size={14} color="#ef4444" /> },
        { href: "/an-ninh/danh-sach", label: "Danh sách", key: "AN_DANH_SACH", icon: <List size={14} color="#ef4444" />, target: "_blank" },
        { href: "/an-ninh/kiem-tra", label: "Kiểm tra", key: "AN_KIEM_TRA", icon: <ShieldCheck size={14} color="#ef4444" />, target: "_blank" },
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
    <aside className="sidebar sidebar-aside" style={{ width: "180px", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 1050, display: "flex", flexDirection: "column" }}>
      <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "1.1rem", fontWeight: "700", letterSpacing: "0.5px" }}>SAPO EMS</span>
        <button 
          onClick={onClose}
          className="mobile-close-btn"
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            display: "none",
          }}
        >
          <X size={18} />
        </button>
      </div>
      
      <nav className="sidebar-nav" style={{ padding: "0.5rem 0" }}>
        <Link 
          href="/" 
          className={`nav-item ${pathname === "/" ? "active" : ""}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LayoutDashboard size={18} color="#3b82f6" />
            <span>Tổng quan</span>
          </div>
        </Link>

        {loading ? (
          <div style={{ padding: "1rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: "1.25rem", background: "rgba(0,0,0,0.05)", borderRadius: "4px", width: i % 2 === 0 ? "70%" : "85%", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : menuGroups.map((group) => (
          <div 
            key={group.id} 
            style={{ marginBottom: "1px", position: "relative" }}
            onMouseEnter={(e) => handleMouseEnter(e, group.id)}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              className={`nav-item ${group.items?.some(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) ? "active" : ""}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {group.icon}
                <span>{group.label}</span>
              </div>
              <ChevronRight 
                size={14} 
                className={`chevron ${openMenu === group.id ? "open" : ""}`}
              />
            </button>
            <div className={`sub-menu ${openMenu === group.id ? "open" : ""}`} style={{ top: menuTop }}>
              {group.items.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className={`sub-item ${pathname === item.href ? "active" : ""}`}
                  target={(item as any).target}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {(item as any).icon}
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", padding: "0.75rem 0" }}>
          <form action={logout}>
            <button type="submit" className="nav-item" style={{ width: "100%", color: "var(--danger-color)", fontSize: "1.0rem", fontWeight: "600", paddingLeft: "1.75rem" }}>
              <LogOut size={16} color="currentColor" style={{ marginRight: "0.75rem" }} />
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      </nav>

    </aside>
  );
}

