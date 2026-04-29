"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { User, LogOut, ChevronDown, Bell, Menu as MenuIcon } from "lucide-react";
import { logout } from "@/app/login/actions";
import { getNotifications, markNotificationAsRead } from "@/app/(dashboard)/nhan-su/tang-giam-luong/actions";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [notifLimit, setNotifLimit] = useState(3);

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
          onClick={onMenuClick}
          className="mobile-menu-btn"
        >
          <MenuIcon size={24} />
        </button>
        <div className="header-logo-mobile">EMS System</div>
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

        <div ref={dropdownRef} style={{ position: "relative" }}>
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
              <Link href="/profile?tab=1" onClick={() => setDropdownOpen(false)} className="dropdown-item">👤 Hồ sơ cá nhân</Link>
              <Link href="/profile?tab=2" onClick={() => setDropdownOpen(false)} className="dropdown-item">🏖️ Đề xuất nghỉ phép</Link>
              <Link href="/nhan-su/tra-cuu-luong" onClick={() => setDropdownOpen(false)} className="dropdown-item">🔍 Tra cứu lương</Link>
              <hr style={{ margin: "0.5rem 0", border: "none", borderTop: "1px solid #eee" }} />
              <form action={logout}>
                <button type="submit" className="dropdown-item logout-btn">
                  <LogOut size={16} /> Đăng xuất
                </button>
              </form>
            </div>
          )}
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
          display: none;
          font-weight: 700;
          color: var(--primary-color);
        }
        .mobile-menu-btn {
          display: none;
          padding: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
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
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border: 1px solid #eee;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
        }
        .dropdown-item { padding: 0.75rem 1rem; border-radius: 8px; color: #2c3e50; font-size: 0.9rem; display: flex; align-items: center; gap: 0.75rem; transition: background 0.2s; }
        .dropdown-item:hover { background: #f8f9fa; }
        .logout-btn { width: 100%; border: none; background: none; color: #e74c3c; cursor: pointer; }
        .user-avatar-circle { width: 36px; height: 36px; border-radius: 50%; background: #f0f2f5; display: flex; align-items: center; justify-content: center; color: #65676b; }
        
        @media (max-width: 1024px) {
          .mobile-menu-btn { display: block; }
          .header-logo-mobile { display: block; }
        }
        @media (max-width: 640px) {
          .notif-dropdown { width: calc(100vw - 2rem); right: -60px; }
          .chevron-hide-mobile { display: none; }
        }
      `}</style>
    </header>
  );
}
