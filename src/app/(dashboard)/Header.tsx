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
      .then(res => {
        if (!res.ok) {
          // Xoá cookie session trên client side để tránh vòng lặp chuyển hướng của middleware
          document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          window.location.href = "/login";
          throw new Error("Không xác định được người dùng");
        }
        return res.json();
      })
      .then(data => {
        setUserInfo({
          name: data.employeeName || "Người dùng",
          branch: data.branch || "Tất cả chi nhánh"
        });
      })
      .catch(err => {
        console.error("Lỗi xác thực người dùng:", err);
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
    <header className="main-header" style={{ height: "60px", background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 1.5rem", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 900, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          onClick={onToggleSidebar}
          className="mobile-menu-toggle header-icon-btn"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "none",
            padding: "8px",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <MenuIcon size={20} color="#65676b" />
        </button>
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

    </header>
  );
}

