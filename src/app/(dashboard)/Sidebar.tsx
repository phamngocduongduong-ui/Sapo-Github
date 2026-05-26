"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  X, LogOut, LayoutDashboard, Database, Users, 
  CreditCard, ShoppingBag, ShoppingCart, Factory, Box, Settings, ShieldCheck,
  Briefcase, MapPin, UserCog, Truck, Layers, Globe, Package, Ruler, Warehouse as WarehouseIcon, 
  Locate, User, FileText, GitPullRequest, CheckCircle2, Clock, Map, Calculator, 
  TrendingUp, BarChart, FileCheck, Calendar, FilePlus, ArrowRightLeft, BarChart3, 
  ClipboardList, Archive, PackageCheck, UserCircle, Key, Shield, ClipboardEdit, List,
  ChevronDown
} from "lucide-react";

const allMenuGroups = [
  {
    id: "personal",
    key: "CA_NHAN",
    label: "Cá nhân",
    icon: <User size={18} color="#0072bc" />,
    items: [
      { href: "/ca-nhan/ho-so", label: "Hồ sơ", key: "CN_HO_SO", icon: <User size={14} color="#0072bc" /> },
      { href: "/ca-nhan/cham-cong", label: "Chấm công", key: "CN_CHAM_CONG", icon: <Calendar size={14} color="#0072bc" /> },
      { href: "/ca-nhan/nghi-phep", label: "Nghỉ phép", key: "CN_NGHI_PHEP", icon: <Calendar size={14} color="#0072bc" /> },
      { href: "/ca-nhan/nghi-viec", label: "Nghỉ việc", key: "CN_NGHI_VIEC", icon: <LogOut size={14} color="#0072bc" /> },
      { href: "/ca-nhan/tra-cuu-luong", label: "Tra cứu lương", key: "CN_TRA_CUU_LUONG", icon: <FileText size={14} color="#0072bc" /> },
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
    id: "approver",
    key: "PHE_DUYET",
    label: "Người phê duyệt",
    icon: <CheckCircle2 size={18} color="#0072bc" />,
    items: [
      { href: "/phe-duyet", label: "Trung tâm phê duyệt", key: "PHE_DUYET", icon: <CheckCircle2 size={14} color="#0072bc" /> }
    ]
  },
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
      { href: "/danh-muc/dia-diem-cham-cong", label: "Địa điểm chấm công", key: "LB_KHU_VUC", icon: <Map size={14} color="#10b981" /> },
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
      { href: "/nhan-su/bao-cao", label: "Báo cáo", key: "NS_BAO_CAO", icon: <BarChart size={14} color="#ec4899" /> },
    ]
  },
  {
    id: "payroll",
    key: "LUONG_BHXH",
    label: "Lương và BHXH",
    icon: <CreditCard size={18} color="#f59e0b" />,
    items: [
      { href: "/nhan-su/cham-cong", label: "Chấm công", key: "LB_CHAM_CONG", icon: <Calendar size={14} color="#f59e0b" /> },
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
      { href: "/sales/hop-dong", label: "Hợp đồng", key: "KD_HOP_DONG", icon: <FileText size={14} color="#06b6d4" /> },
      { href: "/sales/don-hang", label: "Đơn hàng", key: "KD_DON_HANG", icon: <FileCheck size={14} color="#06b6d4" /> },
    ]
  },
  {
    id: "purchasing",
    key: "THU_MUA",
    label: "Mua hàng",
    icon: <ShoppingCart size={18} color="#8b5cf6" />,
    items: [
      { href: "/purchasing/lenh-mua", label: "Đơn mua hàng", key: "TM_LENH_MUA", icon: <FilePlus size={14} color="#8b5cf6" /> },
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
      { href: "/production/don-san-xuat", label: "Đơn sản xuất", key: "SX_DON_SAN_XUAT", icon: <ClipboardList size={14} color="#eab308" /> },
      { href: "/production/ke-hoach-giao", label: "Kế hoạch giao", key: "SX_KE_HOACH_GIAO", icon: <ClipboardList size={14} color="#eab308" /> },
      { href: "/production/ke-hoach-vat-tu", label: "Kế hoạch vật tư", key: "SX_VAT_TU", icon: <ClipboardList size={14} color="#eab308" /> },
    ]
  },
  {
    id: "maintenance",
    key: "BAO_TRI",
    label: "Bảo trì",
    icon: <Settings size={18} color="#f43f5e" />,
    items: [
      { href: "/maintenance/de-nghi-mua", label: "Đề nghị mua", key: "BT_DE_NGHI_MUA", icon: <ClipboardList size={14} color="#f43f5e" /> },
      { href: "/maintenance/phe-duyet", label: "Phê duyệt", key: "BT_PHE_DUYET", icon: <CheckCircle2 size={14} color="#f43f5e" /> },
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

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  // Lọc menu dựa trên quyền
  const menuGroups = isAdmin ? allMenuGroups : allMenuGroups
    .filter(group => userPerms.includes(group.key))
    .map(group => ({
      ...group,
      items: group.items.filter(item => userPerms.includes(item.key))
    }))
    .filter(group => group.items.length > 0);

  // Auto expand active group
  useEffect(() => {
    const activeGroup = menuGroups.find(group => 
      group.items.some(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
    );
    if (activeGroup) {
      setExpandedGroups({
        [activeGroup.id]: true
      });
    }
  }, [pathname, isAdmin, userPerms]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const isCurrentlyExpanded = !!prev[id];
      return {
        [id]: !isCurrentlyExpanded
      };
    });
  };

  return (
    <aside className={`sidebar sidebar-aside ${isOpen ? "open" : ""}`} style={{ width: "220px", height: "calc(100vh - 140px)", position: "fixed", left: 0, top: "140px", zIndex: 1050, display: "flex", flexDirection: "column", borderRight: "1px solid #cbd5e1" }}>
      <button 
        onClick={onClose}
        className="mobile-close-btn"
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "none",
          border: "none",
          color: "#64748b",
          cursor: "pointer",
          display: "none",
          zIndex: 1060
        }}
      >
        <X size={18} />
      </button>


      
      <nav className="sidebar-nav" style={{ padding: "0", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <Link 
          href="/" 
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "12px 20px",
            background: pathname === "/" ? "#f1f5f9" : "#ffffff",
            color: "#2b6cb0",
            textTransform: "uppercase",
            fontWeight: "700",
            fontSize: "13px",
            borderBottom: "1px solid #cbd5e1",
            cursor: "pointer",
            transition: "background-color 0.2s ease, color 0.2s ease",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/") {
              e.currentTarget.style.backgroundColor = "#f8fafc";
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/") {
              e.currentTarget.style.backgroundColor = "#ffffff";
            }
          }}
        >
          <span style={{ textAlign: "left", flex: 1, letterSpacing: "0.2px" }}>Tổng quan</span>
        </Link>

        {loading ? (
          <div style={{ padding: "1rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: "1.25rem", background: "rgba(0,0,0,0.05)", borderRadius: "4px", width: i % 2 === 0 ? "70%" : "85%", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : menuGroups.map((group) => {
          const isExpanded = !!expandedGroups[group.id];
          const isGroupActive = group.items?.some(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));
          return (
            <div key={group.id} style={{ display: "flex", flexDirection: "column" }}>
              <button
                onClick={() => toggleGroup(group.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "12px 20px",
                  background: isExpanded ? "#f1f5f9" : isGroupActive ? "#f1f5f9" : "#ffffff",
                  color: "#2b6cb0",
                  textTransform: "uppercase",
                  fontWeight: "700",
                  fontSize: "13px",
                  borderBottom: "1px solid #cbd5e1",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded && !isGroupActive) {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded && !isGroupActive) {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }
                }}
              >
                <span style={{ flex: 1, letterSpacing: "0.2px" }}>{group.label}</span>
                <ChevronDown 
                  size={14} 
                  style={{
                    transition: "transform 0.2s ease",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    color: "#2b6cb0",
                  }}
                />
              </button>
              {isExpanded && (
                <div style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                  {group.items.map((item) => {
                    const isItemActive = pathname === item.href;
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href} 
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "8px 24px 8px 35px",
                          color: "#2b6cb0",
                          background: isItemActive ? "#eff6ff" : "transparent",
                          fontSize: "13px",
                          fontWeight: isItemActive ? "700" : "600",
                          transition: "all 0.15s ease",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!isItemActive) {
                            e.currentTarget.style.backgroundColor = "#f1f5f9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isItemActive) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                        target={(item as any).target}
                      >
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Removed redundant bottom logout block */}
      </nav>
    </aside>
  );
}

