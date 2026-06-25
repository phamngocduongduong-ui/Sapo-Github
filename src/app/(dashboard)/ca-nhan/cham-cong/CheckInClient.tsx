"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, MapPin, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, User, CheckCircle2, AlertCircle, Timer, Camera, RefreshCw } from "lucide-react";
import { toggleCheckIn, getUserDeviceStatus, requestDeviceChange } from "./actions";
import { generateDeviceSecret, encryptSecret, decryptSecret } from "@/lib/deviceSecurity";

interface CheckIn {
  id: string;
  date: Date;
  employeeName: string;
  location: string | null;
  timeIn: Date | null;
  timeOut: Date | null;
  note: string | null;
}

export default function CheckInClient({ initialCheckins, areas = [] }: { initialCheckins: any[], areas?: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [liveTime, setLiveTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || "");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState({ isIPhoneChrome: false, isWindows: false });

  // Device validation states
  const [deviceSecret, setDeviceSecret] = useState<string | null>(null);
  const [serverDeviceSecret, setServerDeviceSecret] = useState<string | null>(null);
  const [serverPendingSecret, setServerPendingSecret] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<string>("APPROVED");
  const [username, setUsername] = useState<string>("");
  const [isCheckingDevice, setIsCheckingDevice] = useState(true);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  const router = useRouter();

  const isSecure = !isMounted || (typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"));

  const checkins = initialCheckins.map(c => ({
    ...c,
    date: new Date(c.date),
    timeIn: c.timeIn ? new Date(c.timeIn) : null,
    timeOut: c.timeOut ? new Date(c.timeOut) : null,
  }));

  // Helper: Haversine Distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Live Clock & Geolocation Watcher with Low-Accuracy Fallback
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
       const isIPhone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
       const isChromeIOS = /CriOS/i.test(navigator.userAgent);
       const isWin = /Windows/i.test(navigator.userAgent);
       setDeviceInfo({
         isIPhoneChrome: isIPhone && isChromeIOS,
         isWindows: isWin
       });
    }
    const timer = setInterval(() => setLiveTime(new Date()), 1000);

    if (!isSecure) {
      setGpsError("Trình duyệt chặn định vị GPS trên kết nối HTTP không bảo mật (IP raw).");
      return () => {
        clearInterval(timer);
      };
    }

    let watcher: number;

    const startWatching = (highAccuracy: boolean) => {
      if (watcher) navigator.geolocation.clearWatch(watcher);

      watcher = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;

          setCurrentCoords(prev => {
            if (!prev) return { lat: newLat, lng: newLng };
            const dist = getDistance(prev.lat, prev.lng, newLat, newLng);
            // Only update if moved more than 0.5 meter to prevent jitter loops
            if (dist > 0.5) return { lat: newLat, lng: newLng };
            return prev;
          });
          setGpsError(null);
        },
        (err) => {
          console.error(`GPS Watch Error (highAccuracy=${highAccuracy}):`, err);

          // If high accuracy fails or times out, immediately fall back to low accuracy (cellular/Wi-Fi triangulation)
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            console.log("High accuracy GPS watch failed. Retrying with low accuracy (network)...");
            startWatching(false);
            return;
          }

          if (err.code === 1) {
            setGpsError("Quyền vị trí bị từ chối. Vui lòng cho phép truy cập vị trí trong cài đặt trình duyệt để tiếp tục chấm công.");
          } else if (err.code === 2) {
            setGpsError("Không thể xác định vị trí. Vui lòng đảm bảo đã bật định vị GPS trên điện thoại của bạn.");
          } else if (err.code === 3) {
            setGpsError("Yêu cầu lấy vị trí hết thời gian chờ.");
          } else {
            setGpsError("Không thể lấy vị trí hiện tại.");
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 4000 : 12000,
          maximumAge: highAccuracy ? 0 : 30000
        }
      );
    };

    if (navigator.geolocation) {
      startWatching(true); // Start with high accuracy, auto-fallback after 4 seconds of timeout
    } else {
      setGpsError("Trình duyệt của bạn không hỗ trợ định vị GPS.");
    }

    return () => {
      clearInterval(timer);
      if (watcher) navigator.geolocation.clearWatch(watcher);
    };
  }, [isSecure]);

  // Load and verify device info
  useEffect(() => {
    async function initDevice() {
      try {
        const status = await getUserDeviceStatus();
        if (!status) {
          setIsCheckingDevice(false);
          return;
        }

        setUsername(status.username);
        setServerDeviceSecret(status.deviceSecret);
        setServerPendingSecret(status.pendingDeviceSecret);
        setDeviceStatus(status.deviceStatus);

        if (status.username === "admin") {
          setIsCheckingDevice(false);
          return;
        }

        let localEncrypted = localStorage.getItem("ems_device_secret");
        let secret = "";

        if (!localEncrypted) {
          // Generate new secret
          secret = generateDeviceSecret();
          const encrypted = encryptSecret(secret, status.username);
          localStorage.setItem("ems_device_secret", encrypted);
        } else {
          // Decrypt existing secret
          secret = decryptSecret(localEncrypted, status.username);
          if (!secret) {
            // If decryption failed (corrupted or salt changed), generate a new one
            secret = generateDeviceSecret();
            const encrypted = encryptSecret(secret, status.username);
            localStorage.setItem("ems_device_secret", encrypted);
          }
        }
        setDeviceSecret(secret);
      } catch (e) {
        console.error("Lỗi khởi tạo thiết bị:", e);
      } finally {
        setIsCheckingDevice(false);
      }
    }
    initDevice();
  }, []);

  const requestLocation = () => {
    if (!isSecure) {
      setGpsError("Trình duyệt chặn định vị GPS trên kết nối HTTP không bảo mật (IP raw).");
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    setIsRefreshing(true);
    setGpsError(null);

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setCurrentCoords({ lat: newLat, lng: newLng });
          setIsRefreshing(false);
        },
        (err) => {
          console.error(`GPS Manual Request Error (highAccuracy=${highAccuracy}):`, err);

          // If high accuracy fails or times out, immediately fall back to low accuracy
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            console.log("Manual high accuracy GPS failed. Retrying with low accuracy (network)...");
            tryGetPosition(false);
            return;
          }

          setIsRefreshing(false);
          if (err.code === 1) {
            setGpsError("Quyền vị trí bị chặn. Vui lòng bật định vị và cho phép trình duyệt truy cập vị trí.");
          } else if (err.code === 2) {
            setGpsError("Thiết bị chưa bật định vị GPS. Vui lòng vào Cài đặt để kích hoạt vị trí.");
          } else if (err.code === 3) {
            setGpsError("Kết nối GPS hết thời gian chờ. Vui lòng di chuyển ra vị trí thoáng hơn và thử lại.");
          } else {
            setGpsError("Không thể xác định vị trí hiện tại.");
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 4000 : 12000,
          maximumAge: highAccuracy ? 0 : 30000
        }
      );
    };

    tryGetPosition(true); // Start with high accuracy, auto-fallback after 4 seconds of timeout
  };

  // Calculate closest area whenever coords change
  useEffect(() => {
    if (!currentCoords || areas.length === 0) return;

    let minDistance = Infinity;
    let closestId = "";

    for (const area of areas) {
      const d = getDistance(currentCoords.lat, currentCoords.lng, area.latitude, area.longitude);
      if (d < minDistance) {
        minDistance = d;
        closestId = area.id;
      }
    }

    if (closestId && (closestId !== selectedAreaId || Math.abs((distance || 0) - minDistance) > 0.1)) {
      setSelectedAreaId(closestId);
      setDistance(minDistance);
    }
  }, [currentCoords, areas]);

  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const isInRange = distance !== null && selectedArea && distance <= selectedArea.radius;

  const getAreaName = (record: any) => {
    if (!record) return "Văn phòng";
    const area = areas.find(a => a.id === record.areaId);
    if (area) return area.name;
    if (record.location && record.location !== "Không xác định") return record.location;
    if (selectedArea) return selectedArea.name;
    return "Văn phòng";
  };

  const getDurationHours = (record: any) => {
    if (!record || !record.timeIn || !record.timeOut) return 0;
    const diffMs = new Date(record.timeOut).getTime() - new Date(record.timeIn).getTime();
    return diffMs / (1000 * 60 * 60);
  };

  const renderCalendarIndicator = (record: any) => {
    if (!record) return null;
    const isCompleted = record.timeIn && record.timeOut;
    const hours = isCompleted ? (new Date(record.timeOut).getTime() - new Date(record.timeIn).getTime()) / (1000 * 60 * 60) : 0;
    const isInsufficient = isCompleted && hours < 8;
    const isInProgress = record.timeIn && !record.timeOut;

    if (isInProgress) {
      return (
        <span 
          className="cal-badge info" 
          title="Đang làm việc"
          style={{
            background: "#003466",
            color: "white",
            borderRadius: "50%",
            width: "12px",
            height: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "7px",
            fontWeight: "bold",
            marginTop: "2px"
          }}
        >
          ●
        </span>
      );
    }

    if (isInsufficient) {
      return (
        <span 
          className="cal-badge warning" 
          title={`Làm chưa đủ 8 tiếng (${hours.toFixed(1)}h)`}
          style={{
            background: "#ff5c00",
            color: "white",
            borderRadius: "50%",
            width: "12px",
            height: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "8px",
            fontWeight: "bold",
            marginTop: "2px"
          }}
        >
          !
        </span>
      );
    }

    return (
      <span 
        className="cal-badge success" 
        title={`Đã hoàn thành đủ công (${hours.toFixed(1)}h)`}
        style={{
          background: "#10b981",
          color: "white",
          borderRadius: "50%",
          width: "12px",
          height: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "8px",
          fontWeight: "bold",
          marginTop: "2px"
        }}
      >
        ✓
      </span>
    );
  };

  const renderMobileCalendarIndicator = (record: any) => {
    if (!record) {
      return <span style={{ fontSize: "8px", color: "transparent", marginTop: "1px", lineHeight: "1" }}>-</span>;
    }
    const isCompleted = record.timeIn && record.timeOut;
    const hours = isCompleted ? (new Date(record.timeOut).getTime() - new Date(record.timeIn).getTime()) / (1000 * 60 * 60) : 0;
    const isInsufficient = isCompleted && hours < 8;
    const isInProgress = record.timeIn && !record.timeOut;

    if (isInProgress) {
      return (
        <span 
          style={{
            background: "#003466",
            color: "white",
            borderRadius: "50%",
            width: "9px",
            height: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "5px",
            fontWeight: "bold",
            marginTop: "2px"
          }}
        >
          ●
        </span>
      );
    }

    if (isInsufficient) {
      return (
        <span 
          style={{
            background: "#ff5c00",
            color: "white",
            borderRadius: "50%",
            width: "9px",
            height: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "6px",
            fontWeight: "bold",
            marginTop: "2px"
          }}
        >
          !
        </span>
      );
    }

    return (
      <span 
        style={{
          background: "#10b981",
          color: "white",
          borderRadius: "50%",
          width: "9px",
          height: "9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "6px",
          fontWeight: "bold",
          marginTop: "2px"
        }}
      >
        ✓
      </span>
    );
  };

  // Memoize calendar logic
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return { days, year, month };
  }, [currentDate]);

  const handlePrevMonth = () => {
    setSelectedCalendarDay(null);
    setCurrentDate(new Date(calendarData.year, calendarData.month - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedCalendarDay(null);
    setCurrentDate(new Date(calendarData.year, calendarData.month + 1, 1));
  };

  const handleRequestDeviceChange = () => {
    if (!deviceSecret) return;
    if (!confirm("Bạn có chắc chắn muốn gửi yêu cầu đăng ký thiết bị này? Thiết bị cũ sẽ tạm thời không sử dụng được cho đến khi được Admin phê duyệt.")) return;

    startTransition(async () => {
      try {
        const res = await requestDeviceChange(deviceSecret);
        if (res.success) {
          alert("Gửi yêu cầu đổi thiết bị thành công! Vui lòng liên hệ Admin để duyệt.");
          setDeviceStatus("PENDING");
          setServerPendingSecret(deviceSecret);
          router.refresh();
        }
      } catch (e: any) {
        alert(e.message || "Có lỗi xảy ra");
      }
    });
  };

  const handleCheckIn = () => {
    if (isPending) return;

    const proceedToggle = (loc: string) => {
      const today = new Date();
      const dateStr = today.toISOString();
      startTransition(async () => {
        try {
          const res = await toggleCheckIn(dateStr, loc, selectedAreaId || undefined, deviceSecret || undefined);
          if (res.success) {
            router.refresh();
          } else {
            alert(res.error || "Có lỗi xảy ra");
          }
        } catch (e: any) {
          alert(e.message || "Có lỗi xảy ra");
        }
      });
    };

    if (username === "admin") {
      const loc = currentCoords
        ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`
        : "Vị trí không xác định";
      proceedToggle(loc);
      return;
    }

    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
      return;
    }

    // If we already have coordinates from the background watchPosition watcher, use them instantly
    if (currentCoords) {
      proceedToggle(`${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`);
      return;
    }

    // Retrieve fresh GPS coordinates as fallback if currentCoords is null
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentCoords({ lat, lng });
        setGpsError(null);
        proceedToggle(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      },
      (err) => {
        let msg = "Không thể lấy vị trí GPS hiện tại của bạn.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Bạn đã từ chối quyền truy cập định vị GPS. Vui lòng cấp quyền định vị trong cài đặt trình duyệt để thực hiện chấm công.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Thông tin vị trí GPS không khả dụng. Vui lòng kiểm tra xem thiết bị đã bật định vị chưa.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Yêu cầu định vị GPS bị quá hạn thời gian.";
        }
        setGpsError(msg);
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getCheckInForDay = (day: number) => {
    return checkins.find(c =>
      c.date.getDate() === day &&
      c.date.getMonth() === calendarData.month &&
      c.date.getFullYear() === calendarData.year
    );
  };

  const getDayRecordClass = (record: any) => {
    if (!record) return "";
    const isCompleted = record.timeIn && record.timeOut;
    const hours = isCompleted ? (new Date(record.timeOut).getTime() - new Date(record.timeIn).getTime()) / (1000 * 60 * 60) : 0;
    const isInsufficient = isCompleted && hours < 8;
    const isInProgress = record.timeIn && !record.timeOut;
    
    if (isInProgress) return "in-progress";
    if (isInsufficient) return "insufficient";
    return "completed";
  };

  const stats = useMemo(() => {
    const todayVal = new Date();
    const isCurrentMonth = calendarData.month === todayVal.getMonth() && calendarData.year === todayVal.getFullYear();
    const isPastMonth = (calendarData.year < todayVal.getFullYear()) || 
                        (calendarData.year === todayVal.getFullYear() && calendarData.month < todayVal.getMonth());
    
    let maxDayToCheck = 0;
    if (isCurrentMonth) {
      maxDayToCheck = todayVal.getDate() - 1; // Days before today
    } else if (isPastMonth) {
      maxDayToCheck = new Date(calendarData.year, calendarData.month + 1, 0).getDate();
    } else {
      maxDayToCheck = 0;
    }

    let forgottenCount = 0;
    let insufficientCount = 0;

    for (let day = 1; day <= maxDayToCheck; day++) {
      const record = checkins.find(c =>
        c.date.getDate() === day &&
        c.date.getMonth() === calendarData.month &&
        c.date.getFullYear() === calendarData.year
      );

      if (!record) {
        forgottenCount++;
      } else {
        if (record.timeIn && record.timeOut) {
          const hours = (new Date(record.timeOut).getTime() - new Date(record.timeIn).getTime()) / (1000 * 60 * 60);
          if (hours < 8) {
            insufficientCount++;
          }
        } else {
          insufficientCount++;
        }
      }
    }

    return {
      heSo: 26,
      forgotten: forgottenCount,
      insufficient: insufficientCount
    };
  }, [checkins, calendarData]);

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA"); // YYYY-MM-DD

  const todayRecord = checkins.find(c => {
    const dStr = c.date.toLocaleDateString("en-CA");
    return dStr === todayStr;
  });

  const elapsedMs = (isMounted && todayRecord?.timeIn) ? (liveTime.getTime() - new Date(todayRecord.timeIn).getTime()) : 0;
  const isLessThanTwoHours = !!(isMounted && todayRecord && !todayRecord.timeOut && elapsedMs < 2 * 60 * 60 * 1000);
  const remainingSeconds = (isMounted && todayRecord && !todayRecord.timeOut) ? Math.max(0, Math.ceil((2 * 60 * 60 * 1000 - elapsedMs) / 1000)) : 0;

  const formatRemainingTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} giờ`);
    if (mins > 0) parts.push(`${mins} phút`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} giây`);
    return parts.join(" ");
  };

  if (isMounted && !isCheckingDevice && username && username !== "admin" && deviceInfo.isWindows) {
    return (
      <div className="base-checkin-wrapper" style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '500px', margin: '4rem auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '2.5rem', textAlign: 'center', fontFamily: '"Segoe UI", sans-serif' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', marginBottom: '1.5rem' }}>
            <AlertCircle size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#991b1b', margin: '0 0 1rem 0' }}>KHÔNG HỖ TRỢ TRÊN MÁY TÍNH</h2>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>
            Hệ thống không cho phép truy cập trang chấm công trên máy tính Windows. Vui lòng sử dụng điện thoại di động để thực hiện chấm công.
          </p>
          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '1rem', color: '#64748b', fontSize: '13px' }}>
            Yêu cầu bắt buộc để đảm bảo tính xác thực định vị GPS và thiết bị.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="base-checkin-wrapper">
      <div className="breadcrumb-banner">
        CHẤM CÔNG
      </div>
      <div className="stats-dashboard-bar">
        <div className="stats-card card-heso">
          <div className="stats-card-info">
            <div className="stats-card-label">Hệ số chấm công</div>
            <div className="stats-card-value">{stats.heSo} ngày</div>
          </div>
          <div className="stats-card-icon heso">
            <CalendarIcon size={18} />
          </div>
        </div>
        <div className="stats-card card-forgotten">
          <div className="stats-card-info">
            <div className="stats-card-label">Quên chấm công</div>
            <div className="stats-card-value warning">{stats.forgotten} ngày</div>
          </div>
          <div className="stats-card-icon forgotten">
            <AlertCircle size={18} />
          </div>
        </div>
        <div className="stats-card card-insufficient">
          <div className="stats-card-info">
            <div className="stats-card-label">Không đủ công</div>
            <div className="stats-card-value danger">{stats.insufficient} ngày</div>
          </div>
          <div className="stats-card-icon insufficient">
            <Clock size={18} />
          </div>
        </div>
      </div>
      <div className="base-main-content" style={{ marginTop: "1rem" }}>
        {/* LEFT COLUMN: PRIMARY ACTIONS */}
        <div className="checkin-primary-card card">
          <div className="checkin-header">
            <div className="user-info-brief">
              <div className="avatar-placeholder">
                <User size={18} />
              </div>
              <div className="user-text">
                <h3>Chấm công</h3>
                <p>{liveTime.toLocaleDateString("vi-VN", { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
            </div>
            <div className={`status-pill-large ${todayRecord ? 'success' : 'pending'}`}>
              {todayRecord ? (todayRecord.timeOut ? "Đã hoàn thành" : "Đang làm việc") : "Chưa chấm công"}
            </div>
          </div>

          <div className="clock-section">
            <div className="time-display">
              {isMounted ? liveTime.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--:--:--"}
            </div>
            <div className="location-status">
              {currentCoords && selectedArea ? (
                <div className={`location-badge-base ${isInRange ? 'in' : 'out'}`}>
                  <MapPin size={13} />
                  <span>{selectedArea.name} ({distance !== null ? `${distance.toFixed(0)}m` : "..."})</span>
                  <button
                    className={`mini-refresh ${isRefreshing ? 'spin' : ''}`}
                    onClick={requestLocation}
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              ) : gpsError ? (
                <div className="location-badge-base error-badge">
                  <AlertCircle size={13} />
                  <span>Lỗi GPS: Cần bật vị trí</span>
                </div>
              ) : (
                <div className="location-badge-base loading">
                  <RefreshCw size={12} className="spin" style={{ marginRight: 6 }} />
                  Đang xác định vị trí...
                </div>
              )}
            </div>
          </div>

          {isCheckingDevice ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1', margin: '0 0 1rem 0' }}>
              <RefreshCw size={24} className="spin" style={{ color: '#003466', marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Đang xác thực thông tin thiết bị...</p>
            </div>
          ) : (username !== "admin" && deviceInfo.isWindows) ? (
            <div className="device-mismatch-section" style={{ margin: '0 0 1rem 0' }}>
              <div className="device-binding-card" style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <AlertCircle size={32} style={{ color: '#dc2626', marginBottom: '10px' }} />
                <h4 style={{ margin: '0 0 8px 0', color: '#991b1b', fontWeight: '700', fontSize: '14px' }}>THIẾT BỊ KHÔNG HỢP LỆ</h4>
                <p style={{ margin: '0', fontSize: '13px', color: '#b91c1c', lineHeight: '1.5', fontWeight: '600' }}>
                  Hệ thống không cho phép chấm công trên máy tính Windows. Vui lòng sử dụng điện thoại di động để thực hiện chấm công.
                </p>
              </div>
            </div>
          ) : (username !== "admin" && serverDeviceSecret !== null && serverDeviceSecret !== deviceSecret) ? (
            <div className="device-mismatch-section" style={{ margin: '0 0 1rem 0' }}>
              {deviceStatus === "PENDING" ? (
                <div className="device-binding-card" style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <AlertCircle size={24} style={{ color: '#d97706', marginBottom: '6px' }} />
                  <h4 style={{ margin: '0 0 4px 0', color: '#92400e', fontWeight: '700', fontSize: '13px' }}>THIẾT BỊ ĐANG CHỜ DUYỆT</h4>
                  <p style={{ margin: '0', fontSize: '13px', color: '#b45309', lineHeight: '1.4' }}>
                    Yêu cầu liên kết thiết bị này đang chờ duyệt. Vui lòng liên hệ Admin/Nhân sự để phê duyệt thiết bị mới trước khi chấm công.
                  </p>
                </div>
              ) : (
                <div className="device-binding-card" style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <AlertCircle size={24} style={{ color: '#dc2626', marginBottom: '6px' }} />
                  <h4 style={{ margin: '0 0 4px 0', color: '#991b1b', fontWeight: '700', fontSize: '13px' }}>THIẾT BỊ KHÔNG KHỚP</h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#b91c1c', lineHeight: '1.4' }}>
                    Tài khoản của bạn đã được liên kết với một thiết bị khác. Nếu bạn muốn đổi sang sử dụng thiết bị này, vui lòng gửi yêu cầu duyệt đổi máy.
                  </p>
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    style={{ background: '#ff5c00', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                    onClick={handleRequestDeviceChange}
                    disabled={isPending}
                  >
                    {isPending ? "ĐANG GỬI..." : "GỬI YÊU CẦU ĐỔI THIẾT BỊ"}
                  </button>
                </div>
              )}
            </div>
          ) : !currentCoords ? (
            <div className="location-request-container">
              <div className="location-request-card-premium">
                <div className="gps-icon-wrapper animate-pulse-ring">
                  <MapPin size={24} className="gps-icon-icon" />
                </div>
                <h3>{!isSecure ? "Yêu Cầu Kết Nối Bảo Mật HTTPS" : "Yêu Cầu Bật Định Vị GPS"}</h3>
                <p className="request-desc">
                  {!isSecure
                    ? "Trình duyệt điện thoại chặn tính năng định vị GPS trên kết nối HTTP thông thường để bảo vệ quyền riêng tư của bạn."
                    : gpsError
                      ? gpsError
                      : "Hệ thống cần xác định vị trí hiện tại của bạn để đảm bảo bạn đang ở khu vực chấm công hợp lệ."}
                </p>

                {isSecure ? (
                  <button
                    type="button"
                    className="btn-request-location"
                    onClick={requestLocation}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        <span>Đang định vị...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={16} />
                        <span>Kích Hoạt & Cập Nhật Vị Trí</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="http-warning-banner">
                    Bạn cần cấu hình SSL (HTTPS) cho VPS hoặc kích hoạt tính năng thử nghiệm trong Chrome flags trên điện thoại để tiếp tục.
                  </div>
                )}

                <div className="instructions-toggle">
                  <span>{!isSecure ? "Cách khắc phục lỗi HTTP (Xem trên điện thoại):" : "Cách khắc phục trên điện thoại:"}</span>
                  {!isSecure ? (
                    <ul>
                      <li>1. <b>Giải pháp chuẩn:</b> Cấu hình tên miền có chứng chỉ SSL (HTTPS) cho VPS.</li>
                      <li>2. <b>Thử nghiệm nhanh trên Chrome điện thoại:</b>
                        <ul style={{ paddingLeft: '1rem', marginTop: '4px', listStyleType: 'circle' }}>
                          <li>Truy cập địa chỉ: <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                          <li>Nhập URL của VPS: <code>http://14.225.206.247</code></li>
                          <li>Chọn <b>Enabled</b> và bấm <b>Relaunch</b> để khởi động lại Chrome.</li>
                        </ul>
                      </li>
                    </ul>
                  ) : deviceInfo.isIPhoneChrome ? (
                    <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                      <li style={{ marginBottom: "4px", color: "#b91c1c", fontWeight: "700" }}>📱 iPhone (iOS) + Chrome Detected</li>
                      <li style={{ marginBottom: "4px" }}>1️⃣ Vào ứng dụng <b>Cài đặt (Settings)</b> trên iPhone.</li>
                      <li style={{ marginBottom: "4px" }}>2️⃣ Cuộn xuống dưới chọn ứng dụng <b>Chrome</b>.</li>
                      <li style={{ marginBottom: "4px" }}>3️⃣ Chọn mục <b>Vị trí (Location)</b>.</li>
                      <li style={{ marginBottom: "4px" }}>4️⃣ Nhấp chọn <b>Khi dùng Ứng dụng (While Using the App)</b>.</li>
                      <li style={{ marginBottom: "4px" }}>5️⃣ Quay lại Chrome và bấm nút <b>Cấp quyền định vị</b> ở trên.</li>
                    </ul>
                  ) : (
                    <ul>
                      <li>1. Đảm bảo đã bật <b>GPS/Vị trí</b> trong Cài đặt của điện thoại.</li>
                      <li>2. Nhấn nút <b>Cho phép (Allow)</b> khi trình duyệt hỏi quyền truy cập vị trí.</li>
                      <li>3. Nếu lỡ bấm Từ chối, nhấp vào <b>biểu tượng ổ khóa/cài đặt</b> ở góc thanh địa chỉ để đặt lại quyền thành "Cho phép".</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="action-buttons-group">
              {!todayRecord ? (
                <button
                  className={`btn-base-action in ${isPending ? 'loading' : ''} ${(username !== "admin" && !isInRange) ? 'disabled' : ''}`}
                  onClick={handleCheckIn}
                  disabled={isPending || (username !== "admin" && !isInRange)}
                >
                  {isPending ? <Timer size={16} className="spin" /> : <Camera size={16} />}
                  <span>{isPending ? "ĐANG XỬ LÝ..." : "CHẤM CÔNG VÀO"}</span>
                </button>
              ) : !todayRecord.timeOut ? (
                <>
                  <button
                    className={`btn-base-action out ${isPending ? 'loading' : ''} ${(username !== "admin" && (!isInRange || isLessThanTwoHours)) ? 'disabled' : ''}`}
                    onClick={handleCheckIn}
                    disabled={isPending || (username !== "admin" && (!isInRange || isLessThanTwoHours))}
                  >
                    {isPending ? <Timer size={16} className="spin" /> : <Clock size={16} />}
                    <span>{isPending ? "ĐANG XỬ LÝ..." : "CHẤM CÔNG RA"}</span>
                  </button>
                  {username !== "admin" && isLessThanTwoHours && (
                    <div className="range-warning danger" style={{ marginTop: "10px" }}>
                      <AlertCircle size={13} />
                      <span>Bạn chưa thể chấm công ra. Cần làm thêm {formatRemainingTime(remainingSeconds)} nữa để đủ 2 tiếng.</span>
                    </div>
                  )}
                </>
              ) : (
                (() => {
                  const hours = getDurationHours(todayRecord);
                  const isInsufficient = hours < 8;
                  if (isInsufficient) {
                    return (
                      <div className="completed-banner warning" style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "13px" }}>
                        <AlertCircle size={16} />
                        <span>Bạn đã hoàn thành ca hôm nay (Cảnh báo: làm {hours.toFixed(1)} tiếng, chưa đủ 8 tiếng)</span>
                      </div>
                    );
                  }
                  return (
                    <div className="completed-banner" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "13px" }}>
                      <CheckCircle2 size={16} />
                      <span>Bạn đã hoàn thành ca làm việc hôm nay (Đủ {hours.toFixed(1)} tiếng)</span>
                    </div>
                  );
                })()
              )}

              {!isInRange && !todayRecord?.timeOut && (
                <div className="range-warning">
                  <AlertCircle size={13} />
                  <span>Bạn đang ở ngoài bán kính cho phép. Vui lòng di chuyển lại gần khu vực chấm công.</span>
                </div>
              )}
            </div>
          )}

          <div className="today-timeline">
            <h4>Lịch sử hôm nay</h4>
            <div className="timeline-base">
              {todayRecord ? (
                <>
                  <div className="timeline-node">
                    <div className="node-time">{todayRecord.timeIn?.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="node-dot in"></div>
                    <div className="node-content">
                      <p className="title">Bắt đầu làm việc</p>
                      <p className="sub">{getAreaName(todayRecord)}</p>
                    </div>
                  </div>
                  {todayRecord.timeOut && (
                    <div className="timeline-node">
                      <div className="node-time">{todayRecord.timeOut?.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="node-dot out"></div>
                      <div className="node-content">
                        <p className="title">Kết thúc làm việc</p>
                        <p className="sub">{getAreaName(todayRecord)}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-timeline">
                  <p>Hôm nay bạn chưa có hoạt động chấm công nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile-Only Calendar Table */}
          <div className="mobile-calendar-wrapper mobile-show-only" style={{ marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
            <div className="calendar-header-base" style={{ marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700" }}>Lịch sử tháng {calendarData.month + 1}</h3>
              <div className="cal-nav">
                <button onClick={handlePrevMonth} style={{ padding: "2px" }}><ChevronLeft size={14} /></button>
                <button onClick={handleNextMonth} style={{ padding: "2px" }}><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="cal-grid-base" style={{ gap: "2px" }}>
              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(d => (
                <div key={d} className="cal-day-label" style={{ fontSize: "11px", padding: "4px 0" }}>{d}</div>
              ))}
              {calendarData.days.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="cal-day empty" style={{ background: "transparent" }}></div>;
                const record = getCheckInForDay(day);
                const isToday = day === new Date().getDate() && calendarData.month === new Date().getMonth() && calendarData.year === new Date().getFullYear();

                return (
                  <div 
                    key={day} 
                    className={`cal-day ${isToday ? 'today' : ''} ${record ? 'has-record' : ''} ${getDayRecordClass(record)} ${selectedCalendarDay === day ? 'selected-day' : ''}`}
                    onClick={() => setSelectedCalendarDay(day)}
                  >
                    <span className="day-val" style={{ fontWeight: isToday ? "700" : "500", fontSize: "13px" }}>{day}</span>
                    {renderMobileCalendarIndicator(record)}
                  </div>
                );
              })}
            </div>
            {selectedCalendarDay !== null && (
              <div className="mobile-day-detail-timeline" style={{ marginTop: "1rem", background: "#f8fafc", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
                  <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#003466" }}>
                    Chi tiết ngày {selectedCalendarDay}/{calendarData.month + 1}
                  </h4>
                  <button 
                    onClick={() => setSelectedCalendarDay(null)} 
                    style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", border: "none", background: "none", cursor: "pointer" }}
                  >
                    Đóng
                  </button>
                </div>
                {(() => {
                  const record = getCheckInForDay(selectedCalendarDay);
                  if (!record) {
                    return (
                      <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "8px 0" }}>
                        Không có dữ liệu chấm công
                      </div>
                    );
                  }
                  
                  const hours = getDurationHours(record);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "10px", fontSize: "13px" }}>
                        <span style={{ fontWeight: "700", color: "#1e293b", minWidth: "50px" }}>Vào:</span>
                        <span style={{ color: "#003466", fontWeight: "600" }}>
                          {record.timeIn ? record.timeIn.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </span>
                        <span style={{ color: "#64748b" }}>•</span>
                        <span style={{ color: "#475569" }}>{getAreaName(record)}</span>
                      </div>
                      <div style={{ display: "flex", gap: "10px", fontSize: "13px" }}>
                        <span style={{ fontWeight: "700", color: "#1e293b", minWidth: "50px" }}>Ra:</span>
                        <span style={{ color: "#ff5c00", fontWeight: "600" }}>
                          {record.timeOut ? record.timeOut.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </span>
                        <span style={{ color: "#64748b" }}>•</span>
                        <span style={{ color: "#475569" }}>{getAreaName(record)}</span>
                      </div>
                      {record.timeIn && record.timeOut && (
                        <div style={{ fontSize: "12px", fontWeight: "600", color: hours >= 8 ? "#166534" : "#b45309", background: hours >= 8 ? "#f0fdf4" : "#fffbeb", padding: "4px 8px", borderRadius: "4px", border: hours >= 8 ? "1px solid #bbf7d0" : "1px solid #fde68a", display: "inline-block", alignSelf: "flex-start", marginTop: "4px" }}>
                          Tổng thời gian: {hours.toFixed(1)} giờ {hours < 8 ? "(Thiếu giờ)" : "(Đủ công)"}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CALENDAR & STATS */}
        <div className="checkin-secondary-column mobile-hide">
          <div className="calendar-card-base card">
            <div className="calendar-header-base">
              <h3>Tháng {calendarData.month + 1}, {calendarData.year}</h3>
              <div className="cal-nav">
                <button onClick={handlePrevMonth}><ChevronLeft size={14} /></button>
                <button onClick={handleNextMonth}><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="cal-grid-base">
              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(d => (
                <div key={d} className="cal-day-label">{d}</div>
              ))}
              {calendarData.days.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="cal-day empty"></div>;
                const record = getCheckInForDay(day);
                const isToday = day === new Date().getDate() && calendarData.month === new Date().getMonth() && calendarData.year === new Date().getFullYear();

                return (
                  <div key={day} className={`cal-day ${isToday ? 'today' : ''} ${record ? 'has-record' : ''} ${getDayRecordClass(record)}`}>
                    <span className="day-val">{day}</span>
                    {renderCalendarIndicator(record)}
                  </div>
                );
              })}
            </div>
          </div>


        </div>
      </div>

    </div>
  );
}
