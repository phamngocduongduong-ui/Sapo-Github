"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import DeployedDocumentModal from "./DeployedDocumentModal";
import { usePathname } from "next/navigation";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

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
