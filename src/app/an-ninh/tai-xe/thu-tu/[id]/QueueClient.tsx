"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Clock, Volume2, Bell } from "lucide-react";

interface QueueClientProps {
  licensePlate: string;
  registrationId: string;
  initialIsCompleted: boolean;
}

// Persist the calling history and completion status at the browser module level.
// This prevents React state/ref resets when Next.js unmounts/re-mounts the component during `router.refresh()`.
let globalLastBeepedTimestamp: number | null = null;
let globalIsCompleted = false;

// Function to synthesize clean sine wave beep(s) inside a single binary WAV file and return as Base64 Data URI
function generateWavBeepBase64(frequency = 980, duration = 0.2, isSilence = false, numBeeps = 1) {
  try {
    const sampleRate = 8000;
    
    let totalSamples = 0;
    let singleCycleSamples = 0;
    let beepSamples = 0;

    if (numBeeps > 1) {
      const beepDuration = 0.25;
      const gapDuration = 0.75;
      beepSamples = Math.floor(sampleRate * beepDuration);
      singleCycleSamples = Math.floor(sampleRate * (beepDuration + gapDuration));
      totalSamples = singleCycleSamples * numBeeps;
    } else {
      totalSamples = Math.floor(sampleRate * duration);
    }

    const buffer = new Uint8Array(44 + totalSamples);

    // 1. RIFF Header
    buffer[0] = 0x52; buffer[1] = 0x49; buffer[2] = 0x46; buffer[3] = 0x46; // "RIFF"
    const fileSize = 36 + totalSamples;
    buffer[4] = fileSize & 0xff;
    buffer[5] = (fileSize >> 8) & 0xff;
    buffer[6] = (fileSize >> 16) & 0xff;
    buffer[7] = (fileSize >> 24) & 0xff;
    buffer[8] = 0x57; buffer[9] = 0x41; buffer[10] = 0x56; buffer[11] = 0x45; // "WAVE"

    // 2. Format Chunk ("fmt ")
    buffer[12] = 0x66; buffer[13] = 0x6d; buffer[14] = 0x74; buffer[15] = 0x20; 
    buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0; // Chunk Size (16)
    buffer[20] = 1; buffer[21] = 0; // Audio Format (1 = Uncompressed PCM)
    buffer[22] = 1; buffer[23] = 0; // Number of Channels (1 = Mono)
    buffer[24] = sampleRate & 0xff;
    buffer[25] = (sampleRate >> 8) & 0xff;
    buffer[26] = (sampleRate >> 16) & 0xff;
    buffer[27] = (sampleRate >> 24) & 0xff;
    const byteRate = sampleRate; // sampleRate * channels * bitsPerSample / 8
    buffer[28] = byteRate & 0xff;
    buffer[29] = (byteRate >> 8) & 0xff;
    buffer[30] = (byteRate >> 16) & 0xff;
    buffer[31] = (byteRate >> 24) & 0xff;
    buffer[32] = 1; buffer[33] = 0; // Block Align (1)
    buffer[34] = 8; buffer[35] = 0; // Bits Per Sample (8)

    // 3. Data Chunk Header
    buffer[36] = 0x64; buffer[37] = 0x61; buffer[38] = 0x74; buffer[39] = 0x61; // "data"
    buffer[40] = totalSamples & 0xff;
    buffer[41] = (totalSamples >> 8) & 0xff;
    buffer[42] = (totalSamples >> 16) & 0xff;
    buffer[43] = (totalSamples >> 24) & 0xff;

    // 4. Generate Pure Sine Wave or Silence
    for (let i = 0; i < totalSamples; i++) {
      if (isSilence) {
        buffer[44 + i] = 128; // 128 is absolute silence in 8-bit PCM
      } else if (numBeeps > 1) {
        const sampleInCycle = i % singleCycleSamples;
        if (sampleInCycle < beepSamples) {
          const angle = (2 * Math.PI * frequency * sampleInCycle) / sampleRate;
          buffer[44 + i] = Math.floor(128 + 120 * Math.sin(angle));
        } else {
          buffer[44 + i] = 128; // Silence interval between beeps
        }
      } else {
        const angle = (2 * Math.PI * frequency * i) / sampleRate;
        buffer[44 + i] = Math.floor(128 + 120 * Math.sin(angle));
      }
    }

    // Convert binary buffer to standard Base64 string
    let binary = "";
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return "data:audio/wav;base64," + btoa(binary);
  } catch (e) {
    console.error("Failed to generate WAV beep:", e);
    return "";
  }
}

