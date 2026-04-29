"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { User, LogOut, ChevronDown, Bell } from "lucide-react";
import { logout } from "@/app/login/actions";
import { getNotifications, markNotificationAsRead } from "@/app/(dashboard)/nhan-su/tang-giam-luong/actions";

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [notifLimit, setNotifLimit] = useState(3);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s for 'immediate' feel
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
    <header style={{
      height: "60px",
      background: "#fff",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      padding: "0 2rem",
      position: "relative",
      zIndex: 100,
      gap: "1rem"
    }}>
      {/* Notifications */}
      <div ref={notifRef} style={{ position: "relative" }}>
        <button 
          onClick={() => setNotifOpen(!notifOpen)}
          style={{
            position: "relative",
            padding: "0.5rem",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
          className="header-icon-btn"
        >
          <Bell size={20} color="#65676b" />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              background: "#e74c3c",
              color: "#fff",
              fontSize: "10px",
              fontWeight: "bold",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fff"
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "320px",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            border: "1px solid #eee",
            maxHeight: "450px",
            overflowY: "auto",
            padding: "0.5rem"
          }}>
            <div style={{ padding: "0.75rem 1rem", fontWeight: "bold", borderBottom: "1px solid #eee", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between" }}>
              Thông báo
              <span style={{ fontSize: "0.8rem", color: "#666", fontWeight: "normal" }}>{unreadCount} chưa xem</span>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888", fontSize: "0.9rem" }}>Không có thông báo nào</div>
            ) : (
              <>
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleMarkRead(n.id)}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: n.isRead ? "transparent" : "#f0f7ff",
                      cursor: "pointer",
                      marginBottom: "4px",
                      transition: "background 0.2s"
                    }}
                    className="notif-item"
                  >
                    <div style={{ fontWeight: n.isRead ? "500" : "bold", fontSize: "0.85rem", marginBottom: "2px" }}>{n.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "#555" }}>{n.message}</div>
                    <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "4px" }}>{new Date(n.createdAt).toLocaleString("vi-VN")}</div>
                  </div>
                ))}
                {unreadCount > 3 && notifLimit === 3 && (
                  <button 
                    onClick={() => setNotifLimit(20)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "none",
                      background: "none",
                      color: "#3498db",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      borderTop: "1px solid #eee",
                      marginTop: "0.5rem"
                    }}
                  >
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.5rem",
            borderRadius: "8px",
            transition: "background 0.2s"
          }}
          className="header-user-btn"
        >
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#f0f2f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#65676b"
          }}>
            <User size={20} />
          </div>
          <ChevronDown size={16} color="#65676b" />
        </button>

        {dropdownOpen && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "220px",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            border: "1px solid #eee",
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}>
            <Link 
              href="/profile?tab=1" 
              onClick={() => setDropdownOpen(false)}
              className="dropdown-item"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                color: "#2c3e50",
                textDecoration: "none",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                transition: "background 0.2s"
              }}
            >
              👤 Thông tin cá nhân
            </Link>
            <Link 
              href="/profile?tab=2" 
              onClick={() => setDropdownOpen(false)}
              className="dropdown-item"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                color: "#2c3e50",
                textDecoration: "none",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                transition: "background 0.2s"
              }}
            >
              🏖️ Đề xuất nghỉ phép
            </Link>
            <Link 
              href="/nhan-su/tra-cuu-luong" 
              onClick={() => setDropdownOpen(false)}
              className="dropdown-item"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                color: "#2c3e50",
                textDecoration: "none",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                transition: "background 0.2s"
              }}
            >
              🔍 Tra cứu lương
            </Link>
            <Link 
              href="/profile?tab=3" 
              onClick={() => setDropdownOpen(false)}
              className="dropdown-item"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                color: "#2c3e50",
                textDecoration: "none",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                transition: "background 0.2s"
              }}
            >
              💰 Đề xuất tăng lương
            </Link>
            <hr style={{ margin: "0.5rem 0", border: "none", borderTop: "1px solid #eee" }} />
            <form action={logout}>
              <button 
                type="submit"
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  color: "#e74c3c",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                className="dropdown-item"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .header-user-btn:hover, .header-icon-btn:hover {
          background: #f0f2f5;
        }
        .dropdown-item:hover, .notif-item:hover {
          background: #f8f9fa;
        }
      `}</style>
    </header>
  );
}
