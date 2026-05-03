"use client";

import React, { useState, useTransition, useEffect } from "react";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { saveCategoryPermissions, getCategoryPermissions } from "./actions";

const MODULES = [
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
    ]
  },
  {
    key: "NHAN_SU",
    label: "👥 Nhân sự",
    children: [
      { key: "NS_NHAN_VIEN", label: "Nhân viên" },
      { key: "NS_HOP_DONG", label: "Hợp đồng lao động" },
      { key: "NS_NGHI_PHEP", label: "Nghỉ phép" },
      { key: "NS_CHAM_CONG", label: "Chấm công" },
      { key: "NS_BANG_LUONG", label: "Bảng lương" },
      { key: "NS_TRA_CUU_LUONG", label: "Tra cứu lương" },
      { key: "NS_TANG_GIAM_LUONG", label: "Tăng/Giảm lương" },
      { key: "NS_DIEU_DONG", label: "Thuyên chuyển, Bổ nhiệm" },
      { key: "NS_BAC_LUONG", label: "Bậc lương" },
      { key: "NS_NGHI_VIEC", label: "Nghỉ việc" },
      { key: "NS_APPROVE", label: "Phê duyệt" },
    ]
  },
  {
    key: "KINH_DOANH",
    label: "💰 Kinh doanh",
    children: [
      { key: "KD_DON_HANG", label: "Đơn hàng" },
    ]
  },
  {
    key: "THU_MUA",
    label: "🛒 Mua hàng",
    children: [
      { key: "TM_KE_HOACH", label: "Kế hoạch Thu mua" },
      { key: "TM_LENH_MUA", label: "Lệnh mua" },
      { key: "TM_DON_MUA", label: "Đơn mua" },
      { key: "TM_DIEU_DONG", label: "Lệnh điều động" },
      { key: "TM_BAO_CAO", label: "Báo cáo" },
    ]
  },
  {
    key: "SAN_XUAT",
    label: "🏗️ Sản xuất",
    children: [
      { key: "SX_VAT_TU", label: "Kế hoạch vật tư" },
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
  }
];


export default function PermissionAssignment({ categories }: { categories: any[] }) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (selectedCategoryId) {
      loadPermissions(selectedCategoryId);
    } else {
      setPermissions({});
    }
  }, [selectedCategoryId]);

  async function loadPermissions(permissionId: string) {
    const data = await getCategoryPermissions(permissionId);
    const permMap: Record<string, boolean> = {};
    data.forEach(p => {
      permMap[p.moduleKey] = p.canAccess;
    });
    setPermissions(permMap);
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
        alert("Đã lưu phân quyền thành công cho mục quyền!");
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <label className="filter-label" style={{ marginBottom: "0.5rem", display: "block" }}>🛡️ Chọn Mục quyền để phân quyền</label>
        <select 
          className="input" 
          style={{ maxWidth: "400px" }}
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="">-- Chọn mục quyền --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
          ))}
        </select>
      </div>

      {selectedCategoryId && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0 }}>📋 Chi tiết phân quyền cho mục quyền</h3>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-outline" onClick={() => {
                const allPerms: Record<string, boolean> = {};
                MODULES.forEach(m => {
                  allPerms[m.key] = true;
                  m.children.forEach(c => {
                    allPerms[c.key] = true;
                  });
                });
                setPermissions(allPerms);
              }}>
                ✅ Chọn tất cả
              </button>
              <button className="btn btn-outline" onClick={() => router.refresh()}>
                <RotateCcw size={18} style={{ marginRight: "6px" }} /> Làm mới
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isPending}>
                {isPending ? "Đang lưu..." : "💾 Lưu phân quyền"}
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "300px" }}>Phân hệ</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Truy cập</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
                  <tbody>
                    {MODULES.map(parent => {
                      const isParentChecked = permissions[parent.key] || false;
                      const rows = [
                        <tr key={`parent-${parent.key}`} style={{ background: "#f8fafc" }}>
                          <td style={{ fontWeight: "700", color: "var(--primary-color)" }}>
                            <label htmlFor={`parent-${parent.key}`} style={{ cursor: "pointer", display: "block", width: "100%" }}>
                              {parent.label}
                            </label>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input 
                              id={`parent-${parent.key}`}
                              type="checkbox" 
                              checked={isParentChecked}
                              onChange={(e) => handleParentToggle(parent.key, e.target.checked)}
                              style={{ width: "20px", height: "20px", cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ fontSize: "0.85rem", color: "#64748b" }}>Phân hệ mẹ</td>
                        </tr>
                      ];

                      parent.children.forEach(child => {
                        rows.push(
                          <tr key={`child-${child.key}`} style={{ opacity: isParentChecked ? 1 : 0.6 }}>
                            <td style={{ paddingLeft: "2.5rem" }}>
                              <label htmlFor={`child-${child.key}`} style={{ cursor: isParentChecked ? "pointer" : "not-allowed", display: "block", width: "100%" }}>
                                {child.label}
                              </label>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <input 
                                id={`child-${child.key}`}
                                type="checkbox" 
                                checked={permissions[child.key] || false}
                                disabled={!isParentChecked}
                                onChange={(e) => handleChildToggle(child.key, e.target.checked)}
                                style={{ width: "18px", height: "18px", cursor: isParentChecked ? "pointer" : "not-allowed" }}
                              />
                            </td>
                            <td style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                              {!isParentChecked && "Bị khóa bởi phân hệ mẹ"}
                            </td>
                          </tr>
                        );
                      });
                      return rows;
                    })}
                  </tbody>



            </table>
          </div>
        </div>
      )}
      <style>{`
        .filter-label { font-size: 0.9rem; font-weight: 600; color: #64748b; }
      `}</style>
    </div>
  );
}
