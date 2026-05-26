"use client";

import React, { useState, useTransition, useEffect } from "react";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { saveCategoryPermissions, getCategoryPermissions } from "./actions";

const MODULES = [
  {
    key: "CA_NHAN",
    label: "👤 Cá nhân",
    children: [
      { key: "CN_HO_SO", label: "Hồ sơ" },
      { key: "CN_CHAM_CONG", label: "Chấm công" },
      { key: "CN_NGHI_PHEP", label: "Nghỉ phép" },
      { key: "CN_NGHI_VIEC", label: "Nghỉ việc" },
      { key: "CN_TRA_CUU_LUONG", label: "Tra cứu lương" },
    ]
  },
  {
    key: "DANH_MUC",
    label: "📦 Danh mục",
    children: [
      { key: "DM_BO_PHAN", label: "Bộ phận" },
      { key: "DM_CHI_NHANH", label: "Chi nhánh" },
      { key: "DM_CHUC_VU", label: "Chức vụ" },
      { key: "DM_KHACH_HANG", label: "Khách hàng" },
      { key: "DM_NHA_CUNG_CAP", label: "Nhà cung cấp" },
      { key: "DM_NHOM_SP", label: "Nhóm sản phẩm" },
      { key: "DM_QUOC_GIA", label: "Quốc gia" },
      { key: "DM_SAN_PHAM", label: "Sản phẩm" },
      { key: "DM_DON_VI_TINH", label: "Đơn vị tính" },
      { key: "DM_KHO_HANG", label: "Kho hàng" },
      { key: "DM_VI_TRI", label: "Vị trí kho" },
      { key: "LB_KHU_VUC", label: "Địa điểm chấm công" },
    ]
  },
  {
    key: "NHAN_SU",
    label: "👥 Nhân sự",
    children: [
      { key: "NS_NHAN_VIEN", label: "Nhân viên" },
      { key: "NS_HOP_DONG", label: "Hợp đồng lao động" },
      { key: "NS_DIEU_DONG", label: "Thuyên chuyển, Bổ nhiệm" },
      { key: "NS_APPROVE", label: "Phê duyệt" },
      { key: "NS_BAO_CAO", label: "Báo cáo" },
    ]
  },
  {
    key: "LUONG_BHXH",
    label: "💳 Lương và BHXH",
    children: [
      { key: "LB_CHAM_CONG", label: "Chấm công" },
      { key: "NS_BANG_LUONG", label: "Bảng lương" },
      { key: "NS_TANG_GIAM_LUONG", label: "Tăng/Giảm lương" },
      { key: "NS_BAC_LUONG", label: "Bậc lương" },
    ]
  },
  {
    key: "KINH_DOANH",
    label: "💰 Kinh doanh",
    children: [
      { key: "KD_HOP_DONG", label: "Hợp đồng" },
      { key: "KD_DON_HANG", label: "Đơn hàng" },
    ]
  },
  {
    key: "THU_MUA",
    label: "🛒 Mua hàng",
    children: [
      { key: "TM_LENH_MUA", label: "Đơn mua hàng" },
      { key: "TM_APPROVE", label: "Phê duyệt" },
      { key: "TM_DON_MUA", label: "Đơn mua" },
      { key: "TM_DIEU_DONG", label: "Lệnh điều động" },
      { key: "TM_BAO_CAO", label: "Báo cáo" },
    ]
  },
  {
    key: "SAN_XUAT",
    label: "🏗️ Sản xuất",
    children: [
      { key: "SX_DON_SAN_XUAT", label: "Đơn sản xuất" },
      { key: "SX_KE_HOACH_GIAO", label: "Kế hoạch giao" },
      { key: "SX_VAT_TU", label: "Kế hoạch vật tư" },
    ]
  },
  {
    key: "BAO_TRI",
    label: "🛠️ Bảo trì",
    children: [
      { key: "BT_DE_NGHI_MUA", label: "Đề nghị mua" },
      { key: "BT_PHE_DUYET", label: "Phê duyệt" },
    ]
  },
  {
    key: "THU_KHO",
    label: "📦 Thủ kho",
    children: [
      { key: "TK_KHO_VAT_TU", label: "Kho vật tư" },
      { key: "TK_KHO_THANH_PHAM", label: "Kho thành phẩm" },
    ]
  },
  {
    key: "QUAN_TRI",
    label: "⚙️ Quản trị",
    children: [
      { key: "QT_TAI_KHOAN", label: "Tài khoản" },
      { key: "QT_MUC_QUYEN", label: "Mục quyền" },
      { key: "QT_PHAN_QUYEN", label: "Phân quyền" },
    ]
  },
  {
    key: "AN_NINH",
    label: "🛡️ An ninh",
    children: [
      { key: "AN_DANG_KY", label: "Đăng ký" },
      { key: "AN_DANH_SACH", label: "Danh sách" },
      { key: "AN_KIEM_TRA", label: "Kiểm tra" },
    ]
  },
  {
    key: "PHE_DUYET",
    label: "✅ PHÊ DUYỆT",
    children: [
      { key: "PD_NHAN_SU", label: "Phê duyệt nhân sự" },
      { key: "PD_HOP_DONG_LD", label: "Hợp đồng lao động" },
      { key: "PD_HOP_DONG_BH", label: "Hợp đồng bán hàng" },
      { key: "PD_LUONG_THUONG", label: "Bảng lương/thưởng" },
      { key: "PD_THANH_TOAN", label: "Thanh toán" },
      { key: "PD_MUA_HANG", label: "Mua hàng" },
      { key: "PD_BAO_TRI", label: "Bảo trì" },
    ]
  },
  {
    key: "KE_TOAN",
    label: "💵 Kế toán",
    children: [
      { key: "KT_THANH_TOAN", label: "Thanh toán" },
    ]
  }
];


