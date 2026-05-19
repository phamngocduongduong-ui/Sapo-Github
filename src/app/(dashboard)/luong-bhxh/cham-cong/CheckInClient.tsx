"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, MapPin, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, User, CheckCircle2, AlertCircle, Timer, Camera, RefreshCw } from "lucide-react";
import { toggleCheckIn } from "./actions";

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
  const [deviceInfo, setDeviceInfo] = useState({ isIPhoneChrome: false });
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
      setDeviceInfo({
        isIPhoneChrome: isIPhone && isChromeIOS
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
            background: "#3b82f6",
            color: "white",
            borderRadius: "50%",
            width: "14px",
            height: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "8px",
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
            background: "#f59e0b",
            color: "white",
            borderRadius: "50%",
            width: "14px",
            height: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "9px",
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
          width: "14px",
          height: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "9px",
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
            background: "#3b82f6",
            color: "white",
            borderRadius: "50%",
            width: "10px",
            height: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "6px",
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
            background: "#f59e0b",
            color: "white",
            borderRadius: "50%",
            width: "10px",
            height: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "7px",
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
          width: "10px",
          height: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "7px",
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

  const handlePrevMonth = () => setCurrentDate(new Date(calendarData.year, calendarData.month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(calendarData.year, calendarData.month + 1, 1));

  const handleCheckIn = () => {
    const today = new Date();
    const dateStr = today.toISOString();
    if (isPending) return;

    // Default values if no GPS
    const loc = currentCoords
      ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`
      : "Vị trí không xác định";

    startTransition(async () => {
      try {
        const res = await toggleCheckIn(dateStr, loc, selectedAreaId || undefined);
        if (res.success) {
          router.refresh();
        }
      } catch (e: any) {
        alert(e.message || "Có lỗi xảy ra");
      }
    });
  };

  const getCheckInForDay = (day: number) => {
    return checkins.find(c =>
      c.date.getDate() === day &&
      c.date.getMonth() === calendarData.month &&
      c.date.getFullYear() === calendarData.year
    );
  };

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA"); // YYYY-MM-DD

  const todayRecord = checkins.find(c => {
    const dStr = c.date.toLocaleDateString("en-CA");
    return dStr === todayStr;
  });

  return (
    <div className="base-checkin-wrapper">
      <div className="base-main-content">
        {/* LEFT COLUMN: PRIMARY ACTIONS */}
        <div className="checkin-primary-card card">
          <div className="checkin-header">
            <div className="user-info-brief">
              <div className="avatar-placeholder">
                <User size={24} />
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
                  <MapPin size={14} />
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
                  <AlertCircle size={14} />
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

          {!currentCoords ? (
            <div className="location-request-container">
              <div className="location-request-card-premium">
                <div className="gps-icon-wrapper animate-pulse-ring">
                  <MapPin size={32} className="gps-icon-icon" />
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
                        <RefreshCw size={18} className="spin" />
                        <span>Đang định vị...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={18} />
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
                      <li style={{ marginBottom: "6px", color: "#b91c1c", fontWeight: "700" }}>📱 iPhone (iOS) + Chrome Detected</li>
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
                  className={`btn-base-action in ${isPending ? 'loading' : ''}`}
                  onClick={handleCheckIn}
                  disabled={isPending}
                >
                  {isPending ? <Timer size={20} className="spin" /> : <Camera size={20} />}
                  <span>{isPending ? "ĐANG XỬ LÝ..." : "CHẤM CÔNG VÀO"}</span>
                </button>
              ) : !todayRecord.timeOut ? (
                <button
                  className={`btn-base-action out ${isPending ? 'loading' : ''}`}
                  onClick={handleCheckIn}
                  disabled={isPending}
                >
                  {isPending ? <Timer size={20} className="spin" /> : <Clock size={20} />}
                  <span>{isPending ? "ĐANG XỬ LÝ..." : "CHẤM CÔNG RA"}</span>
                </button>
              ) : (
                (() => {
                  const hours = getDurationHours(todayRecord);
                  const isInsufficient = hours < 8;
                  if (isInsufficient) {
                    return (
                      <div className="completed-banner warning" style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderRadius: "8px", fontWeight: "600", fontSize: "0.9rem" }}>
                        <AlertCircle size={20} />
                        <span>Bạn đã hoàn thành ca hôm nay (Cảnh báo: làm ${hours.toFixed(1)} tiếng, chưa đủ 8 tiếng)</span>
                      </div>
                    );
                  }
                  return (
                    <div className="completed-banner" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderRadius: "8px", fontWeight: "600", fontSize: "0.9rem" }}>
                      <CheckCircle2 size={20} />
                      <span>Bạn đã hoàn thành ca làm việc hôm nay (Đủ ${hours.toFixed(1)} tiếng)</span>
                    </div>
                  );
                })()
              )}

              {!isInRange && !todayRecord?.timeOut && (
                <div className="range-warning">
                  <AlertCircle size={14} />
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
          <div className="mobile-calendar-wrapper mobile-show-only" style={{ marginTop: "1.2rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.2rem" }}>
            <div className="calendar-header-base" style={{ marginBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Lịch sử tháng {calendarData.month + 1}</h3>
              <div className="cal-nav">
                <button onClick={handlePrevMonth} style={{ padding: "2px" }}><ChevronLeft size={14} /></button>
                <button onClick={handleNextMonth} style={{ padding: "2px" }}><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="cal-grid-base" style={{ gap: "2px" }}>
              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(d => (
                <div key={d} className="cal-day-label" style={{ fontSize: "0.7rem", padding: "4px 0" }}>{d}</div>
              ))}
              {calendarData.days.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="cal-day empty" style={{ background: "transparent" }}></div>;
                const record = getCheckInForDay(day);
                const isToday = day === new Date().getDate() && calendarData.month === new Date().getMonth() && calendarData.year === new Date().getFullYear();

                return (
                  <div key={day} className={`cal-day ${isToday ? 'today' : ''} ${record ? 'has-record' : ''}`} style={{ padding: "6px 0", borderRadius: "6px", fontSize: "0.8rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "auto", aspectRatio: "auto" }}>
                    <span className="day-val" style={{ fontWeight: isToday ? "700" : "500", fontSize: "0.85rem" }}>{day}</span>
                    {renderMobileCalendarIndicator(record)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CALENDAR & STATS */}
        <div className="checkin-secondary-column mobile-hide">
          <div className="calendar-card-base card">
            <div className="calendar-header-base">
              <h3>Tháng {calendarData.month + 1}, {calendarData.year}</h3>
              <div className="cal-nav">
                <button onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
                <button onClick={handleNextMonth}><ChevronRight size={16} /></button>
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
                  <div key={day} className={`cal-day ${isToday ? 'today' : ''} ${record ? 'has-record' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <span className="day-val">{day}</span>
                    {renderCalendarIndicator(record)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="summary-card-base card">
            <h3>Tổng hợp tháng {calendarData.month + 1}</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Công chuẩn</span>
                <span className="value">22</span>
              </div>
              <div className="summary-item">
                <span className="label">Thực tế</span>
                <span className="value">{checkins.length}</span>
              </div>
              <div className="summary-item">
                <span className="label">Đi muộn</span>
                <span className="value">{checkins.filter(c => c.timeIn && c.timeIn.getHours() >= 8).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .base-checkin-wrapper {
          padding: 0;
          background: transparent;
          min-height: auto;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .base-main-content {
          display: grid;
          grid-template-columns: 450px 1fr;
          gap: 1.5rem;
          max-width: 100%;
          margin: 0;
        }

        .card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e1e6ed;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          padding: 1.5rem;
        }

        /* Primary Card */
        .checkin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .user-info-brief {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .avatar-placeholder {
          width: 48px;
          height: 48px;
          background: #3b82f6;
          color: #fff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-text h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b; }
        .user-text p { margin: 2px 0 0; font-size: 0.85rem; color: #64748b; }

        .status-pill-large {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-pill-large.success { background: #dcfce7; color: #166534; }
        .status-pill-large.pending { background: #f1f5f9; color: #475569; }

        .clock-section {
          text-align: center;
          padding: 2rem 0;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 2rem;
        }

        .time-display {
          font-size: 4rem;
          font-weight: 800;
          color: #1e293b;
          font-variant-numeric: tabular-nums;
          letter-spacing: -2px;
          line-height: 1;
        }

        .location-status { margin-top: 1rem; }
        .location-badge-base {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .location-badge-base.in { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .location-badge-base.out { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .location-badge-base.loading { color: #64748b; font-style: italic; }

        .mini-refresh { background: none; border: none; color: inherit; cursor: pointer; display: flex; align-items: center; padding: 2px; }
        .mini-refresh:hover { opacity: 0.7; }
        .mini-refresh.spin { animation: spin 1s linear infinite; }

        .action-buttons-group { margin-bottom: 2.5rem; }
        .btn-base-action {
          width: 100%;
          height: 56px;
          border-radius: 12px;
          border: none;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-base-action.in { background: #3b82f6; color: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25); }
        .btn-base-action.out { background: #f59e0b; color: #fff; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25); }
        .btn-base-action.disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; box-shadow: none; }
        .btn-base-action:active:not(.disabled) { transform: scale(0.98); }

        .completed-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #f0fdf4;
          color: #166534;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 600;
          border: 1px solid #bbf7d0;
        }

        .today-timeline h4 { margin: 0 0 1.5rem; font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .timeline-base { position: relative; }
        .timeline-node {
          display: flex;
          gap: 16px;
          margin-bottom: 1.5rem;
          position: relative;
        }
        .timeline-node:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 69px;
          top: 24px;
          width: 2px;
          height: calc(100% - 8px);
          background: #f1f5f9;
        }
        .node-time { width: 60px; font-size: 0.85rem; font-weight: 700; color: #1e293b; text-align: right; }
        .node-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; z-index: 2; border: 2px solid #fff; }
        .node-dot.in { background: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .node-dot.out { background: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1); }
        .node-content .title { margin: 0; font-size: 0.95rem; font-weight: 600; color: #1e293b; }
        .node-content .sub { margin: 2px 0 0; font-size: 0.8rem; color: #64748b; }
        .range-warning {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
          color: #92400e;
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
        }
        .range-warning.danger { color: #b91c1c; }

        /* Secondary Column */
        .calendar-header-base { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .calendar-header-base h3 { margin: 0; font-size: 1rem; }
        .cal-nav { display: flex; gap: 8px; }
        .cal-nav button { background: none; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; cursor: pointer; display: flex; }

        .cal-grid-base { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .cal-day-label { text-align: center; font-size: 0.75rem; font-weight: 700; color: #94a3b8; padding: 8px 0; }
        .cal-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.9rem; border-radius: 8px; position: relative; }
        .cal-day.today { background: #eff6ff; color: #3b82f6; font-weight: 700; }
        .cal-day.has-record { color: #1e293b; font-weight: 600; }
        .record-tick { font-size: 10px; color: #10b981; font-weight: bold; margin-top: 1px; line-height: 1; }
        .mobile-show-only { display: none !important; }

        .summary-card-base { margin-top: 1.5rem; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 1rem; }
        .summary-item { display: flex; flex-direction: column; gap: 4px; }
        .summary-item .label { font-size: 0.75rem; color: #64748b; }
        .summary-item .value { font-size: 1.25rem; font-weight: 700; color: #1e293b; }

        @media (max-width: 768px) {
          .mobile-show-only { display: block !important; }
          .base-main-content {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .base-checkin-wrapper {
            padding: 0 0 100px 0 !important;
          }
          .mobile-hide {
            display: none !important;
          }
          
          /* Compact card on mobile */
          .card {
            padding: 1rem !important;
            border-radius: 10px !important;
          }
          
          /* Compact Header */
          .checkin-header {
            margin-bottom: 1rem !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            gap: 8px !important;
            flex-wrap: nowrap !important;
          }
          .user-info-brief {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-width: 0 !important;
            flex: 1 !important;
          }
          .avatar-placeholder {
            width: 38px !important;
            height: 38px !important;
            flex-shrink: 0 !important;
          }
          .user-text {
            min-width: 0 !important;
            flex: 1 !important;
          }
          .user-text h3 {
            font-size: 0.95rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .user-text p {
            font-size: 0.75rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .status-pill-large {
            padding: 4px 8px !important;
            font-size: 0.7rem !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }
          
          /* Compact Clock */
          .clock-section {
            padding: 0.75rem 0 !important;
            margin-bottom: 1rem !important;
          }
          .time-display {
            font-size: 2.2rem !important;
            letter-spacing: -1px !important;
          }
          .location-status {
            margin-top: 0.5rem !important;
          }
          .location-badge-base {
            padding: 4px 8px !important;
            font-size: 0.75rem !important;
          }
          
          /* GPS/Location Request */
          .location-request-container {
            padding: 1rem !important;
            margin-bottom: 1rem !important;
            border-radius: 10px !important;
          }
          .gps-icon-wrapper {
            width: 48px !important;
            height: 48px !important;
            margin-bottom: 0.5rem !important;
          }
          .gps-icon-wrapper svg {
            width: 24px !important;
            height: 24px !important;
          }
          .location-request-card-premium h3 {
            font-size: 1rem !important;
            margin-bottom: 0.35rem !important;
          }
          .request-desc {
            font-size: 0.75rem !important;
            margin-bottom: 0.75rem !important;
            max-width: 100% !important;
            line-height: 1.4 !important;
          }
          .btn-request-location {
            height: 42px !important;
            font-size: 0.85rem !important;
            border-radius: 8px !important;
          }
          .instructions-toggle {
            margin-top: 0.75rem !important;
            padding-top: 0.75rem !important;
          }
          .instructions-toggle span {
            font-size: 0.75rem !important;
            margin-bottom: 0.25rem !important;
          }
          .instructions-toggle li {
            font-size: 0.7rem !important;
            margin-bottom: 0.25rem !important;
          }
          
          /* Action Buttons */
          .action-buttons-group {
            margin-bottom: 1.25rem !important;
          }
          .btn-base-action {
            height: 46px !important;
            font-size: 0.9rem !important;
            border-radius: 8px !important;
          }
          .completed-banner {
            padding: 0.75rem !important;
            font-size: 0.85rem !important;
            border-radius: 8px !important;
          }
          
          /* Today Timeline */
          .today-timeline h4 {
            margin-bottom: 0.75rem !important;
            font-size: 0.75rem !important;
          }
          .timeline-node {
            margin-bottom: 0.75rem !important;
            gap: 12px !important;
          }
          .timeline-node:not(:last-child)::after {
            left: 57px !important;
            top: 20px !important;
            height: calc(100% - 6px) !important;
          }
          .node-time {
            width: 50px !important;
            font-size: 0.75rem !important;
          }
          .node-dot {
            margin-top: 3px !important;
            width: 8px !important;
            height: 8px !important;
          }
          .node-content .title {
            font-size: 0.85rem !important;
          }
          .node-content .sub {
            font-size: 0.75rem !important;
          }
          .empty-timeline {
            font-size: 0.8rem !important;
            padding: 0.5rem 0 !important;
          }
        }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* GPS/Location Request Styles */
        .location-request-container {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #fee2e2;
          padding: 1.5rem;
          margin-bottom: 2rem;
          animation: fadeIn 0.4s ease-out;
        }
        
        .location-request-card-premium {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .gps-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #fee2e2;
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          position: relative;
        }

        .animate-pulse-ring::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #fee2e2;
          opacity: 0.6;
          animation: pulseRing 1.5s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }

        .gps-icon-icon {
          z-index: 1;
        }

        .location-request-card-premium h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #991b1b;
          margin: 0 0 0.5rem;
        }

        .request-desc {
          font-size: 0.875rem;
          color: #4b5563;
          line-height: 1.5;
          margin: 0 0 1.25rem;
          max-width: 320px;
        }

        .btn-request-location {
          width: 100%;
          height: 48px;
          background: #ef4444;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        .btn-request-location:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        .btn-request-location:active {
          transform: translateY(0);
        }

        .location-badge-base.error-badge {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .instructions-toggle {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px dashed #f3f4f6;
          width: 100%;
          text-align: left;
        }

        .instructions-toggle span {
          font-size: 0.8rem;
          font-weight: 700;
          color: #374151;
          display: block;
          margin-bottom: 0.5rem;
        }

        .instructions-toggle ul {
          margin: 0;
          padding-left: 1rem;
          list-style-type: none;
        }

        .instructions-toggle li {
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.4;
          margin-bottom: 0.35rem;
          position: relative;
        }

        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        .http-warning-banner {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          text-align: center;
          margin-bottom: 12px;
          line-height: 1.4;
          max-width: 320px;
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