export default function QueueClient({ licensePlate, registrationId, initialIsCompleted }: QueueClientProps) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [showAutoplayModal, setShowAutoplayModal] = useState(false);

  const initializeAudioElements = () => {
    try {
      setIsAudioEnabled(true);
      const tinyBeep = generateWavBeepBase64(980, 0.01);

      // 1. Initialize and play/pause the beep Audio element (permanently unblocking it)
      if (!beepAudioRef.current && tinyBeep) {
        const bAudio = new Audio(tinyBeep);
        bAudio.play().then(() => bAudio.pause()).catch(() => {});
        beepAudioRef.current = bAudio;
      }

      // 2. Initialize and play/pause the TTS Audio element (permanently unblocking it)
      if (!ttsAudioRef.current && tinyBeep) {
        const tAudio = new Audio(tinyBeep);
        tAudio.play().then(() => tAudio.pause()).catch(() => {});
        ttsAudioRef.current = tAudio;
      }

      // 3. Initialize and trigger the background silent keep-alive loop
      if (!silentAudioRef.current) {
        const silentUri = generateWavBeepBase64(0, 5.0, true);
        if (silentUri) {
          const sAudio = new Audio(silentUri);
          sAudio.loop = true;
          silentAudioRef.current = sAudio;
          sAudio.play().then(() => {
            console.log("Background audio keep-alive loop activated.");
            
            // Register Web MediaSession to keep standard background timers running at 100% speed
            if ("mediaSession" in navigator) {
              const MediaMetadataClass = (window as any).MediaMetadata || (global as any).MediaMetadata;
              if (MediaMetadataClass) {
                navigator.mediaSession.metadata = new MediaMetadataClass({
                  title: "Hàng Đợi Xe SAPO EMS",
                  artist: "SAPO Security",
                  album: "Hệ thống đang chạy ngầm..."
                });
              }
            }
          }).catch(e => {
            console.warn("Silent loop play failed:", e);
          });
        }
      }

      // Request notification permission during user interaction
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {
      console.error("Audio initialization error:", e);
    }
  };

  const [isActivating, setIsActivating] = useState(false);

  const handleActivateAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActivating) return;
    setIsActivating(true);
    
    // 1. Unblock browser audio immediately
    initializeAudioElements();
    
    // 2. Play a single gentle confirmation beep (0.15s) synchronously so the browser gesture token is active
    playBeep(980, 0.15, 1);

    // 3. Automatically close the modal after exactly 2 seconds (2000ms)
    setTimeout(() => {
      setShowAutoplayModal(false);
      setIsActivating(false);
    }, 2000);
  };
  
  // Persistent refs to unmuted, pre-unlocked Audio elements to bypass Safari/Chrome async blocks
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play standard HTML5 Audio beep reusing the unlocked Audio element
  const playBeep = (frequency = 980, duration = 0.2, numBeeps = 1) => {
    try {
      const audio = beepAudioRef.current;
      if (!audio) return;

      const dataUri = generateWavBeepBase64(frequency, duration, false, numBeeps);
      if (!dataUri) return;
      
      audio.src = dataUri;
      audio.play().catch((err) => {
        console.warn("Reused beep audio play was blocked:", err);
      });
    } catch (e) {
      console.error("HTML5 Audio play failed:", e);
    }
  };

  // Play premium natural Vietnamese text-to-speech voice announcement
  const playVoiceAnnouncement = (plate: string, type: string) => {
    try {
      const audio = ttsAudioRef.current;
      if (!audio) return;

      // Spaced plate reading for natural pronunciation
      const cleanPlate = plate.replace(/[^a-zA-Z0-9]/g, ' ').trim().toUpperCase();
      const spacedPlate = cleanPlate.split('').filter(c => c.trim() !== '').join(' ');
      
      let text = `Xin mời xe số ${spacedPlate} lên cân xe!`;
      if (type === 'kho-vat-tu') {
        text = `Xin mời xe số ${spacedPlate} vào kho vật tư!`;
      } else if (type === 'kho-nguyen-lieu-cua-1') {
        text = `Xin mời xe số ${spacedPlate} vào kho nguyên liệu cửa một!`;
      } else if (type === 'kho-nguyen-lieu-cua-2') {
        text = `Xin mời xe số ${spacedPlate} vào kho nguyên liệu cửa hai!`;
      }

      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=vi&client=tw-ob`;
      
      audio.src = audioUrl;
      audio.play().catch((err) => {
        console.warn("Reused Google TTS failed. Falling back to native SpeechSynthesis:", err);
        
        // Offline Browser fallback SpeechSynthesis
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'vi-VN';
          utterance.rate = 0.85;
          window.speechSynthesis.speak(utterance);
        }
      });
    } catch (e) {
      console.error("TTS Audio play failed:", e);
    }
  };

  // Play 5 beeps in 5 seconds alert and follow with loud premium Vietnamese voice callout
  const triggerAlertSequence = (type: string) => {
    // 1. Play the pre-compiled 5-beep sequence WAV (exactly 5 seconds total) in one single play!
    playBeep(980, 0.2, 5);

    // 2. Sound physical phone vibration 5 times (matching 1-second intervals in sync)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([
        250, 750, // Buzz 1 (250ms), wait (750ms)
        250, 750, // Buzz 2 (250ms), wait (750ms)
        250, 750, // Buzz 3 (250ms), wait (750ms)
        250, 750, // Buzz 4 (250ms), wait (750ms)
        250       // Buzz 5 (250ms)
      ]);
    }

    // 3. Trigger native System Notification to alert user if in background or another app
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      let callName = "Cân xe";
      if (type === 'kho-vat-tu') callName = "Kho vật tư";
      else if (type === 'kho-nguyen-lieu-cua-1') callName = "Kho nguyên liệu cửa 1";
      else if (type === 'kho-nguyen-lieu-cua-2') callName = "Kho nguyên liệu cửa 2";

      new Notification("🔔 SAPO EMS: BÁO GỌI XE!", {
        body: `Xe biển số ${licensePlate} - XIN MỜI VÀO: ${callName.toUpperCase()}!`,
        requireInteraction: true,
        tag: `sapo-call-${registrationId}`,
        renotify: true
      } as any);
    }

    // 4. Play Vietnamese voice announcement after 5 beeps finish (5.1s delay)
    setTimeout(() => {
      playVoiceAnnouncement(licensePlate, type);
    }, 5100);
  };

  // Initialize module-level completed state on mount or prop change
  useEffect(() => {
    globalIsCompleted = initialIsCompleted;
  }, [initialIsCompleted]);

  // Show autoplay modal on mount if audio is not enabled
  useEffect(() => {
    if (!isAudioEnabled) {
      setShowAutoplayModal(true);
    }
  }, []);

  // Silent automatic warm-up on user interaction anywhere on the screen
  useEffect(() => {
    const unlockAudioSilently = () => {
      initializeAudioElements();
      window.removeEventListener("click", unlockAudioSilently);
      window.removeEventListener("touchstart", unlockAudioSilently);
    };

    window.addEventListener("click", unlockAudioSilently);
    window.addEventListener("touchstart", unlockAudioSilently);

    return () => {
      window.removeEventListener("click", unlockAudioSilently);
      window.removeEventListener("touchstart", unlockAudioSilently);
    };
  }, []);

  // Keep background audio active when tab changes focus or locks
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (silentAudioRef.current && silentAudioRef.current.paused && isAudioEnabled) {
          silentAudioRef.current.play().catch(() => {});
        }
      }
    };

    // Periodic safety check: keep audio context & loop active every 10 seconds
    const safetyId = setInterval(() => {
      if (silentAudioRef.current && silentAudioRef.current.paused && isAudioEnabled) {
        silentAudioRef.current.play().catch(() => {});
      }
    }, 10000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(safetyId);
    };
  }, [isAudioEnabled]);

  // 🔄 High-frequency 3-second client polling that bypasses Server Component caches completely
  useEffect(() => {
    const pollQueueStatus = async () => {
      try {
        const res = await fetch(
          `/api/public-security-call?licensePlate=${encodeURIComponent(licensePlate)}&id=${registrationId}&_t=${Date.now()}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();

        // 1. Process called status using browser module global persistence
        if (data.calledInfo) {
          const newTimestamp = data.calledInfo.timestamp;
          if (globalLastBeepedTimestamp === null || newTimestamp > globalLastBeepedTimestamp) {
            globalLastBeepedTimestamp = newTimestamp;
            triggerAlertSequence(data.calledInfo.type);
            setIsAudioEnabled(true);
            router.refresh(); // Refresh page's Server Component markup to show called step in green
          }
        } else {
          globalLastBeepedTimestamp = null;
        }

        // 2. Process marked completed status
        const isNowCompleted = data.status === "Đã hoàn thành";
        if (isNowCompleted !== globalIsCompleted) {
          globalIsCompleted = isNowCompleted;
          router.refresh();
        }
      } catch (e) {
        console.error("High-frequency polling error:", e);
      }
    };

    pollQueueStatus(); // Trigger immediately on load
    const intervalId = setInterval(pollQueueStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [licensePlate, registrationId]);

  // Periodic refresh timer (10 seconds) for visual progress bar sync
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          handleRefresh();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setSeconds(10);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Test beep handler
  const handleManualTestBeep = () => {
    setIsAudioEnabled(true);
    triggerAlertSequence("can-xe");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.4rem" }}>
      
      {/* Autoplay Warning Pulsing Banner */}
      {!isAudioEnabled && (
        <div 
          onClick={handleManualTestBeep}
          className="pulse-container"
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "2px dashed #d97706",
            borderRadius: "10px",
            padding: "0.55rem 0.65rem",
            textAlign: "center",
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(217, 119, 6, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.2rem",
            marginBottom: "0.15rem",
            transition: "all 0.2s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Bell size={16} className="shake-animation" color="#d97706" />
            <strong style={{ fontSize: "0.78rem", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.02em" }}>
              Loa & Chuông chưa bật!
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#d97706", fontWeight: 700, lineHeight: 1.3 }}>
            Chạm vào ĐÂY ngay để kích hoạt chuông báo gọi xe tự động.
          </p>
        </div>
      )}

      {/* Sound Status Bar / Manual Beep Test */}
      <div
        onClick={handleManualTestBeep}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isAudioEnabled ? "#f0fdf4" : "#fffbeb",
          border: isAudioEnabled ? "1px solid #bbf7d0" : "1px solid #fef3c7",
          padding: "0.35rem 0.6rem",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {isAudioEnabled ? (
            <>
              <Volume2 size={15} color="#15803d" />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#15803d" }}>
                Chuông báo & Loa: Đang hoạt động
              </span>
            </>
          ) : (
            <>
              <Bell size={15} className="shake-animation" color="#b45309" />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#b45309" }}>
                Chuông báo: Đang kích hoạt tự động...
              </span>
            </>
          )}
        </div>
        <span style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: isAudioEnabled ? "#166534" : "#92400e",
          background: isAudioEnabled ? "#dcfce7" : "#fef3c7",
          padding: "0.15rem 0.4rem",
          borderRadius: "4px"
        }}>
          Bíp Thử
        </span>
      </div>

      {/* Auto Refresh Row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#f8fafc",
        padding: "0.4rem 0.6rem",
        borderRadius: "10px",
        border: "1px solid #e2e8f0"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
          <Clock size={14} />
          <span>Tự động cập nhật sau <strong style={{ color: "#0284c7" }}>{seconds}s</strong></span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            background: "white",
            border: "1px solid #cbd5e1",
            padding: "0.3rem 0.6rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#334155",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <RefreshCw size={12} className={isRefreshing ? "spin-animation" : ""} />
          {isRefreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* Autoplay Activation Modal Overlay */}
      {showAutoplayModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "white",
            width: "100%",
            maxWidth: "360px",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.8rem",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{
              background: "#fffbeb",
              border: "2px dashed #f59e0b",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d97706",
              marginBottom: "0.2rem"
            }}>
              <Bell size={24} className="shake-animation" />
            </div>
            
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
              KÍCH HOẠT CHUÔNG BÁO XE
            </h3>
            
            <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, lineHeight: 1.45, fontWeight: 500 }}>
              Để tránh bị trễ giờ gọi xe, vui lòng nhấn nút bên dưới để <strong>BẬT LOA & BÍP THỬ</strong> âm thanh hệ thống ngay lập tức!
            </p>

            <button
              onClick={handleActivateAudio}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              disabled={isActivating}
              style={{
                width: "100%",
                background: isActivating 
                  ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" 
                  : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: isActivating ? "default" : "pointer",
                boxShadow: isActivating 
                  ? "0 4px 12px rgba(22, 163, 74, 0.25)" 
                  : "0 4px 12px rgba(2, 132, 199, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                marginTop: "0.4rem",
                transition: "all 0.2s"
              }}
            >
              {isActivating ? (
                <>
                  <Volume2 size={16} className="spin-animation" style={{ animation: "spin 1s linear infinite" }} />
                  ĐANG BÍP THỬ...
                </>
              ) : (
                <>
                  <Volume2 size={16} />
                  BẬT LOA & BÍP THỬ NGAY
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        :global(.spin-animation) {
          animation: spin 0.8s linear infinite;
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        :global(.shake-animation) {
          animation: shake 0.6s ease-in-out infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); transform: scale(1); }
          70% { box-shadow: 0 0 0 8px rgba(217, 119, 6, 0); transform: scale(1.01); }
          100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); transform: scale(1); }
        }
        .pulse-container {
          animation: pulse 1.8s infinite;
        }
      `}</style>
    </div>
  );
}
