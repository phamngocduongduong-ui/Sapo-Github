"use client";

import React, { useState, useEffect } from "react";
import ApprovalTabs from "../nhan-su/phe-duyet/ApprovalTabs";
import PurchasingApprovalPage from "../purchasing/phe-duyet/page";
import MaintenanceApprovalPage from "../maintenance/phe-duyet/page";
import { CheckCircle2, Users, ShoppingCart, Settings } from "lucide-react";

interface ApprovalCenterTabsProps {
  hasNhanSu: boolean;
  hasMuaHang: boolean;
  hasBaoTri: boolean;
  hrData: {
    pending: any;
    approved: any;
  };
}

export default function ApprovalCenterTabs({
  hasNhanSu,
  hasMuaHang,
  hasBaoTri,
  hrData
}: ApprovalCenterTabsProps) {
  // Determine default tab based on permissions
  const [activeTab, setActiveTab] = useState<"nhan_su" | "mua_hang" | "bao_tri" | null>(null);

  useEffect(() => {
    if (hasNhanSu) setActiveTab("nhan_su");
    else if (hasMuaHang) setActiveTab("mua_hang");
    else if (hasBaoTri) setActiveTab("bao_tri");
  }, [hasNhanSu, hasMuaHang, hasBaoTri]);

  if (activeTab === null) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        <h3>Bạn không được phân quyền xem bất kỳ phân hệ phê duyệt nào.</h3>
        <p>Vui lòng liên hệ quản trị viên để được cấp quyền truy cập.</p>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .approval-center-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.75rem;
        }
        .approval-center-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #003466;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-family: "Segoe UI", sans-serif;
        }
        .center-tab-bar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .center-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #ffffff;
          color: #2b6cb0;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          font-weight: 700;
          font-size: 13px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: "Segoe UI", sans-serif;
        }
        .center-tab-btn:hover {
          background: #eff6ff;
          border-color: #3b82f6;
        }
        .center-tab-btn.active {
          background: #003466;
          color: #ffffff;
          border-color: #003466;
          box-shadow: 0 4px 6px -1px rgba(0, 52, 102, 0.2);
        }
        .tab-content-container {
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />

      <div className="approval-center-header">
        <h1 className="approval-center-title">
          <CheckCircle2 size={22} color="#003466" />
          TRUNG TÂM PHÊ DUYỆT HỆ THỐNG
        </h1>
      </div>

      <div className="center-tab-bar">
        {hasNhanSu && (
          <button
            onClick={() => setActiveTab("nhan_su")}
            className={`center-tab-btn ${activeTab === "nhan_su" ? "active" : ""}`}
          >
            <Users size={16} />
            Phê duyệt Nhân sự
          </button>
        )}
        {hasMuaHang && (
          <button
            onClick={() => setActiveTab("mua_hang")}
            className={`center-tab-btn ${activeTab === "mua_hang" ? "active" : ""}`}
          >
            <ShoppingCart size={16} />
            Phê duyệt Mua hàng
          </button>
        )}
        {hasBaoTri && (
          <button
            onClick={() => setActiveTab("bao_tri")}
            className={`center-tab-btn ${activeTab === "bao_tri" ? "active" : ""}`}
          >
            <Settings size={16} />
            Phê duyệt Bảo trì
          </button>
        )}
      </div>

      <div className="tab-content-container">
        {activeTab === "nhan_su" && hasNhanSu && (
          <ApprovalTabs
            pending={hrData.pending}
            approved={hrData.approved}
            isEmbedded={true}
          />
        )}
        {activeTab === "mua_hang" && hasMuaHang && (
          <PurchasingApprovalPage
            isEmbedded={true}
          />
        )}
        {activeTab === "bao_tri" && hasBaoTri && (
          <MaintenanceApprovalPage
            isEmbedded={true}
          />
        )}
      </div>
    </>
  );
}
