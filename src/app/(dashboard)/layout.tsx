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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="app-container">
      {/* Overlay for sidebar */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? "show" : ""}`} 
        onClick={() => setIsSidebarOpen(false)}
      />
      
      <Sidebar 
        isCollapsed={!isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="main-wrapper">
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)} 
          isSidebarCollapsed={!isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
