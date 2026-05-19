"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hardware card scanners act as keyboard emulators typing at extremely high speed.
      // We analyze typing speed to distinguish scanners from human typing.
      const currentTime = Date.now();
      const diff = currentTime - lastTimeRef.current;
      
      // Update last timestamp
      lastTimeRef.current = currentTime;

      // If time between keystrokes is more than 50ms, it is human typing.
      // Reset the buffer to avoid false positives.
      if (diff > 50 && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      if (e.key === "Enter") {
        const finalCode = bufferRef.current.trim();
        // Hardware card scanned codes are typically at least 4 characters long.
        if (finalCode.length >= 4) {
          e.preventDefault();
          e.stopPropagation();
          bufferRef.current = "";
          
          // Redirect globally to the check page with the scanned card code
          router.push(`/an-ninh/kiem-tra?scan=${encodeURIComponent(finalCode)}`);
        }
        bufferRef.current = "";
      } else if (e.key.length === 1) {
        // Build the card code string char by char
        bufferRef.current += e.key;
      }
    };

    // Use capture phase (third argument: true) to intercept events before child inputs process them
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [router]);

  return <>{children}</>;
}
