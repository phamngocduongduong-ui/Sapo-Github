"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import {
  createRegistration,
  updateRegistration,
  deleteRegistration,
  confirmExit,
  confirmEntry,
  undoStatus
} from "../actions";
import { Plus, RotateCcw, Filter, Pencil, Trash2, CheckCircle, Undo2, Search, MoreHorizontal, Clock, LogIn, Volume2, VolumeX } from "lucide-react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

interface Registration {
  id: string;
  createdAt: string | Date;
  licensePlate: string;
  driverName: string;
  idCardNumber: string;
  phoneNumber?: string | null;
  unit: string;
  purpose: string;
  status: string;
  timeIn: string | Date;
  timeOut: string | Date | null;
  note: string | null;
  creator: string | null;
  updatedAt?: string | Date | null;
}

const PURPOSES = ["Giao nguyên liệu", "Công tác", "Giao vật tư", "Nhà thầu thi công", "Giao khác"];

export default function SecurityRegistrationTable({
  initialData,
  isAdmin,
  currentUserName
}: {
  initialData: Registration[],
  isAdmin: boolean,
  currentUserName: string
}) {
  const router = useRouter();
  const [data, setData] = useState<Registration[]>(initialData);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Registration | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  // Date filter: defaults to current date (YYYY-MM-DD) in local time
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string, licensePlate: string, driverName: string } | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryData, setEntryData] = useState<{ id: string, licensePlate: string, driverName: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteData, setDeleteData] = useState<{ id: string, licensePlate: string, driverName: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  const [showQrModal, setShowQrModal] = useState(false);

  // Progress tracker modal states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressItem, setProgressItem] = useState<Registration | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);

  const handleViewProgress = async (item: Registration) => {
    setProgressItem(item);
    setShowProgressModal(true);
    setProgressLoading(true);
    setProgressData(null);
    try {
      const cleanPlate = encodeURIComponent(item.licensePlate.trim().toUpperCase());
      const res = await fetch(`/api/public-security-call?licensePlate=${cleanPlate}&_t=${Date.now()}`);
      if (res.ok) {
        const payload = await res.json();
        setProgressData(payload);
      }
    } catch (err) {
      console.error("Error fetching progress data:", err);
    } finally {
      setProgressLoading(false);
    }
  };

  // Voice Calling & Sound Broadcast States
  const [localLastCalled, setLocalLastCalled] = useState<{ licensePlate: string; clientId: string; timestamp: number } | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [currentlySpeakingPlate, setCurrentlySpeakingPlate] = useState<string | null>(null);
  const clientIdRef = useRef<string>("");

  useEffect(() => {
    clientIdRef.current = Math.random().toString(36).substring(2);
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

      try {
        const silentUtterance = new SpeechSynthesisUtterance("");
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {
        console.warn("Silent speech priming not supported or deferred by browser", e);
      }
    }
  }, []);

  const playVoiceAnnouncement = (licensePlate: string, type: 'can-xe' | 'kho-vat-tu' | 'kho-nguyen-lieu-cua-1' | 'kho-nguyen-lieu-cua-2' = 'can-xe') => {
    const cleanPlate = licensePlate.replace(/[^a-zA-Z0-9]/g, ' ').trim().toUpperCase();
    const spacedPlate = cleanPlate.split('').filter(c => c.trim() !== '').join(' ');
    
    let text = `Xin mời xe số ${spacedPlate} lên cân xe!`;
    if (type === 'kho-vat-tu') {
      text = `Xin mời xe số ${spacedPlate} vào kho vật tư!`;
    } else if (type === 'kho-nguyen-lieu-cua-1') {
      text = `Xin mời xe số ${spacedPlate} vào kho nguyên liệu cửa một!`;
    } else if (type === 'kho-nguyen-lieu-cua-2') {
      text = `Xin mời xe số ${spacedPlate} vào kho nguyên liệu cửa hai!`;
    }

    const speakingKey = `${licensePlate}_${type}`;

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

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/security-call");
        if (res.ok) {
          const serverCall = await res.json();
          if (serverCall && (!localLastCalled || serverCall.timestamp > localLastCalled.timestamp)) {
            setLocalLastCalled(serverCall);
            
            if (localLastCalled && serverCall.clientId !== clientIdRef.current && serverCall.timestamp !== localLastCalled.timestamp) {
              if (!isMuted) {
                playVoiceAnnouncement(serverCall.licensePlate, serverCall.type);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error polling security call:", e);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [localLastCalled, isMuted]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Real-time Auto Sync
  useRealTimeSync("security-registrations", data, (newData: any) => setData(newData));

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleClose = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleEdit = (item: Registration) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = (id: string, licensePlate: string, driverName: string) => {
    setDeleteData({ id, licensePlate, driverName });
    setShowDeleteModal(true);
  };

  const processDelete = async () => {
    if (!deleteData) return;
    startTransition(async () => {
      const res = await deleteRegistration(deleteData.id);
      if (res.success) {
        setShowDeleteModal(false);
        router.refresh();
      } else alert(res.error);
    });
  };

  const handleConfirmExit = (id: string, licensePlate: string, driverName: string) => {
    setConfirmData({ id, licensePlate, driverName });
    setShowConfirmModal(true);
  };

  const processConfirmExit = async () => {
    if (!confirmData) return;
    startTransition(async () => {
      const res = await confirmExit(confirmData.id);
      if (res.success) {
        setShowConfirmModal(false);
        router.refresh();
      } else alert(res.error);
    });
  };

  const handleConfirmEntry = (id: string, licensePlate: string, driverName: string) => {
    setEntryData({ id, licensePlate, driverName });
    setShowEntryModal(true);
  };

  const processConfirmEntry = async () => {
    if (!entryData) return;
    startTransition(async () => {
      const res = await confirmEntry(entryData.id);
      if (res.success) {
        setShowEntryModal(false);
        router.refresh();
      } else alert(res.error);
    });
  };

  const handleUndo = async (id: string) => {
    if (!confirm("Hoàn tác trạng thái về 'Đã đăng ký'?")) return;
    startTransition(async () => {
      const res = await undoStatus(id);
      if (res.success) router.refresh();
      else alert(res.error);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      licensePlate: (formData.get("licensePlate") as string)?.toUpperCase(),
      driverName: (formData.get("driverName") as string)?.toUpperCase(),
      idCardNumber: (formData.get("idCardNumber") as string)?.toUpperCase(),
      phoneNumber: (formData.get("phoneNumber") as string),
      unit: (formData.get("unit") as string)?.toUpperCase(),
      purpose: (formData.get("purpose") as string),
      note: formData.get("note"),
      creator: editingItem?.creator || currentUserName,
    };

    startTransition(async () => {
      let res;
      if (editingItem) {
        res = await updateRegistration(editingItem.id, payload);
      } else {
        res = await createRegistration(payload);
      }
      if (res.success) {
        handleClose();
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  // Date filtering logic
  const dateFilteredData = data.filter(item => {
    if (selectedDate) {
      const dateToCheck = item.timeIn || item.createdAt;
      const itemDate = new Date(dateToCheck);
      const year = itemDate.getFullYear();
      const month = String(itemDate.getMonth() + 1).padStart(2, "0");
      const day = String(itemDate.getDate()).padStart(2, "0");
      const itemDateStr = `${year}-${month}-${day}`;
      if (itemDateStr !== selectedDate) return false;
    }
    return true;
  });

  const filteredData = dateFilteredData
    .filter(item => {
      const matchSearch = item.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      // Tab filtering
      if (activeTab === 1) return item.status === "Đã đăng ký" || item.status === "Đã gọi xe" || item.status === "Đã vào cổng" || item.status === "Đã vào";
      if (activeTab === 2) return item.status === "Đã hoàn thành";
      return false;
    })
    .sort((a, b) => new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime());

  return (
    <div style={{ padding: "0" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .base-toolbar {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 0.75rem !important;
          padding: 0 !important;
          gap: 1rem !important;
          flex-wrap: nowrap !important;
          width: 100% !important;
          font-family: "Segoe UI", sans-serif !important;
        }
        .toolbar-left {
          display: flex !important;
          align-items: center !important;
          gap: 1rem !important;
        }
        .toolbar-right {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
        }
        .page-title-base {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          margin: 0 !important;
          white-space: nowrap !important;
        }
        .badge-count {
          background: #e2e8f0 !important;
          color: #475569 !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          padding: 2px 8px !important;
          border-radius: 999px !important;
          margin-left: 0.25rem !important;
        }
        .search-box-base {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
        }
        .search-box-base input {
          padding: 6px 10px 6px 32px !important;
          font-size: 13px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          width: 160px !important;
          height: 32px !important;
          outline: none !important;
          transition: all 0.2s !important;
          background: #ffffff !important;
        }
        .search-box-base input:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
        }
        .search-icon {
          position: absolute !important;
          left: 10px !important;
          color: #94a3b8 !important;
        }
        .btn-base {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 6px 12px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          border: 1px solid transparent !important;
          transition: all 0.2s !important;
          height: 32px !important;
          white-space: nowrap !important;
          gap: 6px !important;
          font-family: "Segoe UI", sans-serif !important;
        }
        .btn-primary {
          background: #3b82f6 !important;
          color: #ffffff !important;
        }
        .btn-primary:hover {
          background: #2563eb !important;
        }
        .btn-outline {
          background: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #475569 !important;
        }
        .btn-outline:hover {
          background: #f8fafc !important;
          border-color: #94a3b8 !important;
          color: #1e293b !important;
        }
        .btn-group-base {
          display: flex !important;
          gap: 0.75rem !important;
        }
        .unified-container {
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          background: #ffffff !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          overflow: hidden !important;
        }
        .base-table-wrapper {
          max-height: 485px !important;
          height: auto !important;
          overflow: auto !important;
          padding-bottom: 60px !important;
        }
        .base-table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 13px !important;
          font-family: "Segoe UI", sans-serif !important;
          margin-bottom: 60px !important;
        }
        .base-table th {
          background: #f8fafc !important;
          padding: 0px 0.75rem !important;
          font-weight: 700 !important;
          color: #334155 !important;
          border-bottom: 1px solid #e2e8f0 !important;
          text-align: left !important;
          height: 35px !important;
        }
        .base-table td {
          padding: 0px 0.75rem !important;
          vertical-align: middle !important;
          border-bottom: 1px solid #f1f5f9 !important;
          color: #1e293b !important;
        }
        .base-table tbody tr {
          height: 40px !important;
          transition: background 0.15s !important;
        }
        .base-table tbody tr:hover {
          background: #f8fafc !important;
        }
        .badge-active-base {
          background: #fef3c7 !important;
          color: #d97706 !important;
          padding: 4px 10px !important;
          border-radius: 9999px !important;
          font-weight: 600 !important;
          font-size: 11px !important;
          border: 1px solid #fde68a !important;
          display: inline-block !important;
          text-align: center !important;
          white-space: nowrap !important;
        }
        .badge-completed-base {
          background: #dcfce7 !important;
          color: #15803d !important;
          padding: 4px 10px !important;
          border-radius: 9999px !important;
          font-weight: 600 !important;
          font-size: 11px !important;
          border: 1px solid #bbf7d0 !important;
          display: inline-block !important;
          text-align: center !important;
          white-space: nowrap !important;
        }
        .action-btn-base {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          background: transparent !important;
          border: none !important;
          color: #64748b !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }
        .action-btn-base:hover {
          background: #f1f5f9 !important;
          color: #1e293b !important;
        }
        .action-btn-base.text-danger:hover {
          background: #fef2f2 !important;
          color: #ef4444 !important;
        }
        .action-btn-base.text-success:hover {
          background: #f0fdf4 !important;
          color: #22c55e !important;
        }
        .action-btn-base.text-warning:hover {
          background: #fffbeb !important;
          color: #f59e0b !important;
        }
        
        .tab-btn-base {
          padding: 0.5rem 1rem !important; 
          border: none !important;
          background: none !important;
          color: #64748b !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          position: relative !important;
          transition: all 0.2s !important;
        }
        .tab-btn-base:hover {
          color: #1e293b !important;
        }
        .tab-btn-base.active {
          color: #3b82f6 !important;
        }
        .tab-btn-base.active::after {
          content: '' !important;
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 2.5px !important;
          background: #3b82f6 !important;
          border-radius: 99px !important;
        }
        
        .form-control {
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          font-size: 13px !important;
          font-family: "Segoe UI", sans-serif !important;
          padding: 6px 10px !important;
          outline: none !important;
          transition: all 0.2s !important;
        }
        .form-control:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
        }

        /* Slide Drawer Backdrop Overlay */
        .drawer-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background-color: rgba(0, 0, 0, 0.4) !important;
          z-index: 1200 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity 0.3s ease !important;
        }
        .drawer-overlay.show {
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        /* Drawer Container */
        .drawer-container {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          width: 500px !important;
          max-width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          background-color: #ffffff !important;
          box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15) !important;
          z-index: 1250 !important;
          display: flex !important;
          flex-direction: column !important;
          transform: translateX(100%) !important;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .drawer-container.show {
          transform: translateX(0) !important;
        }

        .drawer-header {
          padding: 1.25rem 1.5rem !important;
          border-bottom: 1px solid #e2e8f0 !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          background: #f8fafc !important;
        }
        .drawer-title {
          font-size: 1.15rem !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          margin: 0 !important;
        }
        .drawer-close {
          background: none !important;
          border: none !important;
          cursor: pointer !important;
          font-size: 1.25rem !important;
          color: #64748b !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 4px !important;
          border-radius: 50% !important;
          transition: background 0.2s !important;
          width: 28px !important;
          height: 28px !important;
        }
        .drawer-close:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }
        .drawer-body {
          flex: 1 !important;
          overflow-y: auto !important;
          padding: 1.5rem !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 1rem !important;
        }
        .drawer-footer {
          padding: 1rem 1.5rem !important;
          padding-bottom: calc(1rem + env(safe-area-inset-bottom)) !important;
          border-top: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          display: flex !important;
          justify-content: flex-end !important;
          gap: 0.75rem !important;
          flex-shrink: 0 !important;
        }
        .form-row {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.35rem !important;
        }
        .form-label {
          font-weight: 700 !important;
          font-size: 13px !important;
          color: #475569 !important;
          text-align: left !important;
        }

        .sound-toggle-btn {
          position: relative !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          overflow: visible !important;
        }
        .sound-toggle-btn.active {
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2) !important;
        }
        @keyframes speak-ripple {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .sound-toggle-btn.speaking {
          animation: speak-ripple 1.5s infinite !important;
          background: #3b82f6 !important;
          color: white !important;
          border-color: #3b82f6 !important;
        }
        @keyframes speak-icon-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .speaking-icon {
          animation: speak-icon-bounce 0.8s infinite !important;
        }

        @keyframes row-speak-flash {
          0%, 100% { 
            background-color: rgba(34, 197, 94, 0.05) !important;
            box-shadow: inset 4px 0 0 0 #22c55e !important;
          }
          50% { 
            background-color: rgba(34, 197, 94, 0.18) !important;
            box-shadow: inset 6px 0 0 0 #16a34a !important;
          }
        }
        .row-speaking-flash {
          animation: row-speak-flash 1.2s 10 ease-in-out !important;
          font-weight: 600 !important;
        }

        @keyframes speak-card-pulse {
          0%, 100% { 
            border-color: #22c55e !important; 
            background-color: #f0fdf4 !important;
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.3) !important;
          }
          50% { 
            border-color: #16a34a !important; 
            background-color: #dcfce7 !important;
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0) !important;
          }
        }
        .mobile-card-speaking-pulse {
          animation: speak-card-pulse 1.2s 10 ease-in-out !important;
        }

        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-list { 
            display: block !important; 
            padding-bottom: 130px !important; 
            margin-top: 0.75rem !important;
          }
          .mobile-action-bar {
            display: block !important;
          }
          .mobile-hide { display: none !important; }
          .drawer-container {
            width: 100% !important;
          }
        }
        @media (min-width: 769px) {
          .desktop-only { display: block !important; }
          .mobile-list { display: none !important; }
        }
      ` }} />



      {/* Header Toolbar */}
      <div className="base-toolbar mobile-hide">
        <div className="toolbar-left">
          <h3 className="page-title-base">🚗 Quản lý xe ra vào</h3>
          <span className="badge-count">{data.length}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <div className="search-box-base">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm kiếm biển số, tài xế..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>Ngày:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-control"
                style={{
                  height: "32px",
                  padding: "4px 8px",
                  fontSize: "13px",
                  borderColor: "#cbd5e1",
                  borderRadius: "4px",
                  width: "135px"
                }}
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                  title="Xóa lọc ngày"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="toolbar-right">
          <div className="btn-group-base">
            <button 
              className={`btn-base btn-outline sound-toggle-btn ${!isMuted ? 'active' : ''} ${currentlySpeakingPlate ? 'speaking' : ''}`} 
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                  playTestVoice();
                } else {
                  setIsMuted(true);
                  if (typeof window !== 'undefined' && (window as any).currentVehicleAudio) {
                    try {
                      (window as any).currentVehicleAudio.pause();
                    } catch(e){}
                  }
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setCurrentlySpeakingPlate(null);
                }
              }}
              style={{
                borderColor: !isMuted ? '#bbf7d0' : '#cbd5e1',
                color: !isMuted ? '#15803d' : '#64748b',
                background: !isMuted ? '#f0fdf4' : '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {!isMuted ? <Volume2 size={16} className={currentlySpeakingPlate ? 'speaking-icon' : ''} /> : <VolumeX size={16} />}
              <span>{!isMuted ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}</span>
            </button>
            <button className="btn-base btn-outline" onClick={() => router.refresh()}>
              <RotateCcw size={16} /> Làm mới
            </button>
            <button className="btn-base btn-outline" onClick={() => setShowQrModal(true)} style={{ color: "#0284c7", borderColor: "#bfdbfe" }}>
              <span>📱</span> Mã QR đăng ký
            </button>
          </div>
          <button className="btn-base btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Đăng ký xe
          </button>
        </div>
      </div>

      {/* Mobile-only Action Bar */}
      <div className="mobile-action-bar" style={{ display: "none", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>🚗 Xe ra vào</h3>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <button 
              className={`btn-base btn-outline ${currentlySpeakingPlate ? 'speaking' : ''}`}
              style={{ 
                padding: "4px", 
                height: "28px", 
                width: "28px", 
                display: "inline-flex", 
                alignItems: "center", 
                justifyContent: "center",
                borderColor: !isMuted ? '#bbf7d0' : '#cbd5e1',
                color: !isMuted ? '#15803d' : '#64748b',
                background: !isMuted ? '#f0fdf4' : '#ffffff'
              }}
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                  playTestVoice();
                } else {
                  setIsMuted(true);
                  if (typeof window !== 'undefined' && (window as any).currentVehicleAudio) {
                    try {
                      (window as any).currentVehicleAudio.pause();
                    } catch(e){}
                  }
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setCurrentlySpeakingPlate(null);
                }
              }}
            >
              {!isMuted ? <Volume2 size={14} className={currentlySpeakingPlate ? 'speaking-icon' : ''} /> : <VolumeX size={14} />}
            </button>
            <button className="btn-base btn-outline" style={{ padding: "4px 8px", height: "28px" }} onClick={() => router.refresh()}>Mới</button>
            <button className="btn-base btn-outline" style={{ padding: "4px 8px", height: "28px", color: "#0284c7", borderColor: "#bfdbfe" }} onClick={() => setShowQrModal(true)}>Mã QR</button>
            <button className="btn-base btn-primary" style={{ padding: "4px 8px", height: "28px" }} onClick={() => setShowModal(true)}>Đăng ký</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="form-control"
              style={{ width: "100%", height: "30px", fontSize: "12px" }}
              placeholder="Tìm biển số, tài xế..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="date"
              className="form-control"
              style={{ height: "30px", fontSize: "12px", width: "120px" }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 600
                }}
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unified Panel (Tabs + Table) */}
      <div className="unified-container">
        {/* Navigation tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", padding: "0 0.75rem" }}>
          <button
            onClick={() => setActiveTab(1)}
            className={`tab-btn-base ${activeTab === 1 ? 'active' : ''}`}
          >
            Chưa ra ({dateFilteredData.filter(i => i.status === "Đã đăng ký" || i.status === "Đã gọi xe" || i.status === "Đã vào cổng" || i.status === "Đã vào").length})
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`tab-btn-base ${activeTab === 2 ? 'active' : ''}`}
          >
            Đã ra ({dateFilteredData.filter(i => i.status === "Đã hoàn thành").length})
          </button>
        </div>

        {/* Desktop Grid Layout */}
        <div className="base-table-wrapper desktop-only">
          <table className="base-table">
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                <th style={{ textAlign: "center" }}>Ngày tạo</th>
                <th style={{ textAlign: "center" }}>Số xe</th>
                <th style={{ textAlign: "center" }}>Tên tài xế</th>
                <th style={{ textAlign: "center" }}>Số điện thoại</th>
                <th style={{ textAlign: "center" }}>Đơn vị</th>
                <th style={{ textAlign: "center" }}>Mục đích</th>
                <th style={{ textAlign: "center" }}>Giờ vào</th>
                <th style={{ textAlign: "center" }}>Giờ ra</th>
                <th style={{ textAlign: "center" }}>Trạng thái</th>
                <th style={{ width: "80px", textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => {
                const normalizePlate = (p: string) => p.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const isRowSpeaking = currentlySpeakingPlate && (() => {
                  const underscoreIndex = currentlySpeakingPlate.lastIndexOf('_');
                  if (underscoreIndex === -1) return false;
                  const speakingPlate = currentlySpeakingPlate.substring(0, underscoreIndex);
                  return normalizePlate(speakingPlate) === normalizePlate(item.licensePlate);
                })();

                return (
                  <tr 
                    key={item.id} 
                    className={isRowSpeaking ? "row-speaking-flash" : ""}
                  >
                  <td style={{ textAlign: "center", color: "#64748b" }}>{index + 1}</td>
                  <td style={{ textAlign: "center" }}>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td style={{ fontWeight: 700, color: "#1e293b", textAlign: "center", textTransform: "uppercase" }}>{item.licensePlate}</td>
                  <td>{item.driverName}</td>
                  <td style={{ textAlign: "center" }}>{item.phoneNumber || "—"}</td>
                  <td>{item.unit}</td>
                  <td style={{ textAlign: "center" }}>{item.purpose}</td>
                  <td style={{ textAlign: "center" }}>
                    {item.status === "Đã đăng ký" || item.status === "Đã vào"
                      ? "—"
                      : new Date(item.timeIn).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ textAlign: "center" }}>{item.timeOut ? new Date(item.timeOut).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "9999px",
                        fontWeight: 600,
                        fontSize: "11px",
                        display: "inline-block",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        background: (item.status === "Đã đăng ký" || item.status === "Đã vào")
                          ? "#fef3c7"
                          : (item.status === "Đã vào cổng")
                            ? "#f5f3ff"
                            : (item.status === "Đã gọi xe" ? "#e0f2fe" : "#dcfce7"),
                        color: (item.status === "Đã đăng ký" || item.status === "Đã vào")
                          ? "#d97706"
                          : (item.status === "Đã vào cổng")
                            ? "#7c3aed"
                            : (item.status === "Đã gọi xe" ? "#0284c7" : "#15803d"),
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
                  <td style={{ textAlign: "center", position: "relative" }}>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isLastRows = index >= filteredData.length - 2;
                        const isFirstRow = index === 0;
                        setDropdownDirection((isLastRows && !isFirstRow) ? "up" : "down");
                        setOpenMenuId(openMenuId === item.id ? null : item.id);
                      }}
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {openMenuId === item.id && (
                      <div className={`action-dropdown ${dropdownDirection === "up" ? "open-up" : ""}`} onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown-item" onClick={() => { handleViewProgress(item); setOpenMenuId(null); }}>
                          <Clock size={14} style={{ color: "#0284c7" }} /> Tiến trình
                        </div>
                        <div className="dropdown-item" onClick={() => { handleEdit(item); setOpenMenuId(null); }}>
                          <Pencil size={14} /> Chỉnh sửa
                        </div>

                        {(item.status === "Đã đăng ký" || item.status === "Đã vào") && (
                          <div className="dropdown-item" style={{ color: "#0284c7" }} onClick={() => { handleConfirmEntry(item.id, item.licensePlate, item.driverName); setOpenMenuId(null); }}>
                            <LogIn size={14} /> Xe vào
                          </div>
                        )}

                        {item.status !== "Đã hoàn thành" ? (
                          <div className="dropdown-item success" onClick={() => { handleConfirmExit(item.id, item.licensePlate, item.driverName); setOpenMenuId(null); }}>
                            <CheckCircle size={14} /> Hoàn thành
                          </div>
                        ) : (
                          <div className="dropdown-item success" onClick={() => { handleUndo(item.id); setOpenMenuId(null); }}>
                            <Undo2 size={14} /> Hoàn tác trạng thái
                          </div>
                        )}

                        {isAdmin && (
                          <>
                            <div className="divider"></div>
                            <div className="dropdown-item danger" onClick={() => { handleDelete(item.id, item.licensePlate, item.driverName); setOpenMenuId(null); }}>
                              <Trash2 size={14} /> Xóa bản ghi
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr style={{ height: "45px" }}>
                  <td colSpan={11} style={{ textAlign: "center", color: "#64748b", verticalAlign: "middle", height: "45px" }}>
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card list */}
      <div className="mobile-list" style={{ display: "none" }}>
        {filteredData.map((item) => {
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
              className={isRowSpeaking ? "mobile-card-speaking-pulse" : ""}
              style={{
                background: "white",
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                marginBottom: "0.5rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#3b82f6", lineHeight: 1.3, textTransform: "uppercase" }}>{item.licensePlate}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1e293b", lineHeight: 1.4, marginTop: "2px" }}>
                    {item.driverName} {item.phoneNumber && <span style={{ color: "#64748b", fontWeight: 400, marginLeft: "0.5rem" }}>({item.phoneNumber})</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                  <button
                    className="action-btn-base"
                    onClick={() => handleViewProgress(item)}
                    style={{
                      padding: "2px 6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#0284c7",
                      background: "#e0f2fe",
                      border: "1px solid #bae6fd",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                    title="Tiến trình"
                  >
                    ⏱️ Tiến trình
                  </button>
                  <button className="action-btn-base" onClick={() => handleEdit(item)} style={{ padding: "0.2rem" }}><Pencil size={15} /></button>
                  {isAdmin && (
                    <button className="action-btn-base text-danger" onClick={() => handleDelete(item.id, item.licensePlate, item.driverName)} style={{ padding: "0.2rem" }}><Trash2 size={15} /></button>
                  )}
                </div>
              </div>

              <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "0.15rem" }}>
                <span style={{ fontWeight: 600 }}>ĐƠN VỊ:</span> {item.unit}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "0.4rem" }}>
                <span style={{ fontWeight: 600 }}>MỤC ĐÍCH:</span> {item.purpose}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "0.4rem" }}>
                <div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      display: "inline-block",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      background: (item.status === "Đã đăng ký" || item.status === "Đã vào")
                        ? "#fef3c7"
                        : (item.status === "Đã vào cổng")
                          ? "#f5f3ff"
                          : (item.status === "Đã gọi xe" ? "#e0f2fe" : "#dcfce7"),
                      color: (item.status === "Đã đăng ký" || item.status === "Đã vào")
                        ? "#d97706"
                        : (item.status === "Đã vào cổng")
                          ? "#7c3aed"
                          : (item.status === "Đã gọi xe" ? "#0284c7" : "#15803d"),
                      border: `1px solid ${(item.status === "Đã đăng ký" || item.status === "Đã vào")
                        ? "#fde68a"
                        : (item.status === "Đã vào cổng")
                          ? "#ddd6fe"
                          : (item.status === "Đã gọi xe" ? "#bae6fd" : "#bbf7d0")}`
                    }}
                  >
                    {item.status === "Đã vào" ? "Đã đăng ký" : item.status}
                  </span>
                  <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", color: "#94a3b8" }}>
                    {item.status === "Đã đăng ký" || item.status === "Đã vào"
                      ? "—"
                      : new Date(item.timeIn).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {(item.status === "Đã đăng ký" || item.status === "Đã vào") && (
                    <button
                      className="btn-base btn-primary"
                      onClick={() => handleConfirmEntry(item.id, item.licensePlate, item.driverName)}
                      style={{ padding: "2px 8px", height: "26px", fontSize: "0.75rem", background: "#0284c7" }}
                    >
                      Xe vào
                    </button>
                  )}
                  {item.status !== "Đã hoàn thành" ? (
                    <button className="btn-base btn-primary" onClick={() => handleConfirmExit(item.id, item.licensePlate, item.driverName)} style={{ padding: "2px 8px", height: "26px", fontSize: "0.75rem" }}>Hoàn thành</button>
                  ) : (
                    <button className="btn-base btn-outline" onClick={() => handleUndo(item.id)} style={{ padding: "2px 8px", height: "26px", fontSize: "0.75rem" }}>Hoàn tác</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredData.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>Không tìm thấy đăng ký nào.</div>
        )}
      </div>

      {/* Edit/Create Slide Drawer */}
      <div className={`drawer-overlay ${showModal ? "show" : ""}`} onClick={handleClose} />
      <div className={`drawer-container ${showModal ? "show" : ""}`}>
        <div className="drawer-header">
          <h3 className="drawer-title">
            {editingItem ? "✏️ Sửa thông tin xe ra vào" : "🚗 Đăng ký xe ra vào mới"}
          </h3>
          <button className="drawer-close" onClick={handleClose}>✕</button>
        </div>

        <div style={{ background: "#f1f5f9", padding: "0.5rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
          <p style={{ margin: 0, color: "#64748b" }}>
            Người thực hiện: <strong style={{ color: "#3b82f6" }}>{editingItem?.creator || currentUserName}</strong>
          </p>
          <p style={{ margin: 0, color: "#64748b" }}>
            Ngày tạo: <strong>{editingItem ? new Date(editingItem.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}</strong>
          </p>
        </div>

        <form key={editingItem?.id || "new"} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", margin: 0 }}>
          <div className="drawer-body">
            <div style={{ display: "flex", gap: "1rem" }}>
              <div className="form-row" style={{ flex: 4 }}>
                <label className="form-label">Số xe *</label>
                <input type="text" name="licensePlate" className="form-control" defaultValue={editingItem?.licensePlate || ""} required style={{ textTransform: "uppercase", height: "36px", width: "100%" }} placeholder="VD: 29C-12345" />
              </div>
              <div className="form-row" style={{ flex: 6 }}>
                <label className="form-label">Tên tài xế *</label>
                <input type="text" name="driverName" className="form-control" defaultValue={editingItem?.driverName || ""} required style={{ textTransform: "uppercase", height: "36px", width: "100%" }} placeholder="TÊN TÀI XẾ" />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Đơn vị *</label>
              <input type="text" name="unit" className="form-control" defaultValue={editingItem?.unit || ""} required style={{ textTransform: "uppercase", height: "36px" }} placeholder="ĐƠN VỊ CÔNG TÁC" />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div className="form-row" style={{ flex: 1 }}>
                <label className="form-label">Số CCCD</label>
                <input type="text" name="idCardNumber" className="form-control" defaultValue={editingItem?.idCardNumber || ""} style={{ textTransform: "uppercase", height: "36px", width: "100%" }} placeholder="CCCD / CMTND" />
              </div>
              <div className="form-row" style={{ flex: 1 }}>
                <label className="form-label">Số điện thoại</label>
                <input type="text" name="phoneNumber" className="form-control" defaultValue={editingItem?.phoneNumber || ""} style={{ height: "36px", width: "100%" }} placeholder="SỐ ĐIỆN THOẠI" />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Mục đích *</label>
              <select name="purpose" className="form-control" defaultValue={editingItem?.purpose || PURPOSES[0]} required style={{ height: "36px", padding: "0 8px" }}>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Ghi chú</label>
              <textarea name="note" className="form-control" defaultValue={editingItem?.note || ""} rows={4} placeholder="Nhập ghi chú thêm..."></textarea>
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn-base btn-outline" onClick={handleClose}>Hủy bỏ</button>
            <button type="submit" className="btn-base btn-primary" disabled={isPending}>
              {isPending ? "Đang xử lý..." : "Lưu đăng ký"}
            </button>
          </div>
        </form>
      </div>

      {/* Confirm Exit Modal */}
      {showConfirmModal && confirmData && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: "420px", textAlign: "center", padding: "1.5rem", borderRadius: "10px", border: "none" }}>
            <div style={{ color: "#10b981", marginBottom: "0.75rem" }}>
              <CheckCircle size={48} style={{ margin: "0 auto" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "#1e293b", fontWeight: 700 }}>Xác nhận hoàn thành</h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "1rem" }}>Hệ thống sẽ cập nhật giờ ra thực tế và chuyển trạng thái thành Hoàn thành.</p>
            <div style={{ background: "#f0fdf4", padding: "0.75rem", borderRadius: "8px", marginBottom: "1.25rem", textAlign: "left", border: "1px solid #bbf7d0" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#475569" }}>SỐ XE: <strong style={{ color: "#16a34a" }}>{confirmData.licensePlate}</strong></p>
              <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>TÀI XẾ: <strong style={{ color: "#1e293b" }}>{confirmData.driverName}</strong></p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-base btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowConfirmModal(false)}
              >
                HỦY
              </button>
              <button
                className="btn-base btn-primary"
                style={{ flex: 1, background: "#10b981 !important" }}
                onClick={processConfirmExit}
                disabled={isPending}
              >
                {isPending ? "ĐANG LƯU..." : "HOÀN THÀNH"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Entry Modal */}
      {showEntryModal && entryData && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: "420px", textAlign: "center", padding: "1.5rem", borderRadius: "10px", border: "none" }}>
            <div style={{ color: "#0284c7", marginBottom: "0.75rem" }}>
              <LogIn size={48} style={{ margin: "0 auto" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "#1e293b", fontWeight: 700 }}>Xác nhận xe vào cổng</h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "1rem" }}>Hệ thống sẽ ghi nhận giờ vào cổng thực tế của xe và chuyển trạng thái thành Đã vào cổng.</p>
            <div style={{ background: "#f0f9ff", padding: "0.75rem", borderRadius: "8px", marginBottom: "1.25rem", textAlign: "left", border: "1px solid #bae6fd" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#475569" }}>SỐ XE: <strong style={{ color: "#0284c7" }}>{entryData.licensePlate}</strong></p>
              <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>TÀI XẾ: <strong style={{ color: "#1e293b" }}>{entryData.driverName}</strong></p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-base btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowEntryModal(false)}
              >
                HỦY
              </button>
              <button
                className="btn-base btn-primary"
                style={{ flex: 1, background: "#0284c7 !important" }}
                onClick={processConfirmEntry}
                disabled={isPending}
              >
                {isPending ? "ĐANG LƯU..." : "XÁC NHẬN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Stepper Modal (identical driver queue style) */}
      {showProgressModal && progressItem && (
        <div className="modal-overlay" style={{ zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }} onClick={() => setShowProgressModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "680px",
              width: "95%",
              maxHeight: "calc(100vh - 40px)",
              display: "flex",
              flexDirection: "column",
              padding: "0",
              borderRadius: "15px",
              overflow: "hidden",
              border: "none",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)"
            }}
          >
            {/* Header Banner */}
            <div style={{
              background: progressItem.status === "Đã hoàn thành" ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : "linear-gradient(90deg, #0284c7 0%, #0369a1 100%)",
              color: "white",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.1rem" }}>📋</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  TIẾN TRÌNH XE: {progressItem.licensePlate}
                </span>
              </div>
              <button
                onClick={() => setShowProgressModal(false)}
                style={{ background: "none", border: "none", color: "white", fontSize: "1.25rem", cursor: "pointer", padding: 0 }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", flex: 1 }}>
              <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 580px) {
                  .progress-modal-layout {
                    flex-direction: column !important;
                  }
                  .qr-column {
                    width: 100% !important;
                    border-left: none !important;
                    border-top: 1px solid #e2e8f0 !important;
                    padding-left: 0 !important;
                    padding-top: 1rem !important;
                  }
                }
              `}} />
              {progressLoading ? (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "#64748b" }}>
                  <div className="spinner-border animate-spin" style={{ display: "inline-block", width: "24px", height: "24px", border: "2px solid #0284c7", borderTopColor: "transparent", borderRadius: "50%", marginBottom: "0.5rem" }}></div>
                  <p style={{ margin: 0, fontSize: "13px" }}>Đang tải tiến trình thực tế...</p>
                </div>
              ) : (
                <div className="progress-modal-layout" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                  {/* Left column: Process details & stepper */}
                  <div style={{ flex: "1", minWidth: "280px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Giant Queue Number Display */}
                    {(() => {
                      const isCompleted = progressItem.status === "Đã hoàn thành";
                      const isCalled = progressData?.isCalled || progressItem.status === "Đã gọi xe";
                      const hasEnteredQueue = progressItem.status !== "Đã đăng ký" && progressItem.status !== "Đã vào";

                      const wInFront = progressData !== null ? progressData.waitingInFront : (() => {
                        const itemDate = new Date(progressItem.timeIn).toDateString();
                        const sameDayRegs = data.filter(r => new Date(r.timeIn).toDateString() === itemDate);
                        const activeRegs = sameDayRegs.filter(r => r.status === "Đã vào cổng" || r.status === "Đã gọi xe");
                        activeRegs.sort((a, b) => {
                          const aIsCalled = a.status === "Đã gọi xe";
                          const bIsCalled = b.status === "Đã gọi xe";
                          if (aIsCalled && !bIsCalled) return -1;
                          if (!aIsCalled && bIsCalled) return 1;
                          if (aIsCalled && bIsCalled) {
                            return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
                          }
                          return new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime();
                        });
                        const myIndex = hasEnteredQueue ? activeRegs.findIndex(r => r.id === progressItem.id) : -1;
                        return myIndex !== -1 ? myIndex : 0;
                      })();

                      const qNumber = progressData !== null ? progressData.queueNumber : (() => {
                        const itemDate = new Date(progressItem.timeIn).toDateString();
                        const sameDayRegs = data.filter(r => new Date(r.timeIn).toDateString() === itemDate);
                        const activeRegs = sameDayRegs.filter(r => r.status === "Đã vào cổng" || r.status === "Đã gọi xe");
                        activeRegs.sort((a, b) => {
                          const aIsCalled = a.status === "Đã gọi xe";
                          const bIsCalled = b.status === "Đã gọi xe";
                          if (aIsCalled && !bIsCalled) return -1;
                          if (!aIsCalled && bIsCalled) return 1;
                          if (aIsCalled && bIsCalled) {
                            return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
                          }
                          return new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime();
                        });
                        const myIndex = hasEnteredQueue ? activeRegs.findIndex(r => r.id === progressItem.id) : -1;
                        return myIndex !== -1 ? myIndex + 1 : null;
                      })();

                      const hasEntered = progressItem.status === "Đã vào cổng" || isCalled || isCompleted;
                      const stepEntryColor = hasEntered ? "#10b981" : "#0284c7";

                      const isStepCalledCompleted = isCalled || isCompleted;
                      const isStepCalledActive = progressItem.status === "Đã vào cổng";
                      const stepCalledColor = isStepCalledCompleted ? "#10b981" : (isStepCalledActive ? "#0284c7" : "#cbd5e1");

                      const isStepFinishCompleted = isCompleted;
                      const isStepFinishActive = progressItem.status === "Đã gọi xe";
                      const stepFinishColor = isStepFinishCompleted ? "#10b981" : (isStepFinishActive ? "#0284c7" : "#cbd5e1");

                      return (
                        <>
                          <div style={{
                            background: isCompleted ? "#f0fdf4" : (!hasEnteredQueue ? "#fffbeb" : "#f0f9ff"),
                            border: isCompleted ? "1.5px dashed #86efac" : (!hasEnteredQueue ? "1.5px dashed #fef3c7" : "1.5px dashed #bae6fd"),
                            borderRadius: "11px",
                            padding: "0.75rem",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: isCompleted ? "#166534" : (!hasEnteredQueue ? "#b45309" : "#0369a1"), textTransform: "uppercase" }}>
                              {isCompleted ? "Trạng thái xe" : (hasEnteredQueue ? "Vị trí hàng đợi hiện tại" : "Trạng thái xe")}
                            </span>
                            <div style={{ fontSize: isCompleted || !hasEnteredQueue ? "2rem" : "2.4rem", fontWeight: 900, color: isCompleted ? "#10b981" : (hasEnteredQueue ? "#0284c7" : "#d97706"), margin: "0.15rem 0", lineHeight: 1 }}>
                              {isCompleted ? "ĐÃ RA CỔNG" : (hasEnteredQueue ? `#${wInFront + 1}` : "CHỜ VÀO CỔNG")}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                              <span>Hàng đợi: <strong style={{ color: "#334155" }}>{progressItem.purpose}</strong></span>
                              <span>Số thứ tự đăng ký trong ngày: <strong style={{ color: "#334155" }}>{qNumber ? `#${qNumber}` : "—"}</strong></span>
                            </div>
                          </div>

                          {/* Queue Real-time Message */}
                          {!isCompleted && (
                            <div style={{
                              background: !hasEnteredQueue ? "#fffbeb" : (wInFront === 0 ? "#fef3c7" : "#f8fafc"),
                              border: !hasEnteredQueue ? "1px solid #fde68a" : (wInFront === 0 ? "1px solid #fde68a" : "1px solid #e2e8f0"),
                              borderRadius: "8px",
                              padding: "0.5rem",
                              textAlign: "center",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: !hasEnteredQueue ? "#b45309" : (wInFront === 0 ? "#92400e" : "#475569")
                            }}>
                              {!hasEnteredQueue ? (
                                <>📢 Vui lòng xác nhận xe vào cổng để đưa vào hàng đợi.</>
                              ) : wInFront === 0 ? (
                                <>📢 Xe tiếp theo chuẩn bị vào cổng!</>
                              ) : (
                                <>⏳ Còn <strong style={{ color: "#0284c7", fontSize: "0.92rem" }}>{wInFront}</strong> xe khác đang xếp hàng phía trước</>
                              )}
                            </div>
                          )}

                          {/* Vehicle Info */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <h3 style={{ fontSize: "0.78rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 0.15rem 0" }}>
                              Thông tin chi tiết xe
                            </h3>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.35rem", borderBottom: "1px solid #f1f5f9" }}>
                              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Tài xế:</span>
                              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>{progressItem.driverName}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.35rem", borderBottom: "1px solid #f1f5f9" }}>
                              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Đơn vị công tác:</span>
                              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>{progressItem.unit}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.35rem" }}>
                              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Thời gian vào:</span>
                              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                                {progressItem.status === "Đã đăng ký" || progressItem.status === "Đã vào" ? (
                                  "—"
                                ) : (
                                  `${new Date(progressItem.timeIn).toLocaleTimeString("vi-VN")} - ${new Date(progressItem.timeIn).toLocaleDateString("vi-VN")}`
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Stepper Timeline */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.15rem" }}>
                            <h3 style={{ fontSize: "0.78rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em", margin: 0 }}>
                              Tiến trình xếp hàng thực tế
                            </h3>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", paddingLeft: "0.5rem", position: "relative", borderLeft: "2px solid #e2e8f0", marginLeft: "0.4rem", textAlign: "left" }}>
                              {/* Step 1: Đăng ký thành công */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", position: "relative" }}>
                                <div style={{
                                  position: "absolute",
                                  left: "-1.1rem",
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  background: "#10b981",
                                  border: "2px solid white"
                                }} />
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#10b981" }}>1. Đăng ký thành công</span>
                              </div>

                              {/* Step 2: Đã vào cổng */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", position: "relative" }}>
                                <div style={{
                                  position: "absolute",
                                  left: "-1.1rem",
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  background: stepEntryColor,
                                  border: "2px solid white",
                                  boxShadow: hasEntered ? "none" : "0 0 0 2px rgba(2, 132, 199, 0.2)"
                                }} />
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: stepEntryColor }}>
                                  2. Đã vào cổng
                                </span>
                              </div>

                              {/* Step 3: Chờ gọi / Đã gọi vào */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", position: "relative" }}>
                                <div style={{
                                  position: "absolute",
                                  left: "-1.1rem",
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  background: stepCalledColor,
                                  border: "2px solid white",
                                  boxShadow: isStepCalledActive ? "0 0 0 2px rgba(2, 132, 199, 0.2)" : "none"
                                }} />
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: stepCalledColor }}>
                                  {isStepCalledCompleted ? (
                                    <>3. Đã gọi vào: {progressData?.calledInfo?.type ? (() => {
                                      const t = progressData.calledInfo.type;
                                      if (t === 'can-xe') return 'Cân xe';
                                      if (t === 'kho-vat-tu') return 'Kho vật tư';
                                      if (t === 'kho-nguyen-lieu-cua-1') return 'Kho nguyên liệu cửa 1';
                                      if (t === 'kho-nguyen-lieu-cua-2') return 'Kho nguyên liệu cửa 2';
                                      return 'Cân xe';
                                    })() : 'Vào cổng'}</>
                                  ) : (
                                    <>3. Chờ gọi {hasEntered ? `(${wInFront} xe trước)` : ""}</>
                                  )}
                                </span>
                              </div>

                              {/* Step 4: Hoàn thành (Xe ra cổng) */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", position: "relative" }}>
                                <div style={{
                                  position: "absolute",
                                  left: "-1.1rem",
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  background: isCompleted ? "#10b981" : "#cbd5e1",
                                  border: "2px solid white"
                                }} />
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isCompleted ? "#10b981" : "#94a3b8" }}>
                                  {isCompleted ? "4. Hoàn thành (Xe đã ra cổng)" : "4. Hoàn thành"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Right column: Scan QR code */}
                  <div style={{
                    width: "180px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    borderLeft: "1px solid #e2e8f0",
                    paddingLeft: "1.5rem",
                    paddingTop: "0.5rem"
                  }} className="qr-column">
                    <h4 style={{ fontSize: "11px", fontWeight: 800, color: "#475569", margin: "0 0 0.5rem 0", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "center" }}>
                      Quét theo dõi
                    </h4>
                    <div style={{
                      background: "#f8fafc",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1",
                      display: "inline-flex"
                    }}>
                      {typeof window !== 'undefined' ? (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/x/${progressItem.id}`)}`}
                          alt="QR Theo dõi xếp hàng"
                          style={{ width: "150px", height: "150px" }}
                        />
                      ) : null}
                    </div>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "0.5rem 0 0 0", lineHeight: "1.4", textAlign: "center", fontWeight: 500 }}>
                      Tài xế dùng điện thoại quét mã này để theo dõi tiến trình trực tiếp.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
              <button
                type="button"
                className="btn-base btn-primary"
                style={{ padding: "4px 16px", fontSize: "12px", background: "#0284c7 !important" }}
                onClick={() => setShowProgressModal(false)}
              >
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteData && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: "420px", textAlign: "center", padding: "1.5rem", borderRadius: "10px", border: "none" }}>
            <div style={{ color: "#ef4444", marginBottom: "0.75rem" }}>
              <Trash2 size={48} style={{ margin: "0 auto" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "#1e293b", fontWeight: 700 }}>Xác nhận xóa</h3>
            <p style={{ color: "#64748b", marginBottom: "1rem", fontSize: "13px" }}>Bạn có chắc chắn muốn xóa bản ghi xe này? Hành động này không thể hoàn tác.</p>
            <div style={{ background: "#fef2f2", padding: "0.75rem", borderRadius: "8px", marginBottom: "1.25rem", textAlign: "left", border: "1px solid #fee2e2" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#475569" }}>SỐ XE: <strong style={{ color: "#ef4444" }}>{deleteData.licensePlate}</strong></p>
              <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>TÀI XẾ: <strong style={{ color: "#1e293b" }}>{deleteData.driverName}</strong></p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-base btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowDeleteModal(false)}
              >
                HỦY
              </button>
              <button
                className="btn-base btn-primary"
                style={{ flex: 1, background: "#ef4444 !important" }}
                onClick={processDelete}
                disabled={isPending}
              >
                {isPending ? "ĐANG XÓA..." : "XÓA ĐĂNG KÝ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowQrModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "420px",
              padding: "1.15rem",
              borderRadius: "16px",
              textAlign: "center",
              background: "#ffffff",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.45rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📱</span> Mã QR Đăng Ký Tự Động
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  fontSize: "1.3rem",
                  color: "#94a3b8",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: "0",
                  lineHeight: "1"
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: "0.2rem 0" }}>
              <p style={{ color: "#475569", fontSize: "12px", margin: "0 0 0.65rem 0", lineHeight: "1.45" }}>
                Tài xế có thể dùng điện thoại cá nhân để quét mã QR này, giúp tự điền form đăng ký vào cổng cực kỳ tiện lợi mà không cần đăng nhập.
              </p>

              {/* Dynamic QR image using Google API or QRServer */}
              <div style={{
                background: "#f8fafc",
                padding: "0.75rem",
                borderRadius: "12px",
                display: "inline-flex",
                justifyContent: "center",
                border: "1.5px dashed #cbd5e1",
                marginBottom: "0.75rem"
              }}>
                {typeof window !== 'undefined' ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(`${window.location.origin}/dk?token=sapo-gate-secure-token-2026`)}`}
                    alt="Mã QR tự đăng ký"
                    style={{ width: "170px", height: "170px", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "170px", height: "170px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                    Đang khởi tạo mã QR...
                  </div>
                )}
              </div>

              <div style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                padding: "0.55rem 0.65rem",
                borderRadius: "10px",
                color: "#0369a1",
                fontSize: "12px",
                fontWeight: 500,
                lineHeight: "1.4",
                textAlign: "left"
              }}>
                <strong>🔗 Đường dẫn đăng ký công cộng:</strong>
                <div style={{ marginTop: "3px", fontSize: "11px", color: "#0284c7", wordBreak: "break-all", fontWeight: 700 }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/dk?token=sapo-gate-secure-token-2026` : ""}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "0.85rem", display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/dk?token=sapo-gate-secure-token-2026`);
                    alert("Đã sao chép đường dẫn đăng ký tự động thành công!");
                  }
                }}
                className="btn-base btn-outline"
                style={{ flex: 1, height: "36px" }}
              >
                Sao chép liên kết
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="btn-base btn-primary"
                style={{ flex: 1, height: "36px", background: "linear-gradient(90deg, #0284c7 0%, #0369a1 100%) !important" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
