"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { Volume2, VolumeX } from "lucide-react";

interface Registration {
  id: string;
  licensePlate: string;
  driverName: string;
  phoneNumber?: string | null;
  unit: string;
  purpose: string;
  status: string;
  timeIn: string | Date;
  timeOut: string | Date | null;
}

export default function SecurityListView({ initialData }: { initialData: Registration[] }) {
  const [activeTab, setActiveTab] = useState(1);
  const [data, setData] = useState<Registration[]>(initialData);
  const [localLastCalled, setLocalLastCalled] = useState<{ licensePlate: string; clientId: string; timestamp: number } | null>(null);
  const [hasInteracted, setHasInteracted] = useState(true);
  const [currentlySpeakingPlate, setCurrentlySpeakingPlate] = useState<string | null>(null);
  const [callCounts, setCallCounts] = useState<Record<string, number>>({});
  const [activeCallModalPlate, setActiveCallModalPlate] = useState<string | null>(null);
  const clientIdRef = useRef<string>("");

  useEffect(() => {
    clientIdRef.current = Math.random().toString(36).substring(2);
    
    // Asynchronously preload/trigger speech synthesis voices list for iOS/Android mobile compatibility
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

      // Prime the speech engine silently on load/reload to auto-activate sound immediately
      try {
        const silentUtterance = new SpeechSynthesisUtterance("");
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {
        console.warn("Silent speech priming not supported or deferred by browser", e);
      }
    }
  }, []);

  // Listen for initial user gesture to satisfy browser autoplay restrictions
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);
  
  // Real-time Auto Sync
  useRealTimeSync("security-registrations", data, (newData: any) => setData(newData));

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const filteredData = data
    .filter(item => {
      // Tab filtering
      if (activeTab === 1) return item.status === "Đã đăng ký" || item.status === "Đã gọi xe" || item.status === "Đã vào cổng" || item.status === "Đã vào";
      if (activeTab === 2) return item.status === "Đã hoàn thành";
      return false;
    })
    .sort((a, b) => new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime());

  const playVoiceAnnouncement = (licensePlate: string, type: 'can-xe' | 'kho-vat-tu' | 'kho-nguyen-lieu-cua-1' | 'kho-nguyen-lieu-cua-2' = 'can-xe') => {
    // 1. Standardize license plate reading by inserting spaces between letters/numbers
    const cleanPlate = licensePlate.replace(/[^a-zA-Z0-9]/g, ' ').trim().toUpperCase();
    const spacedPlate = cleanPlate.split('').filter(c => c.trim() !== '').join(' ');
    
    // Choose appropriate vocal instruction based on caller request type
    let text = `Xin mời xe số ${spacedPlate} lên cân xe!`;
    if (type === 'kho-vat-tu') {
      text = `Xin mời xe số ${spacedPlate} vào kho vật tư!`;
    } else if (type === 'kho-nguyen-lieu-cua-1') {
      text = `Xin mời xe số ${spacedPlate} vào kho nguyên liệu cửa một!`;
    } else if (type === 'kho-nguyen-lieu-cua-2') {
      text = `Xin mời xe số ${spacedPlate} vào kho nguyên liệu cửa hai!`;
    }

    const speakingKey = `${licensePlate}_${type}`;

    // 2. Prevent overlapping ("bị vang" / echo) by stopping any currently playing audio
    if (typeof window !== 'undefined') {
      const activeAudio = (window as any).currentVehicleAudio;
      if (activeAudio) {
        try {
          activeAudio.pause();
          activeAudio.currentTime = 0;
        } catch (e) {
          console.error("Error stopping active audio:", e);
        }
      }
    }

    setCurrentlySpeakingPlate(speakingKey);

    // 3. Play Google Translate TTS (premium Vietnamese accent, no OS language pack dependencies)
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=vi&client=tw-ob`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = 0.82; // Set standard slow speed for perfect warehouse clarity
    
    if (typeof window !== 'undefined') {
      (window as any).currentVehicleAudio = audio;
    }

    audio.onplay = () => {
      setCurrentlySpeakingPlate(speakingKey);
    };

    audio.onended = () => {
      setCurrentlySpeakingPlate(null);
    };

    audio.onerror = () => {
      // Fallback 1: Local SpeechSynthesis if network issue or blocked
      console.warn("Google TTS stream failed. Falling back to browser SpeechSynthesis.");
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.72; // Slower Vietnamese fallback voice

        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase() === 'vi-vn') || 
                        voices.find(v => v.lang.toLowerCase().startsWith('vi')) || 
                        voices.find(v => v.name.toLowerCase().includes('viet')) ||
                        voices.find(v => v.name.toLowerCase().includes('linh'));
        if (viVoice) {
          utterance.voice = viVoice;
        }

        utterance.onend = () => setCurrentlySpeakingPlate(null);
        utterance.onerror = () => setCurrentlySpeakingPlate(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setCurrentlySpeakingPlate(null);
      }
    };

    audio.play().catch(err => {
      console.warn("Audio element autoplay blocked. Falling back to browser SpeechSynthesis.", err);
      // Fallback 2: Local SpeechSynthesis on browser block
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.72; // Slower Vietnamese fallback voice
        
        utterance.onend = () => setCurrentlySpeakingPlate(null);
        utterance.onerror = () => setCurrentlySpeakingPlate(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setCurrentlySpeakingPlate(null);
      }
    });
  };

  const playTestVoice = () => {
    const text = "Hệ thống âm thanh gọi xe đã kích hoạt thành công!";

    // Prevent overlapping
    if (typeof window !== 'undefined') {
      const activeAudio = (window as any).currentVehicleAudio;
      if (activeAudio) {
        try {
          activeAudio.pause();
          activeAudio.currentTime = 0;
        } catch (e) {}
      }
    }

    setCurrentlySpeakingPlate("TEST_AUDIO_DIAGNOSTIC");

    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=vi&client=tw-ob`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = 0.82; // Comfortable diagnostic speed
    
    if (typeof window !== 'undefined') {
      (window as any).currentVehicleAudio = audio;
    }

    audio.onended = () => {
      setCurrentlySpeakingPlate(null);
    };

    audio.onerror = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.72;
        utterance.onend = () => setCurrentlySpeakingPlate(null);
        utterance.onerror = () => setCurrentlySpeakingPlate(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setCurrentlySpeakingPlate(null);
      }
    };

    audio.play().catch(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.72;
        utterance.onend = () => setCurrentlySpeakingPlate(null);
        utterance.onerror = () => setCurrentlySpeakingPlate(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setCurrentlySpeakingPlate(null);
      }
    });
  };

  // Listen for broadcasted calls from other devices
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/security-call");
        if (res.ok) {
          const serverCall = await res.json();
          if (serverCall && (!localLastCalled || serverCall.timestamp > localLastCalled.timestamp)) {
            setLocalLastCalled(serverCall);
            
            // Only play if it was triggered by a different device/session
            if (localLastCalled && serverCall.clientId !== clientIdRef.current && serverCall.timestamp !== localLastCalled.timestamp) {
              playVoiceAnnouncement(serverCall.licensePlate, serverCall.type);
              // Synchronize call count from other devices in real-time!
              const broadcastSpeakingKey = `${serverCall.licensePlate}_${serverCall.type || 'can-xe'}`;
              setCallCounts(prev => ({
                ...prev,
                [broadcastSpeakingKey]: (prev[broadcastSpeakingKey] || 0) + 1
              }));
            }
          }
        }
      } catch (e) {
        console.error("Error polling security call:", e);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [localLastCalled]);

  const handleCallVehicle = async (licensePlate: string, type: 'can-xe' | 'kho-vat-tu' | 'kho-nguyen-lieu-cua-1' | 'kho-nguyen-lieu-cua-2' = 'can-xe') => {
    const speakingKey = `${licensePlate}_${type}`;

    // If clicking on the active calling button while speaking, cancel and stop it immediately!
    if (currentlySpeakingPlate === speakingKey) {
      if (typeof window !== 'undefined' && (window as any).currentVehicleAudio) {
        try {
          (window as any).currentVehicleAudio.pause();
          (window as any).currentVehicleAudio.currentTime = 0;
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setCurrentlySpeakingPlate(null);
      return;
    }

    // 1. Play local audio immediately for instant user feedback (ONLY if NOT on mobile/phone!)
    const isMobileDevice = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
      window.innerWidth <= 768
    );
    
    if (!isMobileDevice) {
      playVoiceAnnouncement(licensePlate, type);
    }

    // 2. Increment call count for this vehicle plate locally
    setCallCounts(prev => ({
      ...prev,
      [speakingKey]: (prev[speakingKey] || 0) + 1
    }));

    // 3. Set local state immediately to avoid double playing when our own poll returns
    const now = Date.now();
    const mockCall = { licensePlate, clientId: clientIdRef.current, type, timestamp: now };
    setLocalLastCalled(mockCall);

    // 4. Broadcast to all other devices in real-time
    try {
      await fetch("/api/security-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licensePlate, clientId: clientIdRef.current, type })
      });
    } catch (e) {
      console.error("Failed to broadcast call:", e);
    }
  };

  const handleMainCallClick = (licensePlate: string) => {
    const isSpeaking = currentlySpeakingPlate && currentlySpeakingPlate.startsWith(licensePlate);
    if (isSpeaking) {
      if (typeof window !== 'undefined' && (window as any).currentVehicleAudio) {
        try {
          (window as any).currentVehicleAudio.pause();
          (window as any).currentVehicleAudio.currentTime = 0;
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setCurrentlySpeakingPlate(null);
    } else {
      setActiveCallModalPlate(licensePlate);
    }
  };

  return (
    <div style={{ padding: "0" }}>
      <style jsx>{`
        .desktop-only {
          display: block;
        }
        .mobile-list {
          display: none;
        }
        .tab-btn {
          padding: 1rem 2rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: #64748b;
          font-weight: 700;
          transition: all 0.2s;
          cursor: pointer;
        }
        .tab-btn.active {
          border-bottom-color: var(--primary-color);
          color: var(--primary-color);
        }
        .call-btn {
          background: #eff6ff !important;
          border: 1px solid #bfdbfe !important;
          border-radius: 50% !important;
          width: 40px !important;
          height: 40px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          color: #2563eb !important;
          transition: all 0.2s !important;
          outline: none !important;
        }
        .call-btn:hover {
          background: #2563eb !important;
          color: #ffffff !important;
          transform: scale(1.1) !important;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3) !important;
        }
        .call-btn:active {
          transform: scale(0.95) !important;
        }
        @keyframes pulse-call {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .call-btn.speaking {
          background: #ef4444 !important;
          border-color: #fca5a5 !important;
          color: white !important;
          animation: pulse-call 1.5s infinite !important;
        }
        @keyframes row-speak-flash-blue {
          0%, 100% { 
            background-color: rgba(59, 130, 246, 0.05) !important;
            box-shadow: inset 4px 0 0 0 #3b82f6 !important;
          }
          50% { 
            background-color: rgba(59, 130, 246, 0.18) !important;
            box-shadow: inset 6px 0 0 0 #2563eb !important;
          }
        }
        .row-speaking-flash-blue {
          animation: row-speak-flash-blue 1.2s 10 ease-in-out !important;
          font-weight: 600 !important;
        }

        @keyframes speak-card-pulse-blue {
          0%, 100% { 
            border-color: #3b82f6 !important; 
            background-color: #eff6ff !important;
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3) !important;
          }
          50% { 
            border-color: #2563eb !important; 
            background-color: #e0f2fe !important;
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0) !important;
          }
        }
        .mobile-card-speaking-pulse-blue {
          animation: speak-card-pulse-blue 1.2s 10 ease-in-out !important;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-list {
            display: block !important;
            padding-bottom: 130px !important;
          }
          .page-title {
            font-size: 1.2rem !important;
            margin: 0.25rem 0 !important;
            text-align: center;
          }
          .tab-btn {
            padding: 0.75rem 0.5rem !important;
            font-size: 0.85rem !important;
            flex: 1;
            text-align: center;
          }
          .header-row {
            flex-direction: column !important;
            gap: 0.5rem !important;
            align-items: center !important;
            margin-bottom: 0.5rem !important;
          }
          .test-audio-btn {
            font-size: 0.8rem !important;
            padding: 0.3rem 0.8rem !important;
          }
        }
      `}</style>

      {/* Autoplay restriction warning banner */}
      {!hasInteracted && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fef3c7",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          color: "#b45309",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          flexWrap: "wrap",
          gap: "0.5rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🔊</span>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              Hệ thống đang chờ kích hoạt loa phát thanh tự động. Vui lòng bấm "Kích hoạt" để sẵn sàng nhận âm thanh gọi xe từ thiết bị khác!
            </span>
          </div>
          <button 
            onClick={() => {
              setHasInteracted(true);
              playTestVoice();
            }}
            style={{
              background: "#d97706",
              color: "white",
              border: "none",
              borderRadius: "20px",
              padding: "0.4rem 1.2rem",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.85rem",
              transition: "background 0.2s"
            }}
            className="test-speaker-btn"
          >
            Kích hoạt ngay
          </button>
        </div>
      )}

      <div className="content-wrapper">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }} className="header-row">
          <h2 className="page-title" style={{ 
            margin: "0.25rem 0", 
            color: "var(--primary-color)",
            fontSize: "1.8rem",
            fontWeight: 800,
            textTransform: "uppercase"
          }}>
            {activeTab === 1 ? "Danh sách xe đang tại đơn vị" : "Danh sách xe đã ra khỏi đơn vị"}
          </h2>
          <button
            onClick={playTestVoice}
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "20px",
              padding: "0.4rem 1.2rem",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "#2563eb",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.2s"
            }}
            className="test-audio-btn"
          >
            <span>🔊</span> Kiểm tra âm thanh
          </button>
        </div>

        <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: "1rem" }}>
          <button 
            onClick={() => setActiveTab(1)}
            className={`tab-btn ${activeTab === 1 ? "active" : ""}`}
          >
            Xe chưa có giờ ra ({data.filter(i => i.status === "Đã đăng ký" || i.status === "Đã gọi xe" || i.status === "Đã vào cổng" || i.status === "Đã vào").length})
          </button>
          <button 
            onClick={() => setActiveTab(2)}
            className={`tab-btn ${activeTab === 2 ? "active" : ""}`}
          >
            Xe đã có giờ ra ({data.filter(i => i.status === "Đã hoàn thành").length})
          </button>
        </div>
 
        {/* Desktop Table View */}
        <div className="desktop-only table-container" style={{ fontSize: "1rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", width: "140px" }}>Số xe</th>
                <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center" }}>Tên tài xế</th>
                <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", width: "100px" }}>Số điện thoại</th>
                <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", width: "280px" }}>Đơn vị</th>
                <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center" }}>Mục đích</th>
                <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center" }}>Giờ vào</th>
                {activeTab === 2 && <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center" }}>Giờ ra</th>}
                <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", width: "80px" }}>Trạng thái</th>
                <th style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", width: "160px" }}>Gọi xe</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? filteredData.map((item) => {
                const normalizePlate = (p: string) => p.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const isRowSpeaking = currentlySpeakingPlate && (() => {
                  const underscoreIndex = currentlySpeakingPlate.lastIndexOf('_');
                  if (underscoreIndex === -1) return false;
                  const speakingPlate = currentlySpeakingPlate.substring(0, underscoreIndex);
                  return normalizePlate(speakingPlate) === normalizePlate(item.licensePlate);
                })();

                return (
                  <tr key={item.id} className={isRowSpeaking ? "row-speaking-flash-blue" : ""}>
                  <td style={{ fontWeight: 700, fontSize: "16px", color: "var(--primary-color)", textAlign: "center", textTransform: "uppercase" }}>{item.licensePlate}</td>
                  <td style={{ fontSize: "16px", textAlign: "center" }}>{item.driverName}</td>
                  <td style={{ fontSize: "16px", textAlign: "center" }}>{item.phoneNumber || "—"}</td>
                  <td style={{ fontSize: "16px", textAlign: "center" }}>{item.unit}</td>
                  <td style={{ fontSize: "16px", textAlign: "center" }}>{item.purpose}</td>
                  <td style={{ fontSize: "16px", textAlign: "center" }}>
                    {item.status === "Đã đăng ký" || item.status === "Đã vào" 
                      ? "—" 
                      : new Date(item.timeIn).toLocaleTimeString("vi-VN")}
                  </td>
                  {activeTab === 2 && <td style={{ fontSize: "16px", textAlign: "center" }}>{item.timeOut ? new Date(item.timeOut).toLocaleTimeString("vi-VN") : "—"}</td>}
                  <td style={{ textAlign: "center" }}>
                    <span 
                      style={{ 
                        fontSize: "14px", 
                        padding: "0.2rem 0.6rem",
                        borderRadius: "6px",
                        fontWeight: 700,
                        background: (item.status === "Đã đăng ký" || item.status === "Đã vào") 
                          ? "#fef3c7" 
                          : (item.status === "Đã vào cổng")
                            ? "#f5f3ff"
                            : (item.status === "Đã gọi xe" ? "#e0f2fe" : "#dcfce7"),
                        color: (item.status === "Đã đăng ký" || item.status === "Đã vào") 
                          ? "#d97706" 
                          : (item.status === "Đã vào cổng")
                            ? "#7c3aed"
                            : (item.status === "Đã gọi xe" ? "#0284c7" : "#166534"),
                        border: `1px solid ${(item.status === "Đã đăng ký" || item.status === "Đã vào") 
                          ? "#fde68a" 
                          : (item.status === "Đã vào cổng")
                            ? "#ddd6fe" 
                            : (item.status === "Đã gọi xe" ? "#bae6fd" : "#bbf7d0")}`
                      }}
                    >
                      {item.status === "Đã vào" ? "Đã đăng ký" : item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <button 
                        onClick={() => handleMainCallClick(item.licensePlate)}
                        className={`call-btn ${currentlySpeakingPlate && currentlySpeakingPlate.startsWith(item.licensePlate) ? "speaking" : ""}`}
                        title={currentlySpeakingPlate && currentlySpeakingPlate.startsWith(item.licensePlate) ? "Dừng gọi" : "Gọi xe"}
                      >
                        {currentlySpeakingPlate && currentlySpeakingPlate.startsWith(item.licensePlate) ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                      {(() => {
                        const totalCalls = (callCounts[`${item.licensePlate}_can-xe`] || 0) +
                                           (callCounts[`${item.licensePlate}_kho-vat-tu`] || 0) +
                                           (callCounts[`${item.licensePlate}_kho-nguyen-lieu-cua-1`] || 0) +
                                           (callCounts[`${item.licensePlate}_kho-nguyen-lieu-cua-2`] || 0);
                        if (totalCalls === 0) return null;
                        return (
                          <span style={{ 
                            fontSize: "1rem", 
                            fontWeight: 800, 
                            color: "#ef4444", 
                            background: "#fee2e2", 
                            padding: "2px 8px", 
                            borderRadius: "999px", 
                            border: "1px solid #fca5a5" 
                          }}>
                            {totalCalls}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              );
            }) : (
                <tr>
                  <td colSpan={activeTab === 2 ? 9 : 8} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Không có dữ liệu phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card list View */}
        <div className="mobile-list">
          {filteredData.length > 0 ? filteredData.map((item) => {
            const normalizePlate = (p: string) => p.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const isRowSpeaking = currentlySpeakingPlate && (() => {
              const underscoreIndex = currentlySpeakingPlate.lastIndexOf('_');
              if (underscoreIndex === -1) return false;
              const speakingPlate = currentlySpeakingPlate.substring(0, underscoreIndex);
              return normalizePlate(speakingPlate) === normalizePlate(item.licensePlate);
            })();

            return (
              <div 
                key={item.id} 
                className={isRowSpeaking ? "mobile-card-speaking-pulse-blue" : ""}
                style={{ 
                  background: "white", 
                  padding: "0.8rem 1rem", 
                  borderRadius: "8px", 
                  marginBottom: "0.75rem", 
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  position: "relative"
                }}
              >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--primary-color)", lineHeight: 1.3, textTransform: "uppercase" }}>{item.licensePlate}</div>
                  <div style={{ fontWeight: 600, fontSize: "1.0rem", color: "#1e293b", marginTop: "4px" }}>{item.driverName}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button 
                    onClick={() => handleMainCallClick(item.licensePlate)}
                    className={`call-btn ${currentlySpeakingPlate && currentlySpeakingPlate.startsWith(item.licensePlate) ? "speaking" : ""}`}
                    style={{ width: "36px", height: "36px" }}
                    title={currentlySpeakingPlate && currentlySpeakingPlate.startsWith(item.licensePlate) ? "Dừng gọi" : "Gọi xe"}
                  >
                    {currentlySpeakingPlate && currentlySpeakingPlate.startsWith(item.licensePlate) ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  {(() => {
                    const totalCalls = (callCounts[`${item.licensePlate}_can-xe`] || 0) +
                                       (callCounts[`${item.licensePlate}_kho-vat-tu`] || 0) +
                                       (callCounts[`${item.licensePlate}_kho-nguyen-lieu-cua-1`] || 0) +
                                       (callCounts[`${item.licensePlate}_kho-nguyen-lieu-cua-2`] || 0);
                    if (totalCalls === 0) return null;
                    return (
                      <span style={{ 
                        fontSize: "0.85rem", 
                        fontWeight: 800, 
                        color: "#ef4444", 
                        background: "#fee2e2", 
                        padding: "2px 6px", 
                        borderRadius: "999px", 
                        border: "1px solid #fca5a5" 
                      }}>
                        {totalCalls}
                      </span>
                    );
                  })()}
                </div>
              </div>
              
              <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 600 }}>ĐƠN VỊ:</span> {item.unit}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>MỤC ĐÍCH:</span> {item.purpose}
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
                <div>
                  <span 
                    style={{ 
                      fontSize: "0.75rem", 
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontWeight: 700,
                      background: (item.status === "Đã đăng ký" || item.status === "Đã vào") 
                        ? "#fef3c7" 
                        : (item.status === "Đã vào cổng")
                          ? "#f5f3ff"
                          : (item.status === "Đã gọi xe" ? "#e0f2fe" : "#dcfce7"),
                      color: (item.status === "Đã đăng ký" || item.status === "Đã vào") 
                        ? "#d97706" 
                        : (item.status === "Đã vào cổng")
                          ? "#7c3aed"
                          : (item.status === "Đã gọi xe" ? "#0284c7" : "#166534"),
                      border: `1px solid ${(item.status === "Đã đăng ký" || item.status === "Đã vào") 
                        ? "#fde68a" 
                        : (item.status === "Đã vào cổng")
                          ? "#ddd6fe" 
                          : (item.status === "Đã gọi xe" ? "#bae6fd" : "#bbf7d0")}`,
                      display: "inline-block"
                    }}
                  >
                    {item.status === "Đã vào" ? "Đã đăng ký" : item.status}
                  </span>
                </div>
                <div>
                  <span>Vào: {item.status === "Đã đăng ký" || item.status === "Đã vào" ? "—" : new Date(item.timeIn).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                  {activeTab === 2 && item.timeOut && (
                    <span style={{ marginLeft: "0.5rem" }}>- Ra: {new Date(item.timeOut).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              Không có dữ liệu phù hợp
            </div>
          )}
        </div>

      </div>

      {/* Premium Glassmorphism Call Modal Overlay */}
      {activeCallModalPlate && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            animation: "fadeIn 0.2s ease-out"
          }}>
            {/* Modal Header */}
            <div style={{
              background: "linear-gradient(135deg, var(--primary-color) 0%, #1e3a8a 100%)",
              padding: "1.5rem",
              color: "#ffffff",
              position: "relative"
            }} className="modal-header-container">
              <button 
                onClick={() => setActiveCallModalPlate(null)}
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  transition: "background 0.2s"
                }}
              >
                ✕
              </button>
              <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Gọi loa điều phối xe
              </h3>
              <div style={{ 
                marginTop: "0.5rem", 
                fontSize: "1.8rem", 
                fontWeight: 900, 
                color: "#fef08a", 
                textTransform: "uppercase" 
              }} className="modal-plate-title">
                {activeCallModalPlate}
              </div>
              {(() => {
                const driverInfo = data.find(d => d.licensePlate === activeCallModalPlate);
                if (!driverInfo) return null;
                return (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.95rem", opacity: 0.9, display: "flex", gap: "1rem" }} className="modal-driver-info">
                    <span>👤 Tài xế: <strong>{driverInfo.driverName}</strong></span>
                    <span>🏢 Đơn vị: <strong>{driverInfo.unit}</strong></span>
                  </div>
                );
              })()}
            </div>

            {/* Modal Body: Calling Actions Grid */}
            <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }} className="modal-body-container">
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "1rem"
              }} className="call-grid">
                {[
                  { type: "can-xe", label: "Gọi cân xe", icon: "⚖️", bg: "#eff6ff", border: "#bfdbfe" },
                  { type: "kho-vat-tu", label: "Gọi vào kho vật tư", icon: "📦", bg: "#ecfdf5", border: "#a7f3d0" },
                  { type: "kho-nguyen-lieu-cua-1", label: "Gọi vào kho nguyên liệu cửa 1", icon: "🚪 1", bg: "#fffbeb", border: "#fef3c7" },
                  { type: "kho-nguyen-lieu-cua-2", label: "Gọi vào kho nguyên liệu cửa 2", icon: "🚪 2", bg: "#f5f3ff", border: "#ddd6fe" }
                ].map((opt) => {
                  const speakKey = `${activeCallModalPlate}_${opt.type}`;
                  const isSpeaking = currentlySpeakingPlate === speakKey;
                  const count = callCounts[speakKey] || 0;

                  return (
                    <button
                      key={opt.type}
                      onClick={() => handleCallVehicle(activeCallModalPlate, opt.type as any)}
                      className={`call-option-card ${isSpeaking ? 'speaking-pulse' : ''}`}
                      style={{
                        background: isSpeaking ? "#ef4444" : opt.bg,
                        border: `2px solid ${isSpeaking ? "#fca5a5" : opt.border}`,
                        borderRadius: "12px",
                        padding: "1.25rem 1rem",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        position: "relative",
                        outline: "none",
                        color: isSpeaking ? "#ffffff" : "#1e293b"
                      }}
                    >
                      {count > 0 && (
                        <span style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: isSpeaking ? "#ffffff" : "#ef4444",
                          color: isSpeaking ? "#ef4444" : "#ffffff",
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                          {count}
                        </span>
                      )}

                      <span style={{ fontSize: "2rem" }}>
                        {isSpeaking ? "🔊" : opt.icon}
                      </span>
                      
                      <span style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        lineHeight: 1.3
                      }}>
                        {opt.label}
                      </span>

                      {isSpeaking && (
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          opacity: 0.9,
                          textTransform: "uppercase"
                        }}>
                          Đang phát loa... Bấm dừng
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              background: "#f8fafc",
              padding: "1rem 1.5rem",
              display: "flex",
              justifyContent: "flex-end",
              borderTop: "1px solid #e2e8f0"
            }}>
              <button
                onClick={() => setActiveCallModalPlate(null)}
                style={{
                  background: "#64748b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.6rem 1.5rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  transition: "background 0.2s"
                }}
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Custom Keyframe Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .call-option-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }
        .call-option-card:active {
          transform: translateY(0);
        }
        @keyframes speaking-pulse-anim {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .speaking-pulse {
          animation: speaking-pulse-anim 1.5s infinite !important;
        }
        @media (max-width: 480px) {
          .call-option-card {
            padding: 0.75rem 0.5rem !important;
            gap: 0.25rem !important;
          }
          .call-option-card span:first-of-type {
            font-size: 1.25rem !important;
          }
          .call-option-card span:nth-of-type(2) {
            font-size: 0.8rem !important;
          }
          .call-grid {
            gap: 0.5rem !important;
          }
          .modal-plate-title {
            font-size: 1.35rem !important;
          }
          .modal-header-container {
            padding: 1rem !important;
          }
          .modal-body-container {
            padding: 1rem !important;
          }
          .modal-driver-info {
            flex-direction: column !important;
            gap: 0.25rem !important;
            font-size: 0.85rem !important;
          }
        }
      `}</style>
    </div>
  );
}