const ALL_KEYS: string[] = [];
MODULES.forEach(m => {
  ALL_KEYS.push(m.key);
  m.children.forEach(c => {
    ALL_KEYS.push(c.key);
  });
});

export default function PermissionAssignment({ categories }: { categories: any[] }) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const areAllSelected = ALL_KEYS.length > 0 && ALL_KEYS.every(key => permissions[key] === true);

  function handleToggleAll() {
    if (areAllSelected) {
      setPermissions({});
    } else {
      const allPerms: Record<string, boolean> = {};
      ALL_KEYS.forEach(key => {
        allPerms[key] = true;
      });
      setPermissions(allPerms);
    }
  }

  useEffect(() => {
    if (selectedCategoryId) {
      loadPermissions(selectedCategoryId);
    } else {
      setPermissions({});
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function loadPermissions(permissionId: string) {
    setLoading(true);
    try {
      const data = await getCategoryPermissions(permissionId);
      const permMap: Record<string, boolean> = {};
      data.forEach(p => {
        permMap[p.moduleKey] = p.canAccess;
      });
      setPermissions(permMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleParentToggle(parentKey: string, checked: boolean) {
    setPermissions(prev => {
      const newPerms = { ...prev, [parentKey]: checked };
      
      // If unchecking parent, automatically uncheck all children
      if (!checked) {
        const parent = MODULES.find(m => m.key === parentKey);
        if (parent) {
          parent.children.forEach(child => {
            newPerms[child.key] = false;
          });
        }
      }
      return newPerms;
    });
  }

  function handleChildToggle(childKey: string, checked: boolean) {
    setPermissions(prev => ({ ...prev, [childKey]: checked }));
  }

  function handleSave() {
    if (!selectedCategoryId) return;
    const permList = Object.entries(permissions).map(([moduleKey, canAccess]) => ({
      moduleKey,
      canAccess
    }));
    
    startTransition(async () => {
      try {
        await saveCategoryPermissions(selectedCategoryId, permList);
        setSuccess("Đã lưu phân quyền thành công cho mục quyền!");
      } catch (err: any) {
        setError(err.message || "Lỗi khi lưu phân quyền.");
      }
    });
  }

  return (
    <div className="perm-page-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .perm-page-container {
          width: 100%;
        }
        .perm-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .perm-layout input,
        .perm-layout select,
        .perm-layout button,
        .perm-layout table,
        .perm-layout td,
        .perm-layout th,
        .perm-layout label,
        .perm-layout .badge,
        .perm-layout .blue-panel-header,
        .perm-page-container .breadcrumb-banner {
          font-size: 13px !important;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          display: block;
          border-radius: 0 !important;
          margin-top: 0;
          margin-left: -10px;
          margin-right: -10px;
        }
        .panel-left {
          flex: 0 0 40%;
          min-width: 450px;
        }
        .panel-right {
          flex: 1 1 60%;
          min-width: 300px;
        }
        @media (max-width: 1024px) {
          .perm-layout {
            flex-direction: column;
          }
          .panel-left, .panel-right {
            flex: 1 1 100%;
            min-width: unset !important;
          }
        }
        .blue-panel {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        .blue-panel-header {
          background-color: #003466;
          color: #ffffff;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #ff5c00;
        }
        .blue-panel-body {
          padding: 10px;
        }
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 5px 0px 10px 0px;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          border-radius: 4px;
          font-weight: 400;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn:active {
          transform: scale(0.98);
        }
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
          cursor: pointer;
        }
        .table th,
        .table td {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          text-align: center !important;
        }
        .perm-table-container {
          width: 100% !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        @media (max-width: 768px) {
          .perm-page-container {
            max-width: 100% !important;
            width: 100% !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .perm-layout {
            max-width: 100% !important;
            width: 100% !important;
            overflow-x: hidden !important;
            gap: 1rem !important;
            padding: 10px 0 !important;
            box-sizing: border-box !important;
            flex-direction: column !important;
          }
          .panel-left, .panel-right {
            flex: none !important;
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .blue-panel {
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .blue-panel-body {
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .perm-table-container {
            margin-left: 0px !important;
            overflow: auto !important;
            overflow-y: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            box-sizing: border-box !important;
          }
          .perm-table-container table {
            min-width: 480px !important;
            width: 100% !important;
            table-layout: auto !important;
          }
        }
        .placeholder-box {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          padding: 2rem;
          border-radius: 6px;
          text-align: center;
          font-size: 0.95rem;
          font-weight: 600;
          margin: 20px 0;
        }
      ` }} />

      <div className="breadcrumb-banner">
        QUẢN LÝ PHÂN QUYỀN
      </div>

      <div className="perm-layout">
        {/* Left Panel: List of Permission Groups */}
        <div className="panel-left">
          <div className="blue-panel">
            <div className="blue-panel-header">Danh sách Mục quyền</div>
            <div className="blue-panel-body">
              <div className="perm-table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px", textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>STT</th>
                      <th style={{ textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>Mã mục quyền</th>
                      <th style={{ textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>Tên mục quyền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#888", padding: "2rem" }}>
                          Không tìm thấy mục quyền nào
                        </td>
                      </tr>
                    ) : (
                      categories.map((c, idx) => {
                        const isSelected = selectedCategoryId === c.id;
                        return (
                          <tr 
                            key={c.id} 
                            className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                            onClick={() => setSelectedCategoryId(c.id)}
                          >
                            <td style={{ textAlign: "center" }}>{idx + 1}</td>
                            <td style={{ fontWeight: 700, color: "#003466" }}>{c.code}</td>
                            <td>{c.name}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Detailed Assignment Checklist */}
        <div className="panel-right">
          <div className="blue-panel">
            <div className="blue-panel-header">Chi tiết phân quyền cho mục quyền</div>
            <div className="blue-panel-body">
              {!selectedCategoryId ? (
                <div className="placeholder-box">
                  💡 Vui lòng chọn mục quyền ở danh sách bên trái để phân quyền.
                </div>
              ) : (
                <>
                  <div className="search-container">
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                      <button 
                        type="button"
                        className="sapo-btn" 
                        onClick={handleToggleAll}
                      >
                        {areAllSelected ? "Hủy chọn" : "Chọn tất cả"}
                      </button>

                      <button 
                        type="button"
                        className="sapo-btn" 
                        onClick={handleSave} 
                        disabled={isPending}
                      >
                        {isPending ? "Đang lưu..." : "Lưu"}
                      </button>
                    </div>
                  </div>

                  <div className="perm-table-container">
                    <table className="table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "250px", textAlign: "left", textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>Phân hệ</th>
                          <th style={{ width: "100px", textAlign: "center", textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>Truy cập</th>
                          <th style={{ textAlign: "left", textTransform: "uppercase", fontWeight: 700, color: "#003466" }}>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={3} style={{ textAlign: "center", padding: "3rem" }}>
                              <div className="loader" style={{ margin: "0 auto" }}></div>
                              <p style={{ marginTop: "1rem", color: "#64748b" }}>Đang tải dữ liệu quyền...</p>
                            </td>
                          </tr>
                        ) : (
                          MODULES.map(parent => {
                            const isParentChecked = permissions[parent.key] || false;
                            return (
                              <React.Fragment key={parent.key}>
                                <tr style={{ background: "#f8fafc" }}>
                                  <td style={{ fontWeight: "700", color: "#003466", textAlign: "left" }}>
                                    <label 
                                      htmlFor={`parent-${parent.key}`} 
                                      style={{ cursor: "pointer", display: "flex", alignItems: "center", width: "100%", height: "100%" }}
                                    >
                                      {parent.label}
                                    </label>
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    <input 
                                      id={`parent-${parent.key}`}
                                      type="checkbox" 
                                      checked={isParentChecked}
                                      onChange={(e) => handleParentToggle(parent.key, e.target.checked)}
                                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                    />
                                  </td>
                                  <td style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "left" }}>Phân hệ mẹ</td>
                                </tr>
                                {parent.children.map(child => {
                                  const isChildChecked = permissions[child.key] || false;
                                  return (
                                    <tr key={child.key} style={{ opacity: isParentChecked ? 1 : 0.6 }}>
                                      <td style={{ paddingLeft: "2.5rem", textAlign: "left" }}>
                                        <label 
                                          htmlFor={`child-${child.key}`} 
                                          style={{ cursor: isParentChecked ? "pointer" : "not-allowed", display: "block", width: "100%" }}
                                        >
                                          {child.label}
                                        </label>
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <input 
                                          id={`child-${child.key}`}
                                          type="checkbox" 
                                          checked={isChildChecked}
                                          disabled={!isParentChecked}
                                          onChange={(e) => handleChildToggle(child.key, e.target.checked)}
                                          style={{ width: "16px", height: "16px", cursor: isParentChecked ? "pointer" : "not-allowed" }}
                                        />
                                      </td>
                                      <td style={{ fontSize: "0.85rem", color: "#94a3b8", textAlign: "left" }}>
                                        {!isParentChecked && "Bị khóa bởi phân hệ mẹ"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {(success || error) && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          zIndex: 9999,
          pointerEvents: "none"
        }}>
          {success && (
            <div style={{
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              padding: "0.75rem 1.25rem",
              borderRadius: "6px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              pointerEvents: "auto",
              marginBottom: "10px",
              minWidth: "250px"
            }}>
              <span>✅</span>
              <div>{success}</div>
            </div>
          )}
          {error && (
            <div style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              padding: "0.75rem 1.25rem",
              borderRadius: "6px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              pointerEvents: "auto",
              marginBottom: "10px",
              minWidth: "250px"
            }}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
