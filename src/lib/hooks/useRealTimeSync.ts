"use client";

import { useEffect, useRef } from "react";

export function useRealTimeSync<T>(
  module: string,
  currentData: T[],
  onUpdate: (newData: T[]) => void,
  intervalMs: number = 3000
) {
  const dataRef = useRef(currentData);

  useEffect(() => {
    dataRef.current = currentData;
  }, [currentData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?module=${module}`);
        if (res.ok) {
          const newData = await res.json();
          // So sánh dữ liệu để tránh cập nhật state liên tục nếu không có thay đổi
          if (JSON.stringify(newData) !== JSON.stringify(dataRef.current)) {
            onUpdate(newData);
          }
        }
      } catch (error) {
        console.error(`Sync error for ${module}:`, error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [module, onUpdate, intervalMs]);
}
