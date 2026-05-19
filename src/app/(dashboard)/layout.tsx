"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { usePathname } from "next/navigation";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      <style jsx global>{`
        @media (min-width: 769px) {
          .sidebar-aside {
            transform: none !important;
            display: flex !important;
          }
          .main-wrapper {
            margin-left: 180px !important;
            width: calc(100% - 180px) !important;
          }
          .mobile-menu-toggle {
            display: none !important;
          }
          .mobile-close-btn {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .sidebar-aside {
            transform: ${isSidebarOpen ? "translateX(0)" : "translateX(-180px)"} !important;
            transition: transform 0.3s ease !important;
            display: flex !important;
          }
          .main-wrapper {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .mobile-menu-toggle {
            display: flex !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
          .mobile-overlay {
            display: ${isSidebarOpen ? "block" : "none"} !important;
          }
        }
      `}</style>

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
          zIndex: 1040,
          display: "none"
        }}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="main-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", marginLeft: "180px", background: "#f8fafc", width: "calc(100% - 180px)" }}>
        <Header 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarCollapsed={!isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="main-content" style={{ flex: 1, padding: "10px", overflow: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
