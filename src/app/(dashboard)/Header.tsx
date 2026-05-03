"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { User, LogOut, ChevronDown, Bell, Menu as MenuIcon } from "lucide-react";
import { logout } from "@/app/login/actions";
import { getNotifications, markNotificationAsRead } from "@/app/(dashboard)/nhan-su/tang-giam-luong/actions";

export default function Header({ 
  onMenuClick, 
  isSidebarCollapsed,
  onToggleSidebar 
}: { 
  onMenuClick: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [notifLimit, setNotifLimit] = useState(3);
  const [userInfo, setUserInfo] = useState<{ name: string, branch: string } | null>(null);

  useEffect(() => {
    fetch("/api/user-permissions")
      .then(res => res.json())
      .then(data => {
        setUserInfo({
          name: data.employeeName || "Người dùng",
          branch: data.branch || "Tất cả chi nhánh"
        });
      });
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [notifLimit]);

  async function fetchNotifications() {
    const data = await getNotifications(notifLimit);
    setNotifications(data);
  }

  async function handleMarkRead(id: string) {
    await markNotificationAsRead(id);
    fetchNotifications();
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="main-header">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button 
          onClick={onToggleSidebar}
          className="menu-toggle-btn"
          title={isSidebarCollapsed ? "Mở menu" : "Thu gọn menu"}
        >
          <MenuIcon size={24} color="var(--text-secondary)" />
        </button>
        {!isSidebarCollapsed && <div className="header-logo-mobile">EMS System</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Notifications */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            className="header-icon-btn"
          >
            <Bell size={20} color="#65676b" />
            {unreadCount > 0 && (
              <span className="notif-badge">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-header">
                Thông báo
                <span>{unreadCount} chưa xem</span>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#888", fontSize: "0.9rem" }}>Không có thông báo nào</div>
              ) : (
                <>
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleMarkRead(n.id)}
                      className="notif-item"
                      style={{ background: n.isRead ? "transparent" : "#f0f7ff" }}
                    >
                      <div style={{ fontWeight: n.isRead ? "500" : "bold", fontSize: "0.85rem", marginBottom: "2px" }}>{n.title}</div>
                      <div style={{ fontSize: "0.8rem", color: "#555" }}>{n.message}</div>
                      <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "4px" }}>{new Date(n.createdAt).toLocaleString("vi-VN")}</div>
                    </div>
                  ))}
                  {unreadCount > 3 && notifLimit === 3 && (
                    <button onClick={() => setNotifLimit(20)} className="view-all-notif">
                      Xem tất cả
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div ref={dropdownRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {userInfo && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginRight: "0.25rem" }} className="user-info-hide-mobile">
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1c1e21" }}>{userInfo.name}</span>
              <span style={{ fontSize: "0.75rem", color: "#65676b" }}>{userInfo.branch}</span>
            </div>
          )}
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="header-user-btn"
          >
            <div className="user-avatar-circle">
              <User size={20} />
            </div>
            <ChevronDown size={16} color="#65676b" className="chevron-hide-mobile" />
          </button>

          {dropdownOpen && (
            <div className="user-dropdown">
              <Link href="/profile" onClick={() => setDropdownOpen(false)} className="dropdown-item">Hồ sơ cá nhân</Link>
              <Link href="/nhan-su/nghi-phep" onClick={() => setDropdownOpen(false)} className="dropdown-item">Nghỉ phép</Link>
              <Link href="/nhan-su/nghi-viec" onClick={() => setDropdownOpen(false)} className="dropdown-item">Nghỉ việc</Link>
              <Link href="/nhan-su/tra-cuu-luong" onClick={() => setDropdownOpen(false)} className="dropdown-item">Tra cứu lương</Link>
            </div>
          )}
        </div>

        <div style={{ marginLeft: "0.5rem", borderLeft: "1px solid #eee", paddingLeft: "0.5rem" }}>
          <form action={logout}>
            <button type="submit" className="header-icon-btn" title="Đăng xuất" style={{ color: "#e74c3c" }}>
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .main-header {
          height: 60px;
          background: #fff;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          position: relative;
          z-index: 100;
        }
        .header-logo-mobile {
          display: block;
          font-weight: 700;
          color: var(--primary-color);
          font-size: 1.1rem;
        }
        .menu-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .menu-toggle-btn:hover {
          background: #f0f2f5;
        }
        .header-icon-btn, .header-user-btn {
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          cursor: pointer;
        }
        .header-icon-btn:hover, .header-user-btn:hover { background: #f0f2f5; }
        .notif-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #e74c3c;
          color: #fff;
          font-size: 10px;
          font-weight: bold;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
        }
        .notif-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border: 1px solid #eee;
          max-height: 450px;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .notif-header { padding: 0.75rem 1rem; font-weight: bold; border-bottom: 1px solid #eee; margin-bottom: 0.5rem; display: flex; justify-content: space-between; }
        .notif-item { padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; margin-bottom: 4px; transition: background 0.2s; }
        .notif-item:hover { background: #f8f9fa; }
        .user-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 220px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
          border: 1px solid #edf2f7;
          padding: 0.4rem;
          display: flex;
          flex-direction: column;
        }
        .dropdown-item { 
          padding: 0.7rem 1rem; 
          border-radius: 8px; 
          color: #2c3e50; 
          font-size: 0.9rem; 
          display: block; 
          transition: all 0.2s; 
          text-decoration: none; 
          margin-bottom: 2px;
          border-bottom: 1px solid transparent;
        }
        .dropdown-item:not(:last-child) {
          border-bottom: 1px solid #f7fafc;
        }
        .dropdown-item:hover { 
          background: #f1f5f9; 
          color: var(--primary-color);
        }

        .logout-btn { width: 100%; border: none; background: none; color: #e74c3c; cursor: pointer; }
        .user-avatar-circle { width: 36px; height: 36px; border-radius: 50%; background: #f0f2f5; display: flex; align-items: center; justify-content: center; color: #65676b; }
        
        @media (max-width: 1024px) {
          .header-logo-mobile { display: block; }
        }
        @media (max-width: 640px) {
          .notif-dropdown { width: calc(100vw - 2rem); right: -60px; }
          .chevron-hide-mobile, .user-info-hide-mobile { display: none; }
        }
      `}</style>
    </header>
  );
}
