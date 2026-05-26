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
import { Plus, RotateCcw, Filter, Pencil, Trash2, CheckCircle, Undo2, Search, MoreHorizontal, Clock, LogIn, Volume2, VolumeX, Eye, ChevronDown } from "lucide-react";
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
  branch?: string;
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
  currentUserName,
  activeBranch
}: {
  initialData: Registration[],
  isAdmin: boolean,
  currentUserName: string,
  activeBranch?: string | null
}) {
  const router = useRouter();
  const [data, setData] = useState<Registration[]>(initialData);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Registration | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("Chưa ra");
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const selectedItem = data.find(i => i.id === selectedId);

  // Progress tracker modal states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressItem, setProgressItem] = useState<Registration | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const [origin, setOrigin] = useState("");

  const handleViewProgress = async (item: Registration) => {
    setProgressItem(item);
    setShowProgressModal(true);
    setProgressLoading(true);
    setProgressData(null);
    try {
      const cleanPlate = encodeURIComponent(item.licensePlate.trim().toUpperCase());
      const res = await fetch(`/api/public-security-call?licensePlate=${cleanPlate}&id=${item.id}&_t=${Date.now()}`);
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
  const [showSoundActivationModal, setShowSoundActivationModal] = useState(false);
  const [currentlySpeakingPlate, setCurrentlySpeakingPlate] = useState<string | null>(null);
  const clientIdRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      const savedMuteState = localStorage.getItem("sapo_sound_active");
      if (savedMuteState === "true") {
        setIsMuted(false);
      } else {
        setIsMuted(true);
        setShowSoundActivationModal(true);
      }
    }
  }, []);

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
    setIsViewOnly(false);
    setSelectedId(null);
  };

  const handleEdit = (item: Registration) => {
    setEditingItem(item);
    setIsViewOnly(false);
    setShowModal(true);
  };

  const handleView = (item: Registration) => {
    setEditingItem(item);
    setIsViewOnly(true);
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
        setSelectedId(null);
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
        setSelectedId(null);
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
        setSelectedId(null);
        router.refresh();
      } else alert(res.error);
    });
  };

  const handleUndo = async (id: string) => {
    if (!confirm("Hoàn tác trạng thái về 'Đã đăng ký'?")) return;
    startTransition(async () => {
      const res = await undoStatus(id);
      if (res.success) {
        setSelectedId(null);
        router.refresh();
      } else alert(res.error);
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
      branch: (formData.get("branch") as string) || "Đồng Tháp",
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

  // Base filtered by date and search term
  const baseFilteredData = dateFilteredData.filter(item => {
    return item.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const pendingCount = baseFilteredData.filter(i => i.status === "Đã đăng ký" || i.status === "Đã gọi xe" || i.status === "Đã vào cổng" || i.status === "Đã vào").length;
  const completedCount = baseFilteredData.filter(i => i.status === "Đã hoàn thành").length;

  const filteredData = baseFilteredData
    .filter(item => {
      if (statusFilter === "Chưa ra") {
        return item.status === "Đã đăng ký" || item.status === "Đã gọi xe" || item.status === "Đã vào cổng" || item.status === "Đã vào";
      }
      if (statusFilter === "Đã hoàn thành") {
        return item.status === "Đã hoàn thành";
      }
      return true; // "Tất cả"
    })
    .sort((a, b) => new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime());

  const getStatusClass = (status: string) => {
    const s = status === "Đã vào" ? "Đã đăng ký" : status;
    if (s === "Đã đăng ký") return "status-pill status-registered";
    if (s === "Đã gọi xe") return "status-pill status-called";
    if (s === "Đã vào cổng") return "status-pill status-entered";
    if (s === "Đã hoàn thành") return "status-pill status-completed";
    return "status-pill";
  };

  return (
    <div className="security-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .security-page-container {
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 0px 0px 10px 0px;
        }
        .security-page-container input,
        .security-page-container select,
        .security-page-container textarea,
        .security-page-container button,
        .security-page-container table,
        .security-page-container td,
        .security-page-container th,
        .security-page-container label {
          font-size: 13px !important;
          font-family: "Segoe UI", -apple-system, sans-serif !important;
        }
        .security-page-container .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          display: block;
          border-radius: 0 !important;
          margin-top: 0 !important;
          margin-left: -10px;
          margin-right: -10px;
        }
        .security-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
        }
        .panel-full {
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0;
          padding: 8px 0;
          gap: 0.5rem;
          flex-wrap: wrap;
          position: sticky;
          top: 140px;
          z-index: 100;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          border-radius: 4px;
          font-weight: 400;
          font-size: 13px !important;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
          height: 32px;
          white-space: nowrap;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn:active {
          transform: scale(0.98);
        }
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .sapo-btn-danger {
          background-color: #ef4444;
        }
        .sapo-btn-danger:hover {
          background-color: #dc2626;
        }
        .sapo-btn-info {
          background-color: #2563eb;
        }
        .sapo-btn-info:hover {
          background-color: #1d4ed8;
        }
        .sapo-btn-teal {
          background-color: #0d9488;
        }
        .sapo-btn-teal:hover {
          background-color: #0f766e;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .base-table-wrapper {
          max-height: 485px !important;
          height: auto !important;
          overflow-y: auto !important;
          overflow-x: auto !important;
          padding-bottom: 60px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          min-width: 1200px !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          text-align: center !important;
          height: 35px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .base-table td {
          padding: 6px 0.75rem !important;
          vertical-align: middle !important;
          white-space: normal !important;
          word-break: break-word !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
          margin-bottom: 4px !important;
        }
        .form-control {
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          background: white !important;
        }
        .form-control:not(.search-input) {
          padding: 6px 10px !important;
        }
        .search-input {
          padding: 6px 10px 6px 32px !important;
        }
        .base-table .status-pill {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-radius: 0 !important;
          display: inline-block !important;
          text-align: center !important;
          white-space: nowrap !important;
        }
        .base-table .status-pill.status-registered {
          color: #d97706 !important;
        }
        .base-table .status-pill.status-called {
          color: #0284c7 !important;
        }
        .base-table .status-pill.status-entered {
          color: #7c3aed !important;
        }
        .base-table .status-pill.status-completed {
          color: #15803d !important;
        }
        .tab-btn-base {
          background: none !important;
          border: none !important;
          cursor: pointer !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          text-transform: uppercase !important;
          padding: 12px 0px !important;
          color: rgba(0, 52, 102, 0.6) !important;
          border-bottom: 3px solid transparent !important;
          transition: all 0.2s !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .tab-btn-base:hover {
          color: #003466 !important;
        }
        .tab-btn-base.active {
          color: #003466 !important;
          border-bottom: 3px solid #003466 !important;
        }

        /* Modal Backdrop Overlay */
        .custom-modal-overlay {
          position: fixed !important;
          background: rgba(0, 0, 0, 0.5) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 9999 !important;
        }
        @media (min-width: 769px) {
          .custom-modal-overlay {
            left: 220px !important;
            top: 140px !important;
            right: 0 !important;
            bottom: 0 !important;
          }
        }
        @media (max-width: 768px) {
          .custom-modal-overlay {
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
        }

        .modal-header {
          padding: 8px 20px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          background: #ffffff !important;
          border-top-left-radius: 16px !important;
          border-top-right-radius: 16px !important;
        }
        .modal-title {
          font-size: 1.15rem !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          margin: 0 !important;
        }
        .modal-close {
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
        .modal-close:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }
        .modal-body {
          flex: 1 !important;
          overflow-y: auto !important;
          padding: 0.5rem 1.25rem !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.4rem !important;
        }
        .modal-footer {
          padding: 8px 20px !important;
          border-top: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          display: flex !important;
          justify-content: flex-end !important;
          gap: 0.75rem !important;
          flex-shrink: 0 !important;
          border-bottom-left-radius: 16px !important;
          border-bottom-right-radius: 16px !important;
        }

        /* Modal elements focus state */
        .custom-modal-overlay .form-control {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 6px 12px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          width: 100%;
        }
        .custom-modal-overlay .form-control:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay select.form-control {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 6px 12px !important;
          height: 34px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          width: 100%;
        }
        .custom-modal-overlay select.form-control:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }

        .form-row {
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
        }
        .form-label {
          display: block !important;
          margin-bottom: 0px !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          color: #003466 !important;
          text-align: left !important;
          text-transform: uppercase !important;
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

        .mobile-filter-header {
          display: none !important;
        }

        .filter-label {
          display: block !important;
          margin-bottom: 0.4rem !important;
          font-size: 0.8rem !important;
          font-weight: 700 !important;
          color: #003466 !important;
          text-transform: uppercase !important;
          text-align: left !important;
        }

        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-list { 
            display: flex !important; 
            flex-direction: column !important;
            gap: 8px !important;
            padding-bottom: 130px !important; 
            margin-top: 10px !important;
            width: 100% !important;
          }
          .mobile-action-bar {
            display: block !important;
          }
          .mobile-hide { display: none !important; }
          .drawer-container {
            width: 100% !important;
          }
          .mobile-filter-header {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            padding: 5px 15px !important;
            margin-top: 10px !important;
            margin-bottom: 5px !important;
            cursor: pointer !important;
            user-select: none !important;
            transition: background-color 0.2s !important;
          }
          .mobile-filter-header:hover {
            background: #f8fafc !important;
          }
          .mobile-filter-title {
            font-size: 14px !important;
            font-weight: 600 !important;
            color: #0f172a !important;
          }
          .mobile-filter-arrow {
            transition: transform 0.2s ease !important;
            color: #64748b !important;
          }
          .mobile-filter-arrow.open {
            transform: rotate(180deg) !important;
          }
          .base-filters.mobile-hide {
            display: none !important;
          }
          .base-filters.mobile-show {
            display: grid !important;
          }
          .progress-modal-content {
            max-height: 80vh !important;
            margin: auto auto 70px auto !important;
          }
          .search-container {
            position: sticky !important;
            top: 70px !important;
            z-index: 100 !important;
            background: #f8fafc !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 8px 10px !important;
            margin-left: -10px !important;
            margin-right: -10px !important;
            margin-top: 0px !important;
            margin-bottom: 10px !important;
          }

          /* Premium Mobile Card Layout like de-nghi-mua */
          .proposal-card {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            user-select: none !important;
          }
          .proposal-card:hover {
            background: #f8fafc !important;
          }
          .proposal-card.selected {
            border: 1px solid #b9d5f0 !important;
            border-left: 6px solid #003466 !important;
            background-color: #f0f7ff !important;
            box-shadow: 0 4px 6px -1px rgba(0, 52, 102, 0.08) !important;
          }
          .card-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .card-header {
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 5px !important;
            margin-bottom: 6px !important;
          }
          .code-box {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }
          .idx-pill {
            background: #f1f5f9 !important;
            color: #475569 !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          .proposal-code {
            color: #003466 !important;
            font-weight: 700 !important;
            font-size: 13px !important;
          }
          .card-body {
            display: flex !important;
            flex-direction: column !important;
            gap: 3px !important;
          }
          .info-row {
            display: flex !important;
            justify-content: space-between !important;
            font-size: 12px !important;
          }
          .info-label {
            color: #64748b !important;
            font-weight: 500 !important;
          }
          .info-val {
            color: #1e293b !important;
            text-align: right !important;
          }
          .info-val.highlight {
            font-weight: 600 !important;
            color: #0f172a !important;
          }
        }
        @media (min-width: 769px) {
          .desktop-only { display: block !important; }
          .mobile-list { display: none !important; }
        }
      ` }} />

      <div className="breadcrumb-banner">QUẢN LÝ XE VÀO RA</div>

      {/* Mobile filter toggle box */}
      <div 
        className="mobile-filter-header"
        onClick={() => setFilterOpen(!filterOpen)}
      >
        <span className="mobile-filter-title">Tìm kiếm & Bộ lọc</span>
        <ChevronDown size={18} className={`mobile-filter-arrow ${filterOpen ? "open" : ""}`} />
      </div>

      {/* Filters Grid */}
      <div className={`base-filters ${filterOpen ? "mobile-show" : "mobile-hide"}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "10px", marginBottom: "10px" }}>
        <div>
          <label className="filter-label">Tìm kiếm</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", color: "#64748b" }} />
            <input
              type="text"
              placeholder="Tìm kiếm biển số, tài xế, đơn vị..."
              className="form-control"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", paddingLeft: "32px", height: "32px" }}
            />
          </div>
        </div>

        <div>
          <label className="filter-label">Lọc theo ngày</label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                flex: 1
              }}
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "4px",
                  whiteSpace: "nowrap"
                }}
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        <div className="mobile-hide">
          <label className="filter-label">Trạng thái xe</label>
          <select 
            className="form-control" 
            style={{ width: "100%", height: "32px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Chưa ra">Chưa ra ({pendingCount})</option>
            <option value="Đã hoàn thành">Đã ra ({completedCount})</option>
            <option value="Tất cả">Tất cả ({baseFilteredData.length})</option>
          </select>
        </div>

        <div>
          <label className="filter-label">Cài đặt âm thanh</label>
          <button 
            type="button"
            className={`sapo-btn sound-toggle-btn ${currentlySpeakingPlate ? 'speaking' : ''}`} 
            onClick={() => {
              if (isMuted) {
                setIsMuted(false);
                if (typeof window !== 'undefined') {
                  localStorage.setItem("sapo_sound_active", "true");
                }
                playTestVoice();
              } else {
                setIsMuted(true);
                if (typeof window !== 'undefined') {
                  localStorage.setItem("sapo_sound_active", "false");
                }
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
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              height: '32px',
              width: "100%",
              justifyContent: "center"
            }}
          >
            {!isMuted ? '🔊 Âm thanh: BẬT' : '🔇 Âm thanh: TẮT'}
          </button>
        </div>

        <div>
          <label className="filter-label">Mã QR</label>
          <button 
            type="button"
            className="sapo-btn" 
            onClick={() => setShowQrModal(true)}
            style={{ width: "100%", justifyContent: "center", height: "32px" }}
          >
            🔲 Mã QR đăng ký
          </button>
        </div>
      </div>

      <div className="security-layout" style={{ paddingTop: "0px" }}>
        <div className="panel-full">
          {/* Main Action Toolbar (matches de-nghi-mua search-container style) */}
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", marginTop: "0px", flexWrap: "wrap" }}>
            <button className="sapo-btn" onClick={() => { setEditingItem(null); setIsViewOnly(false); setShowModal(true); }}>
              Thêm mới
            </button>
            {selectedItem && (
              <>
                <button className="sapo-btn" onClick={() => handleView(selectedItem)}>
                  Xem
                </button>
                <button className="sapo-btn" onClick={() => handleEdit(selectedItem)}>
                  Sửa
                </button>
                <button className="sapo-btn" onClick={() => handleViewProgress(selectedItem)}>
                  Tiến trình
                </button>
                {(selectedItem.status === "Đã đăng ký" || selectedItem.status === "Đã vào") && (
                  <button className="sapo-btn" onClick={() => handleConfirmEntry(selectedItem.id, selectedItem.licensePlate, selectedItem.driverName)}>
                    Xe vào
                  </button>
                )}
                {(selectedItem.status === "Đã vào cổng" || selectedItem.status === "Đã gọi xe") && (
                  <button className="sapo-btn" onClick={() => handleConfirmExit(selectedItem.id, selectedItem.licensePlate, selectedItem.driverName)}>
                    Hoàn thành
                  </button>
                )}
                {selectedItem.status === "Đã hoàn thành" && (
                  <button className="sapo-btn" onClick={() => handleUndo(selectedItem.id)}>
                    Hoàn tác
                  </button>
                )}
                {isAdmin && selectedItem.status !== "Đã vào cổng" && selectedItem.status !== "Đã hoàn thành" && (
                  <button className="sapo-btn sapo-btn-danger" onClick={() => handleDelete(selectedItem.id, selectedItem.licensePlate, selectedItem.driverName)}>
                    Xóa
                  </button>
                )}
              </>
            )}

          </div>

          {/* Unified Panel (Table & Cards) */}
          <div className="unified-container">

            {/* Desktop Grid Layout */}
            <div className="base-table-wrapper desktop-only">
              <table className="base-table">
                <thead>
                  <tr>
                    <th className="th-first nowrap" style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                    <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Ngày tạo</th>
                    <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Số xe</th>
                    <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tên tài xế</th>
                    <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Số điện thoại</th>
                    <th style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Đơn vị</th>
                    <th style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Mục đích</th>
                    <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Giờ vào</th>
                    <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Giờ ra</th>
                    <th className="th-last nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
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
                        onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                        className={`row-hoverable ${selectedId === item.id ? "row-selected" : ""} ${isRowSpeaking ? "row-speaking-flash" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{index + 1}</td>
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                        <td className="nowrap" style={{ fontWeight: 700, color: "#000", textAlign: "center", textTransform: "uppercase" }}>{item.licensePlate}</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{item.driverName}</td>
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.phoneNumber || "—"}</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{item.unit}</td>
                        <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.purpose}</td>
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>
                          {item.status === "Đã đăng ký" || item.status === "Đã vào"
                            ? "—"
                            : new Date(item.timeIn).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.timeOut ? new Date(item.timeOut).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          <span className={getStatusClass(item.status)}>
                            {item.status === "Đã vào" ? "Đã đăng ký" : item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr style={{ height: "45px" }}>
                      <td colSpan={10} style={{ textAlign: "center", color: "#64748b", verticalAlign: "middle", height: "45px" }}>
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
        {filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", background: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
            Không tìm thấy đăng ký nào.
          </div>
        ) : (
          filteredData.map((item, idx) => {
            const isSelected = selectedId === item.id;
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
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(isSelected ? null : item.id);
                }}
                onDoubleClick={() => handleView(item)}
                className={`proposal-card ${isSelected ? "selected" : ""} ${isRowSpeaking ? "mobile-card-speaking-pulse" : ""}`}
              >
                {/* Header: STT, License Plate and Status */}
                <div className="card-row card-header">
                  <div className="code-box">
                    <span className="idx-pill">#{idx + 1}</span>
                    <span className="proposal-code" style={{ textTransform: "uppercase" }}>{item.licensePlate}</span>
                  </div>
                  <span
                    className={`status-pill ${
                      item.status === "Đã hoàn thành"
                        ? "status-active"
                        : item.status === "Đã đăng ký" || item.status === "Đã vào"
                        ? "status-new"
                        : item.status === "Đã gọi xe"
                        ? "status-pending"
                        : "status-inactive"
                    }`}
                  >
                    {item.status === "Đã vào" ? "Đã đăng ký" : item.status}
                  </span>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <div className="info-row">
                    <span className="info-label">Ngày tạo:</span>
                    <span className="info-val">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Tài xế:</span>
                    <span className="info-val highlight">{item.driverName}</span>
                  </div>
                  {item.phoneNumber && (
                    <div className="info-row">
                      <span className="info-label">Số điện thoại:</span>
                      <span className="info-val">{item.phoneNumber}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Đơn vị:</span>
                    <span className="info-val">{item.unit}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Mục đích:</span>
                    <span className="info-val">{item.purpose}</span>
                  </div>
                  {item.timeIn && (
                    <div className="info-row">
                      <span className="info-label">Giờ vào:</span>
                      <span className="info-val">{new Date(item.timeIn).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {item.timeOut && (
                    <div className="info-row">
                      <span className="info-label">Giờ ra:</span>
                      <span className="info-val">{new Date(item.timeOut).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

        </div>
      </div>

      {/* Edit/Create Modal Popup */}
      {showModal && (
        <div className="custom-modal-overlay">
          <div
            style={{
              width: "95%",
              maxWidth: "500px",
              maxHeight: "90%",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {isViewOnly ? "👁️ Chi tiết xe ra vào" : (editingItem ? "✏️ Sửa thông tin xe ra vào" : "🚗 Thêm mới xe ra vào")}
              </h3>
              <button className="modal-close" onClick={handleClose}>✕</button>
            </div>

            <div style={{ background: "#003466", padding: "4px 20px", borderBottom: "1px solid #002244", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
              <p style={{ margin: 0, color: "#ffffff" }}>
                Người thực hiện: <strong style={{ color: "#ffffff" }}>{editingItem?.creator || currentUserName}</strong>
              </p>
              <p style={{ margin: 0, color: "#ffffff" }}>
                Ngày tạo: <strong style={{ color: "#ffffff" }}>{editingItem ? new Date(editingItem.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}</strong>
              </p>
            </div>

            <form key={editingItem?.id || "new"} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", margin: 0 }}>
              <div className="modal-body">
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div className="form-row" style={{ flex: 4 }}>
                    <label className="form-label">SỐ XE <span style={{ color: "red" }}>(*)</span></label>
                    <input type="text" name="licensePlate" className="form-control" defaultValue={editingItem?.licensePlate || ""} required disabled={isViewOnly} style={{ textTransform: "uppercase", height: "34px", width: "100%" }} placeholder="VD: 29C-12345" />
                  </div>
                  <div className="form-row" style={{ flex: 6 }}>
                    <label className="form-label">TÊN TÀI XẾ <span style={{ color: "red" }}>(*)</span></label>
                    <input type="text" name="driverName" className="form-control" defaultValue={editingItem?.driverName || ""} required disabled={isViewOnly} style={{ textTransform: "uppercase", height: "34px", width: "100%" }} placeholder="TÊN TÀI XẾ" />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">ĐƠN VỊ <span style={{ color: "red" }}>(*)</span></label>
                  <input type="text" name="unit" className="form-control" defaultValue={editingItem?.unit || ""} required disabled={isViewOnly} style={{ textTransform: "uppercase", height: "34px" }} placeholder="ĐƠN VỊ CÔNG TÁC" />
                </div>
                 <div style={{ display: "flex", gap: "1rem" }}>
                  <div className="form-row" style={{ flex: 1 }}>
                    <label className="form-label">SỐ CCCD <span style={{ color: "red" }}>(*)</span></label>
                    <input type="text" name="idCardNumber" className="form-control" defaultValue={editingItem?.idCardNumber || ""} required disabled={isViewOnly} style={{ textTransform: "uppercase", height: "34px", width: "100%" }} placeholder="CCCD / CMTND" />
                  </div>
                  <div style={{ flex: 1 }} className="form-row">
                    <label className="form-label">SỐ ĐIỆN THOẠI <span style={{ color: "red" }}>(*)</span></label>
                    <input type="text" name="phoneNumber" className="form-control" defaultValue={editingItem?.phoneNumber || ""} required disabled={isViewOnly} style={{ height: "34px", width: "100%" }} placeholder="SỐ ĐIỆN THOẠI" />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">MỤC ĐÍCH <span style={{ color: "red" }}>(*)</span></label>
                  <select name="purpose" className="form-control" defaultValue={editingItem?.purpose || PURPOSES[0]} required disabled={isViewOnly} style={{ height: "34px", padding: "0 8px" }}>
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">NHÀ MÁY <span style={{ color: "red" }}>(*)</span></label>
                  <input type="hidden" name="branch" value={editingItem?.branch || (activeBranch && ["Đồng Tháp", "Đắk Lắk", "Hồ Chí Minh"].includes(activeBranch) ? activeBranch : "Đồng Tháp")} />
                  <select name="branch_select" className="form-control" defaultValue={editingItem?.branch || (activeBranch && ["Đồng Tháp", "Đắk Lắk", "Hồ Chí Minh"].includes(activeBranch) ? activeBranch : "Đồng Tháp")} required disabled style={{ height: "34px", padding: "0 8px" }}>
                    <option value="Đồng Tháp">Đồng Tháp</option>
                    <option value="Đắk Lắk">Đắk Lắk</option>
                    <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">GHI CHÚ</label>
                  <textarea name="note" className="form-control" defaultValue={editingItem?.note || ""} disabled={isViewOnly} rows={2} placeholder="Nhập ghi chú thêm..." style={{ resize: "none" }}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>Thoát</button>
                {!isViewOnly && (
                  <button type="submit" className="sapo-btn" disabled={isPending}>
                    {isPending ? "Đang xử lý..." : "Lưu đăng ký"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Exit Modal */}
      {showConfirmModal && confirmData && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
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
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
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
        <div className="modal-overlay" style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0" }} onClick={() => setShowProgressModal(false)}>
          <div
            className="modal-content progress-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "680px",
              width: "95%",
              maxHeight: "88vh",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              padding: "0",
              borderRadius: "15px",
              overflowY: "auto",
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

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
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
                      const isCalled = progressItem.status === "Đã gọi xe";
                      const hasEnteredQueue = progressItem.status !== "Đã đăng ký" && progressItem.status !== "Đã vào";

                      const waitingToCallList = (() => {
                        const itemDate = new Date(progressItem.createdAt).toDateString();
                        const sameDayRegs = data.filter(
                          r => new Date(r.createdAt).toDateString() === itemDate &&
                          r.purpose === progressItem.purpose
                        );
                        const uncalledRegs = sameDayRegs.filter(r => r.status === "Đã vào cổng");
                        uncalledRegs.sort((a, b) => new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime());
                        return uncalledRegs;
                      })();

                      const myIndexInWaiting = waitingToCallList.findIndex(r => r.id === progressItem.id);
                      const myQueuePos = myIndexInWaiting !== -1 ? myIndexInWaiting + 1 : null;
                      const wInFront = myIndexInWaiting !== -1 ? myIndexInWaiting : 0;

                      const qNumber = (() => {
                        const itemDate = new Date(progressItem.createdAt).toDateString();
                        const sameDayRegs = data.filter(r => new Date(r.createdAt).toDateString() === itemDate);
                        sameDayRegs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                        const myIndex = sameDayRegs.findIndex(r => r.id === progressItem.id);
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
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: isCompleted ? "#166534" : (isCalled ? "#0284c7" : (!hasEnteredQueue ? "#b45309" : "#0369a1")), textTransform: "uppercase" }}>
                              {isCompleted || isCalled || !hasEnteredQueue ? "Trạng thái xe" : "Vị trí hàng đợi chờ gọi"}
                            </span>
                            <div style={{ fontSize: isCompleted || isCalled || !hasEnteredQueue ? "2rem" : "2.4rem", fontWeight: 900, color: isCompleted ? "#10b981" : (isCalled ? "#0284c7" : (hasEnteredQueue ? "#0284c7" : "#d97706")), margin: "0.15rem 0", lineHeight: 1 }}>
                              {isCompleted ? "ĐÃ RA CỔNG" : (isCalled ? "ĐÃ GỌI XE" : (hasEnteredQueue ? `#${myQueuePos}` : "CHỜ VÀO CỔNG"))}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                              <span>Hàng đợi: <strong style={{ color: "#334155" }}>{progressItem.purpose}</strong></span>
                              <span>Số thứ tự đăng ký trong ngày: <strong style={{ color: "#334155" }}>{qNumber ? `#${qNumber}` : "—"}</strong></span>
                            </div>
                          </div>

                          {/* Queue Real-time Message */}
                          {!isCompleted && !isCalled && (
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
                                <>📢 Xe tiếp theo chuẩn bị được gọi!</>
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
                                    <>3. Đã gọi vào: {(() => {
                                      const t = progressData?.calledInfo?.type || 'can-xe';
                                      if (t === 'can-xe') return 'Cân xe';
                                      if (t === 'kho-vat-tu') return 'Kho vật tư';
                                      if (t === 'kho-nguyen-lieu-cua-1') return 'Kho nguyên liệu cửa 1';
                                      if (t === 'kho-nguyen-lieu-cua-2') return 'Kho nguyên liệu cửa 2';
                                      return 'Cân xe';
                                    })()}</>
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
                      {origin ? (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') ? 'https://ems.sapodaklak.com' : origin}/x/${progressItem.id}`)}`}
                          alt="QR Theo dõi xếp hàng"
                          style={{ width: "150px", height: "150px" }}
                        />
                      ) : (
                        <div style={{ width: "150px", height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "11px", fontWeight: 500 }}>
                          Đang khởi tạo...
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "0.5rem 0 0 0", lineHeight: "1.4", textAlign: "center", fontWeight: 500 }}>
                      Tài xế dùng điện thoại quét mã này để theo dõi tiến trình trực tiếp.
                    </p>
                    <button
                      onClick={() => {
                        const resolvedOrigin = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') ? 'https://ems.sapodaklak.com' : origin;
                        const trackingUrl = `${resolvedOrigin}/x/${progressItem.id}`;
                        const message = `Sapo EMS: Đăng ký thành công cho xe ${progressItem.licensePlate}. Theo dõi vị trí hàng đợi chờ gọi tại: ${trackingUrl}`;
                        navigator.clipboard.writeText(message);
                        alert("Đã sao chép tin nhắn gửi Zalo vào bộ nhớ tạm!");
                        if (progressItem.phoneNumber) {
                          window.open(`https://zalo.me/${progressItem.phoneNumber.replace(/[^0-9]/g, '')}`, '_blank');
                        } else {
                          alert("Không có số điện thoại tài xế để mở Zalo!");
                        }
                      }}
                      className="btn-base"
                      style={{
                        marginTop: "10px",
                        fontSize: "11px",
                        width: "100%",
                        padding: "5px 10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        border: "1px solid #0284c7",
                        borderRadius: "6px",
                        color: "#0284c7",
                        background: "white",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      💬 Gửi qua Zalo
                    </button>
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
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
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
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowQrModal(false)}>
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
                {origin ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(`${origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') ? 'https://ems.sapodaklak.com' : origin}/dk?token=sapo-gate-secure-token-2026`)}`}
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
                  {origin ? `${origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') ? 'https://ems.sapodaklak.com' : origin}/dk?token=sapo-gate-secure-token-2026` : ""}
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

      {/* Sound Activation Modal */}
      {showSoundActivationModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "420px", textAlign: "center", padding: "1.75rem", borderRadius: "12px", border: "none" }}>
            <div style={{ color: "#003466", marginBottom: "1rem", fontSize: "3rem" }}>
              📢
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.6rem", color: "#1e293b", fontWeight: 700 }}>
              Kích hoạt âm thanh thông báo?
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "1.5rem", lineHeight: "1.45" }}>
              Hệ thống cần được kích hoạt âm thanh để tự động phát loa gọi xe lên cân/vào kho khi đến lượt.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                className="sapo-btn"
                style={{ height: "36px", padding: "0 24px" }}
                onClick={() => {
                  setIsMuted(false);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem("sapo_sound_active", "true");
                  }
                  playTestVoice();
                  setShowSoundActivationModal(false);
                }}
              >
                KÍCH HOẠT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
