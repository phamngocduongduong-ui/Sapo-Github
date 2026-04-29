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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <div className="app-container">
      {/* Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? "show" : ""}`} 
        onClick={() => setIsMobileOpen(false)}
      />
      
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        onClose={() => setIsMobileOpen(false)} 
      />
      
      <div className="main-wrapper">
        <Header onMenuClick={() => setIsMobileOpen(true)} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
