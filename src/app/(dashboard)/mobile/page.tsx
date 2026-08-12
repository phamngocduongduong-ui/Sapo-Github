"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  User, Calendar, LogOut, FileText, CheckCircle2, 
  Users, ShoppingBag, CreditCard, DollarSign, ShoppingCart, 
  ClipboardList, Bell, Shield, ArrowRight, CheckCheck, Clock,
  ChevronRight, Smartphone, RefreshCw, UserCheck, AlertCircle, ArrowLeft, Volume2,
  Sparkles, QrCode, Building2, Gift, CreditCard as CardIcon, Heart, Shirt, LogOut as LeaveIcon,
  Package, Palmtree, Fingerprint, Award, BarChart3, PackagePlus, FileSpreadsheet, Store, ChevronDown,
  UserX, ShieldAlert, Lock, Search, ChevronLeft
} from "lucide-react";
import { logout as handleLogoutServer } from "@/app/login/actions";

export default function MobileAppPortal() {
  const [userInfo, setUserInfo] = useState<{ name: string; code: string; department: string; role: string } | null>(null);
  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [allowedBranches, setAllowedBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [pendingCounts, setPendingCounts] = useState<{ total: number; proposal: number; leave: number; contract: number }>({
    total: 0,
    proposal: 0,
    leave: 0,
    contract: 0
  });
  const [recentPendingItems, setRecentPendingItems] = useState<any[]>([]);
  const [activeSubView, setActiveSubView] = useState<{ title: string; href: string } | null>(null);
  
  // Real-time Push Notification & Modal States
  const [latestToast, setLatestToast] = useState<any | null>(null);
  const [popupAlert, setPopupAlert] = useState<{ message: string; actionText?: string; onConfirm?: () => void } | null>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const prevPermsRef = useRef<string | null>(null);

  const router = useRouter();

  function playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTing = (freq: number, startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      };

      const now = ctx.currentTime;
      playTing(987.77, now);
      playTing(1318.51, now + 0.16);
      playTing(987.77, now + 0.5);
      playTing(1318.51, now + 0.66);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }

  useEffect(() => {
    async function initMobilePortal() {
      try {
        const res = await fetch("/api/user-permissions?t=" + Date.now(), { cache: "no-store" });
        if (res.status === 401) {
          window.location.replace("/api/logout?reason=inactive");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setUserPerms(data.permissions || []);
          if (data.permHash) {
            prevPermsRef.current = data.permHash;
          }
          setIsAdmin(data.isAdmin || false);
          setAllowedBranches(data.allowedBranches || [data.branch]);
          setCurrentBranch(data.branch || "SAPO HỒ CHÍ MINH");
          setUserInfo({
            name: data.employeeName || data.username || "Phạm Ngọc Dương",
            code: data.username || "NV-001",
            department: data.branch || "VP. SAPO HỒ CHÍ MINH",
            role: data.role || "Quản lý"
          });
        }
      } catch (e) {
        console.error("Mobile Portal Init Error:", e);
      } finally {
        setLoading(false);
      }
    }
    initMobilePortal();
  }, []);

  // Poll for notifications and pending count every 6 seconds
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

    async function checkMobileNotifications() {
      try {
        const res = await fetch(`/api/mobile/notifications?branch=${encodeURIComponent(currentBranch)}&t=` + Date.now(), { cache: "no-store" });
        if (res.status === 401) {
          window.location.replace("/api/logout?reason=inactive");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.pendingCount !== undefined) {
            setPendingApprovalsCount(data.pendingCount);
            setPendingCounts({
              total: data.pendingCount || 0,
              proposal: data.proposalCount || 0,
              leave: data.leaveCount || 0,
              contract: data.contractCount || 0
            });
          }
          if (data.recentPendingItems) {
            setRecentPendingItems(data.recentPendingItems);
          }

          // Kiểm tra phân quyền: Nếu permHash của người dùng này bị Admin thay đổi -> Đăng xuất ngay lập tức!
          if (data.permHash) {
            if (prevPermsRef.current !== null && prevPermsRef.current !== data.permHash) {
              window.location.replace("/api/logout?reason=perm_changed");
              return;
            }
            prevPermsRef.current = data.permHash;
          }

          if (data.notifications && data.notifications.length > 0) {
            const newest = data.notifications[0];
            const isDismissedInStorage = typeof window !== "undefined" && localStorage.getItem(`dismissed_notif_${newest.id}`);

            if (!seenNotifIdsRef.current.has(newest.id) && !isDismissedInStorage) {
              seenNotifIdsRef.current.add(newest.id);
              setLatestToast(newest);
              playNotificationSound();

              // Gửi thông báo trực tiếp ra màn hình khóa/màn hình chính điện thoại (Chỉ hiện 1 lần duy nhất)
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                try {
                  const notifTitle = newest.title || "Phê duyệt nhu cầu mua hàng";
                  const notifOptions = {
                    body: newest.message || "Có đề nghị nhu cầu mua hàng mới cần bạn phê duyệt.",
                    icon: "/images/sapo_logo.png",
                    badge: "/images/sapo_logo.png",
                    vibrate: [200, 100, 200],
                    tag: `notif_approval_${newest.id}`, // Tag duy nhất để đảm bảo chỉ hiện 1 lần, không lặp lại
                    renotify: false,
                    data: { url: newest.link || "/phe-duyet/de-nghi-mua-hang" }
                  };

                  if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
                    navigator.serviceWorker.ready.then(reg => {
                      reg.showNotification(notifTitle, notifOptions);
                    }).catch(() => {
                      new Notification(notifTitle, notifOptions);
                    });
                  } else {
                    new Notification(notifTitle, notifOptions);
                  }
                } catch (err) {
                  console.warn("Device notification error:", err);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error polling notifications:", e);
      }
    }

    checkMobileNotifications();
    const interval = setInterval(checkMobileNotifications, 6000);
    return () => clearInterval(interval);
  }, []);

  // Handle branch change selection
  async function handleBranchChange(newBranch: string) {
    setCurrentBranch(newBranch);
    try {
      await fetch("/api/user-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeBranch: newBranch })
      });
      window.location.reload();
    } catch (err) {
      console.error("Branch change error:", err);
    }
  }

  // Dynamic Module Definition (Rendered ONLY if user has permission)
  const categoryModules = [
    {
      id: "personal",
      title: "Cá nhân",
      items: [
        { title: "Hồ sơ", perm: "NS_HO_SO", href: "/ca-nhan/ho-so", bg: "#eff6ff", color: "#3b82f6", icon: <User size={22} /> },
        { title: "Chấm công", perm: "NS_CHAM_CONG", href: "/ca-nhan/cham-cong", bg: "#fff7ed", color: "#f97316", icon: <Fingerprint size={22} /> },
        { title: "Nghỉ phép", perm: "NS_NGHI_PHEP", href: "/ca-nhan/nghi-phep", bg: "#ecfdf5", color: "#059669", icon: <Palmtree size={22} /> },
        { title: "Phiếu lương", perm: "NS_LUONG", href: "/ca-nhan/tra-cuu-luong", bg: "#ecfdf5", color: "#10b981", icon: <CardIcon size={22} /> },
        { title: "Nghỉ việc", perm: "NS_NGHI_VIEC", href: "/ca-nhan/dang-ky-nghi-viec", bg: "#fff1f2", color: "#f43f5e", icon: <LeaveIcon size={22} /> },
      ]
    },
    {
      id: "approvals",
      title: "Phê duyệt",
      badgeCount: pendingCounts.total,
      badgeText: "đề nghị chờ duyệt",
      badgeBg: "#fff7ed",
      badgeColor: "#ea580c",
      items: [
        { title: "Phê duyệt nhu cầu mua", perm: "PD_DE_NGHI_MH", href: "/phe-duyet/de-nghi-mua-hang", bg: "#eff6ff", color: "#2563eb", icon: <ShoppingBag size={22} />, itemBadge: pendingCounts.proposal },
        { title: "Phê duyệt nhân sự", perm: "PD_NHAN_SU", href: "/phe-duyet/nhan-su", bg: "#ecfdf5", color: "#059669", icon: <Users size={22} />, itemBadge: pendingCounts.leave },
        { title: "Hợp đồng lao động", perm: "PD_HOP_DONG_LD", href: "/phe-duyet/hop-dong-lao-dong", bg: "#fef3c7", color: "#d97706", icon: <FileText size={22} /> },
        { title: "Hợp đồng bán hàng", perm: "PD_HOP_DONG_BH", href: "/phe-duyet/hop-dong-ban-hang", bg: "#e0f2fe", color: "#0284c7", icon: <ClipboardList size={22} />, itemBadge: pendingCounts.contract },
        { title: "Bảng lương & thưởng", perm: "PD_LUONG_THUONG", href: "/phe-duyet/luong-thuong", bg: "#f3e8ff", color: "#9333ea", icon: <DollarSign size={22} /> },
        { title: "Thanh toán", perm: "PD_THANH_TOAN", href: "/phe-duyet/thanh-toan", bg: "#fee2e2", color: "#dc2626", icon: <CreditCard size={22} /> },
        { title: "Đơn mua hàng", perm: "PD_DON_MUA_HANG", href: "/phe-duyet/don-mua-hang", bg: "#ffedd5", color: "#ea580c", icon: <ShoppingCart size={22} /> },
      ]
    },
    {
      id: "purchasing",
      title: "Quản lý Mua hàng",
      items: [
        { title: "Đề nghị mua hàng", perm: "MH_DE_NGHI", href: "/purchasing/de-nghi", bg: "#eff6ff", color: "#2563eb", icon: <PackagePlus size={22} /> },
        { title: "Phiếu nhập kho", perm: "MH_PHIEU_NHAP", href: "/purchasing/nhap-kho", bg: "#ecfdf5", color: "#059669", icon: <Package size={22} /> },
      ]
    },
    {
      id: "sales",
      title: "Quản lý Bán hàng",
      items: [
        { title: "Hợp đồng bán hàng", perm: "BH_HOP_DONG", href: "/sales/hop-dong", bg: "#e0f2fe", color: "#0284c7", icon: <FileSpreadsheet size={22} /> },
        { title: "Đơn hàng", perm: "BH_DON_HANG", href: "/sales/don-hang", bg: "#fff7ed", color: "#ea580c", icon: <Store size={22} /> },
      ]
    },
    {
      id: "reports",
      title: "Báo cáo & Thống kê",
      items: [
        { title: "Báo cáo tổng hợp", perm: "BC_BAO_CAO", href: "/reports", bg: "#f3e8ff", color: "#9333ea", icon: <BarChart3 size={22} /> },
      ]
    }
  ];

  const hasAccessToItem = (item: any) => {
    if (isAdmin) return true;
    if (["NS_HO_SO", "NS_CHAM_CONG", "NS_NGHI_PHEP", "NS_LUONG", "NS_NGHI_VIEC"].includes(item.perm)) return true;
    if (item.perm === "PD_DE_NGHI_MH" && userPerms.some((p: string) => ["PD_DE_NGHI_MH", "TM_PHE_DUYET_DE_NGHI", "TM_DE_NGHI"].includes(p))) return true;
    if (item.perm === "PD_NHAN_SU" && userPerms.some((p: string) => ["PD_NHAN_SU", "NS_APPROVE"].includes(p))) return true;
    if (item.perm === "PD_HOP_DONG_BH" && userPerms.some((p: string) => ["PD_HOP_DONG_BH", "BH_HOP_DONG", "KD_HOP_DONG"].includes(p))) return true;
    if (item.perm === "PD_HOP_DONG_LD" && userPerms.some((p: string) => ["PD_HOP_DONG_LD", "NS_HOP_DONG"].includes(p))) return true;
    if (item.perm === "PD_LUONG_THUONG" && userPerms.some((p: string) => ["PD_LUONG_THUONG", "NS_BANG_LUONG"].includes(p))) return true;
    if (item.perm === "PD_THANH_TOAN" && userPerms.some((p: string) => ["PD_THANH_TOAN", "KT_PHIEU_CHI"].includes(p))) return true;
    if ((item.perm === "PD_MUA_HANG" || item.perm === "PD_DON_MUA_HANG") && userPerms.some((p: string) => ["PD_MUA_HANG", "PD_DON_MUA_HANG", "TM_LENH_MUA"].includes(p))) return true;
    return userPerms.includes(item.perm);
  };

  const activeModules = categoryModules.map(mod => {
    const validItems = mod.items.filter(item => hasAccessToItem(item));
    return { ...mod, items: validItems };
  }).filter(mod => mod.items.length > 0);

  // Handle item click (If not permitted, trigger the iOS Popup Alert!)
  const handleItemClick = (item: any) => {
    if (!hasAccessToItem(item)) {
      setPopupAlert({ message: "Bạn không có quyền sử dụng tính năng này." });
      return;
    }
    if (item.href) {
      setActiveSubView({ title: item.title, href: item.href });
    }
  };

  // If sub-view inside app is clicked (embedded navigation)
  if (activeSubView) {
    return (
      <div style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: "100%", 
        height: "100dvh", 
        display: "flex", 
        flexDirection: "column", 
        background: "#ffffff", 
        overflow: "hidden", 
        zIndex: 9999 
      }}>
        {/* App Header with Back Button */}
        <div style={{
          height: "52px",
          background: "#ffffff",
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "12px",
          borderBottom: "1px solid #f1f5f9",
          zIndex: 10,
          flexShrink: 0
        }}>
          <button 
            onClick={() => setActiveSubView(null)}
            style={{ background: "none", border: "none", color: "#0f172a", padding: "4px 0", display: "flex", alignItems: "center", cursor: "pointer" }}
          >
            <ChevronLeft size={24} />
          </button>
          <div style={{ fontSize: "15px", fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#0f172a" }}>
            {activeSubView.title || "Chi tiết"}
          </div>
        </div>

        {/* Embedded View Iframe Wrapper */}
        <div style={{ flex: 1, width: "100%", height: "calc(100% - 52px)", WebkitOverflowScrolling: "touch", overflow: "hidden" }}>
          <iframe
            id="mobile-subview-iframe"
            src={`${activeSubView.href}?embedded=true`}
            style={{ width: "100%", height: "100%", border: "none", background: "#ffffff", display: "block" }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f9ff" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", border: "2.5px solid #0284c7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#475569" }}>Đang tải giao diện di động...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #dcfce7 0%, #e0f2fe 16%, #f0f9ff 42%, #f8fafc 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      padding: "10px 10px 24px 10px",
      boxSizing: "border-box",
      WebkitFontSmoothing: "antialiased"
    }}>
      
      {/* NATIVE iOS STYLE SIMPLE POPUP MODAL (Giống hệt ảnh mẫu) */}
      {popupAlert && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}
        onClick={() => setPopupAlert(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "22px",
              padding: "26px 22px 20px 22px",
              width: "100%",
              maxWidth: "290px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              textAlign: "center",
              animation: "popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}
          >
            {/* Top Red Circle Avatar Icon */}
            <div style={{
              width: "54px",
              height: "54px",
              borderRadius: "50%",
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              position: "relative"
            }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff"
              }}>
                <UserX size={15} />
              </div>
              <span style={{
                position: "absolute",
                top: "10px",
                right: "14px",
                width: "8px",
                height: "8px",
                background: "#ef4444",
                borderRadius: "50%",
                border: "2px solid #ffffff"
              }} />
            </div>

            {/* Popup Message */}
            <div style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "#0f172a",
              lineHeight: "1.45",
              marginBottom: "22px",
              padding: "0 6px"
            }}>
              {popupAlert.message}
            </div>

            {/* Close / Action Button */}
            <button
              onClick={() => {
                if (popupAlert.onConfirm) popupAlert.onConfirm();
                setPopupAlert(null);
              }}
              style={{
                width: "100%",
                padding: "12.5px 0",
                borderRadius: "14px",
                background: "#f1f5f9",
                border: "none",
                fontSize: "15px",
                fontWeight: "700",
                color: "#0f172a",
                cursor: "pointer",
                outline: "none",
                WebkitTapHighlightColor: "transparent"
              }}
            >
              {popupAlert.actionText || "Đóng"}
            </button>
          </div>
        </div>
      )}

      {/* Floating In-App Realtime Toast Banner */}
      {latestToast && (
        <div style={{
          position: "fixed",
          top: "12px",
          left: "12px",
          right: "12px",
          background: "#0f172a",
          color: "#ffffff",
          padding: "12px 16px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          animation: "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
            <div style={{ background: "#ea580c", padding: "6px", borderRadius: "10px", display: "flex", alignItems: "center" }}>
              <Bell size={18} color="#ffffff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#fed7aa" }}>
                {latestToast.title || "Thông báo mới"}
              </div>
              <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px", fontWeight: 400 }}>
                {latestToast.message}
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => {
                if (typeof window !== "undefined" && latestToast?.id) {
                  localStorage.setItem(`dismissed_notif_${latestToast.id}`, "true");
                }
                setLatestToast(null);
                if (latestToast?.link) {
                  setActiveSubView({ title: latestToast.title || "Phê duyệt", href: latestToast.link });
                }
              }}
              style={{
                background: "#ff5c00",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Xem →
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined" && latestToast?.id) {
                  localStorage.setItem(`dismissed_notif_${latestToast.id}`, "true");
                }
                setLatestToast(null);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "0"
              }}
              title="Tắt thông báo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* User Profile Card */}
      <div style={{
        background: "#ffffff",
        borderRadius: "14px",
        padding: "10px 14px",
        boxShadow: "0 2px 10px rgba(0, 52, 102, 0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "8px",
        cursor: "pointer"
      }}
      onClick={() => setActiveSubView({ title: "Hồ sơ cá nhân", href: "/ca-nhan/ho-so" })}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #003466 0%, #0055a5 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "15px",
            boxShadow: "0 2px 6px rgba(0, 52, 102, 0.12)"
          }}>
            {(userInfo?.name || "P").split(" ").pop()?.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", lineHeight: "1.2" }}>
              {userInfo?.name || "Phạm Ngọc Dương"}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", fontWeight: "400" }}>
              {currentBranch || userInfo?.department || "VP. SAPO HỒ CHÍ MINH"}
            </div>
          </div>
        </div>
        <ChevronRight size={16} color="#cbd5e1" />
      </div>

      {/* SAPO GROUP Card (Cho phép chọn Chi nhánh - Chuẩn hóa 100% font rendering với Tên nhân viên bằng Overlay Select) */}
      <div style={{
        background: "#ffffff",
        borderRadius: "14px",
        padding: "10px 14px",
        boxShadow: "0 2px 10px rgba(0, 52, 102, 0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "8px",
        position: "relative"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", lineHeight: "1.2" }}>
              {currentBranch === "Toàn bộ chi nhánh" ? "SAPO GROUP (Tất cả)" : (currentBranch || "VP. SAPO HỒ CHÍ MINH")}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", fontWeight: "400" }}>
              Chi nhánh làm việc
            </div>
          </div>
        </div>
        <ChevronDown size={16} color="#64748b" style={{ pointerEvents: "none" }} />

        {/* Overlay invisible select element to handle native mobile tap/selection */}
        <select
          value={currentBranch}
          onChange={(e) => handleBranchChange(e.target.value)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            zIndex: 10
          }}
        >
          {allowedBranches.map((b: string) => (
            <option key={b} value={b}>{b === "Toàn bộ chi nhánh" ? "SAPO GROUP (Tất cả)" : b}</option>
          ))}
        </select>
      </div>

      {/* DYNAMIC PERMISSION-BASED CATEGORY BOXES */}
      {activeModules.map((mod) => (
        <div key={mod.id} style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", paddingLeft: "2px" }}>
            <div style={{
              fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
              fontSize: "14px",
              fontWeight: "600",
              color: "#0f172a",
              lineHeight: "1.2"
            }}>
              {mod.title}
            </div>
            {mod.badgeCount !== undefined && mod.badgeCount > 0 && (
              <span style={{ fontSize: "10.5px", fontWeight: 600, color: mod.badgeColor || "#ea580c", background: mod.badgeBg || "#fff7ed", padding: "2px 7px", borderRadius: "8px" }}>
                {mod.badgeCount} {mod.badgeText || "mục"}
              </span>
            )}
          </div>

          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "12px 6px",
            boxShadow: "0 2px 10px rgba(0, 52, 102, 0.03)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px 2px",
            textAlign: "center"
          }}>
            {mod.items.map((subItem, idx) => (
              <div
                key={idx}
                onClick={() => handleItemClick(subItem)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer"
                }}
              >
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: subItem.bg,
                    color: subItem.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)"
                  }}>
                    {subItem.icon}
                  </div>
                  {(subItem as any).itemBadge !== undefined && (subItem as any).itemBadge > 0 && (
                    <span style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      background: "#ff5c00",
                      color: "#ffffff",
                      fontSize: "10px",
                      fontWeight: 700,
                      borderRadius: "10px",
                      padding: "1px 5px",
                      minWidth: "16px",
                      height: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                      lineHeight: 1
                    }}>
                      {(subItem as any).itemBadge > 99 ? "99+" : (subItem as any).itemBadge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "11px", fontWeight: "400", color: "#334155", lineHeight: "1.2" }}>
                  {subItem.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Nút Đăng xuất chuẩn giao diện App Mobile (Giống hệt hình mẫu) */}
      <div
        onClick={async () => {
          try {
            await handleLogoutServer();
          } catch (e) {}
          document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          window.location.href = "/login";
        }}
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "14px 16px",
          boxShadow: "0 2px 10px rgba(0, 52, 102, 0.03)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          marginTop: "16px",
          marginBottom: "16px"
        }}
      >
        <div style={{
          width: "30px",
          height: "30px",
          borderRadius: "10px",
          background: "#93c5fd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2563eb",
          flexShrink: 0
        }}>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: "15px", fontWeight: "500", color: "#0f172a" }}>
          Đăng xuất
        </div>
      </div>

      {/* Keyframe Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0.88); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  );
}
