"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { User, LogOut, ChevronDown, Bell, Menu as MenuIcon } from "lucide-react";
import { logout, changeActiveBranch } from "@/app/login/actions";
import { getNotifications, markNotificationAsRead } from "@/app/(dashboard)/nhan-su/tang-giam-luong/actions";

const isArrayEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

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
  const mobileBranchRef = useRef<HTMLDivElement>(null);

  const [notifLimit, setNotifLimit] = useState(3);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    branch: string;
    allowedBranches: string[];
    permissions: string[];
    isAdmin: boolean;
    role: string;
  } | null>(null);
  const [branchSelectorOpen, setBranchSelectorOpen] = useState(false);
  const [showAuthChangedModal, setShowAuthChangedModal] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchUserPermissions = () => {
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
          if (!active) return;
          const newBranch = data.branch || "Tất cả chi nhánh";
          const newAllowedBranches = data.allowedBranches || [];
          const newPermissions = data.permissions || [];
          
          setUserInfo(prev => {
            if (prev) {
              const isBranchesEqual = isArrayEqual(prev.allowedBranches, newAllowedBranches);
              const isPermissionsEqual = isArrayEqual(prev.permissions, newPermissions);
              const isAdminEqual = prev.isAdmin === !!data.isAdmin;
              const isRoleEqual = prev.role === (data.role || "");
              
              if (!isBranchesEqual || !isPermissionsEqual || !isAdminEqual || !isRoleEqual) {
                setShowAuthChangedModal(true);
                return prev;
              }

              // If the active branch has changed after the initial load, trigger page reload
              if (prev.branch !== newBranch) {
                window.location.reload();
              }
            }
            return {
              name: data.employeeName || "Người dùng",
              branch: newBranch,
              allowedBranches: newAllowedBranches,
              permissions: newPermissions,
              isAdmin: !!data.isAdmin,
              role: data.role || ""
            };
          });
        })
        .catch(err => {
          console.error("Lỗi xác thực người dùng:", err);
        });
    };

    fetchUserPermissions();
    const interval = setInterval(fetchUserPermissions, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
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
    function handleClickOutside(event: Event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(event.target as Node);
      const isOutsideMobileBranch = !mobileBranchRef.current || !mobileBranchRef.current.contains(event.target as Node);
      if (isOutsideDropdown && isOutsideMobileBranch) {
        setBranchSelectorOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="login-header" style={{
      height: "140px",
      backgroundImage: "linear-gradient(rgba(0, 52, 102, 0.6), rgba(0, 52, 102, 0.6)), url('/images/login_banner.png?v=2')",
      backgroundSize: "100% 100%",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      color: "white",
      borderBottom: "4px solid #ff5c00",
      width: "100%",
      margin: 0,
      zIndex: showAuthChangedModal ? 1000000 : 1010
    }}>

      {/* Header Left: Sapo Logo & Title */}
      <div className="header-left">
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
            justifyContent: "center",
            marginRight: "8px"
          }}
        >
          <MenuIcon size={24} color="white" />
        </button>
        <img src="/images/sapo_logo.png" alt="Sapo Logo" className="logo-img" />
        <div className="header-titles">
          <h1>HỆ THỐNG QUẢN LÝ SAPO GROUP</h1>
          <p>Chào mừng bạn đến với hệ thống quản lý doanh nghiệp</p>
        </div>
      </div>

      {/* Header Right: Slogan & User utilities */}
      <div className="header-right">
        {/* Row 1: Actions */}
        <div className="header-actions-row" style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Mobile Branch Switcher */}
          {userInfo && (
            <div ref={mobileBranchRef} className="mobile-branch-switcher" style={{ position: "relative" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (userInfo.allowedBranches && userInfo.allowedBranches.length >= 1) {
                    setBranchSelectorOpen(!branchSelectorOpen);
                    setDropdownOpen(false);
                  }
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  color: "white",
                  cursor: userInfo.allowedBranches && userInfo.allowedBranches.length >= 1 ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontWeight: 600,
                  whiteSpace: "nowrap"
                }}
              >
                <span style={{
                  maxWidth: "90px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block"
                }}>
                  {userInfo.branch}
                </span>
                {userInfo.allowedBranches && userInfo.allowedBranches.length >= 1 && "▼"}
              </button>

              {branchSelectorOpen && userInfo.allowedBranches && userInfo.allowedBranches.length >= 1 && (
                <div 
                  className="branch-selector-dropdown-mobile"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "32px",
                    right: "0",
                    backgroundColor: "white",
                    color: "#333",
                    borderRadius: "6px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    border: "1px solid #cbd5e1",
                    padding: "6px 0",
                    zIndex: 10000,
                    minWidth: "160px",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <div style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 700, color: "#003466", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>
                    Chọn chi nhánh
                  </div>
                  {userInfo.allowedBranches.map((branchName) => (
                    <button
                      key={branchName}
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await changeActiveBranch(branchName);
                          if (res && res.success) {
                            window.location.reload();
                          } else {
                            setBranchSelectorOpen(false);
                            alert(res?.error || "Có lỗi xảy ra");
                          }
                        } catch (e) {
                          setBranchSelectorOpen(false);
                          console.error(e);
                          alert("Có lỗi xảy ra");
                        }
                      }}
                      style={{
                        padding: "8px 12px",
                        fontSize: "12px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        width: "100%",
                        color: branchName === userInfo.branch ? "#ff5c00" : "#334155",
                        fontWeight: branchName === userInfo.branch ? 700 : 500,
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      {branchName} {branchName === userInfo.branch && "✓"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="header-icon-btn"
            >
              <Bell size={22} color="white" />
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

          {/* User profile details & Avatar */}
          <div ref={dropdownRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {userInfo && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }} className="user-info-hide-mobile">
                <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "white" }}>{userInfo.name}</span>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (userInfo.allowedBranches && userInfo.allowedBranches.length >= 1) {
                      setBranchSelectorOpen(!branchSelectorOpen);
                      setDropdownOpen(false);
                    }
                  }}
                  style={{ 
                    fontSize: "0.75rem", 
                    color: "#cbd5e1", 
                    cursor: userInfo.allowedBranches && userInfo.allowedBranches.length >= 1 ? "pointer" : "default",
                    textDecoration: userInfo.allowedBranches && userInfo.allowedBranches.length >= 1 ? "underline" : "none",
                    userSelect: "none"
                  }}
                  title={userInfo.allowedBranches && userInfo.allowedBranches.length >= 1 ? "Click để đổi chi nhánh nhanh" : undefined}
                >
                  {userInfo.branch} {userInfo.allowedBranches && userInfo.allowedBranches.length >= 1 && "▼"}
                </span>
              </div>
            )}
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setBranchSelectorOpen(false);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "white", color: "#003466", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                <User size={20} color="#003466" />
              </div>
              <ChevronDown size={16} color="white" />
            </button>

             {branchSelectorOpen && userInfo?.allowedBranches && (
              <div 
                className="branch-selector-dropdown"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: "40px",
                  right: "50px",
                  backgroundColor: "white",
                  color: "#333",
                  borderRadius: "6px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  border: "1px solid #cbd5e1",
                  padding: "6px 0",
                  zIndex: 10000,
                  minWidth: "160px",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 700, color: "#003466", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>
                  Chọn chi nhánh
                </div>
                {userInfo.allowedBranches.map((branchName) => (
                  <button
                    key={branchName}
                     onClick={async () => {
                       try {
                         const res = await changeActiveBranch(branchName);
                         if (res && res.success) {
                           window.location.reload();
                         } else {
                           setBranchSelectorOpen(false);
                           alert(res?.error || "Có lỗi xảy ra");
                         }
                       } catch (e) {
                         setBranchSelectorOpen(false);
                         console.error(e);
                         alert("Có lỗi xảy ra");
                       }
                     }}
                    style={{
                      padding: "8px 12px",
                      fontSize: "12px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                      color: branchName === userInfo.branch ? "#ff5c00" : "#334155",
                      fontWeight: branchName === userInfo.branch ? 700 : 500,
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    {branchName} {branchName === userInfo.branch && "✓"}
                  </button>
                ))}
              </div>
            )}

            {dropdownOpen && (
              <div className="user-dropdown">
                <Link href="/ca-nhan/ho-so" onClick={() => setDropdownOpen(false)} className="dropdown-item">Hồ sơ cá nhân</Link>
                <Link href="/ca-nhan/cham-cong" onClick={() => setDropdownOpen(false)} className="dropdown-item">Chấm công</Link>
                <Link href="/ca-nhan/nghi-phep" onClick={() => setDropdownOpen(false)} className="dropdown-item">Nghỉ phép</Link>
                <Link href="/ca-nhan/nghi-viec" onClick={() => setDropdownOpen(false)} className="dropdown-item">Nghỉ việc</Link>
                <Link href="/ca-nhan/tra-cuu-luong" onClick={() => setDropdownOpen(false)} className="dropdown-item">Tra cứu lương</Link>
              </div>
            )}
          </div>

          {/* Logout separator and button */}
          <div style={{ marginLeft: "0.5rem", borderLeft: "1px solid rgba(255, 255, 255, 0.3)", paddingLeft: "0.75rem" }}>
            <form action={logout}>
              <button type="submit" className="header-icon-btn" title="Đăng xuất" style={{ color: "#ff5c00" }}>
                <LogOut size={22} color="#ff5c00" />
              </button>
            </form>
          </div>
        </div>
      </div>
      {showAuthChangedModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            width: "100%",
            maxWidth: "440px",
            padding: "2rem",
            textAlign: "center",
            borderTop: "6px solid #ff5c00",
            animation: "modalFadeIn 0.3s ease-out"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#fff7ed",
              color: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: "1.75rem"
            }}>
              ⚠️
            </div>
            
            <h2 style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: "0.75rem",
              textTransform: "uppercase"
            }}>
              Cập nhật quyền truy cập
            </h2>
            
            <p style={{
              fontSize: "14px",
              color: "#475569",
              lineHeight: "1.6",
              marginBottom: "1.75rem"
            }}>
              Tài khoản của bạn vừa có thay đổi về <strong>chi nhánh</strong> hoặc <strong>quyền truy cập</strong> hệ thống từ Quản trị viên. 
              Vui lòng đăng nhập lại để áp dụng cài đặt mới.
            </p>
            
            <button
              onClick={async () => {
                try {
                  document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                  await logout();
                } catch (err) {
                  window.location.href = "/login";
                }
              }}
              style={{
                width: "100%",
                padding: "10px 20px",
                backgroundColor: "#003466",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                transition: "background-color 0.2s, transform 0.1s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#002244"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#003466"}
            >
              Đồng ý
            </button>
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
            `
          }} />
        </div>
      )}
    </header>
  );
}

