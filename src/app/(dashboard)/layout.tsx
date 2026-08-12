"use client";

import { useState, useEffect, Suspense } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import DeployedDocumentModal from "./DeployedDocumentModal";
import { usePathname, useSearchParams } from "next/navigation";

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get("embedded") === "true";
  const isMobileView = pathname === "/mobile";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      if (isMobileDevice && pathname !== "/mobile" && !isEmbedded) {
        window.location.replace("/mobile");
      }
    }
  }, [pathname, isEmbedded]);

  if (isMobileView || isEmbedded) {
    return (
      <div style={{ minHeight: "100vh", background: "#ffffff", padding: 0, margin: 0 }}>
        <main style={{ minHeight: "100vh", padding: 0, margin: 0 }}>
          {children}
        </main>
      </div>
    );
  }

  // Chặn không cho render giao diện Desktop nếu thiết bị là Mobile (tránh giật lag hay hiện trang cũ)
  if (typeof window !== "undefined") {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobileDevice && pathname !== "/mobile" && !isEmbedded) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f9ff" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", border: "2.5px solid #0284c7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#475569" }}>Đang tải giao diện di động...</div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="app-container" style={{ display: "flex", width: "100%", minHeight: "100vh", position: "relative" }}>
      <DeployedDocumentModal />
      {/* Header Banner */}
      <Header 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarCollapsed={!isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Mobile drawer backdrop */}
      <div 
        className="mobile-overlay" 
        onClick={() => setIsSidebarOpen(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.4)",
          display: isSidebarOpen ? "block" : "none"
        }}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="main-wrapper" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f8fafc" }}>
        <main className="main-content" style={{ flex: 1, paddingTop: "140px", paddingBottom: "46px", overflow: "visible" }}>
          {children}
        </main>
        
        <footer style={{
          textAlign: "center",
          color: "#64748b",
          fontSize: "12px",
          fontWeight: 500,
          borderTop: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "36px",
          zIndex: 1040,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          Copyright © 2026 - Sapo Group Management System. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#ffffff", padding: 0, margin: 0 }}>
        <main style={{ minHeight: "100vh", padding: 0, margin: 0 }}>
          {children}
        </main>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
