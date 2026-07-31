/**
 * Simple XOR Cipher for obfuscating/encrypting client-side device secret in localStorage.
 * This prevents users from simply copying the raw secret key between devices,
 * because the cipher uses the unique username as salt/key.
 */

// Helper to generate a random 32-character hex secret
export function generateDeviceSecret(): string {
  const array = new Uint8Array(16);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for non-browser environment
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Simple encryption using XOR with a key derived from the username
export function encryptSecret(secret: string, username: string): string {
  const key = username || "ems_default_salt";
  let result = "";
  for (let i = 0; i < secret.length; i++) {
    const charCode = secret.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  // Convert binary string to Base64 (using safe methods for browser / Node)
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(result)));
  } else {
    return Buffer.from(result, 'utf-8').toString('base64');
  }
}

// Simple decryption using XOR with key
export function decryptSecret(encrypted: string, username: string): string {
  try {
    const key = username || "ems_default_salt";
    let binary = "";
    if (typeof atob !== "undefined") {
      binary = decodeURIComponent(escape(atob(encrypted)));
    } else {
      binary = Buffer.from(encrypted, 'base64').toString('utf-8');
    }
    let result = "";
    for (let i = 0; i < binary.length; i++) {
      const charCode = binary.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error("Failed to decrypt device secret:", e);
    return "";
  }
}

// Helper to interact with IndexedDB for storing device secrets
function getIndexedDBSecret(username: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve("");
      return;
    }
    try {
      const request = window.indexedDB.open("ems_device_db", 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("secrets")) {
          db.createObjectStore("secrets");
        }
      };
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction("secrets", "readonly");
          const store = transaction.objectStore("secrets");
          const getReq = store.get(username);
          getReq.onsuccess = () => {
            resolve(getReq.result || "");
          };
          getReq.onerror = () => resolve("");
        } catch (e) {
          resolve("");
        }
      };
      request.onerror = () => resolve("");
    } catch (e) {
      resolve("");
    }
  });
}

function setIndexedDBSecret(username: string, encryptedValue: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve();
      return;
    }
    try {
      const request = window.indexedDB.open("ems_device_db", 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("secrets")) {
          db.createObjectStore("secrets");
        }
      };
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction("secrets", "readwrite");
          const store = transaction.objectStore("secrets");
          const putReq = store.put(encryptedValue, username);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      };
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

// Helper to interact with Cookies
function getCookieSecret(username: string): string {
  if (typeof document === "undefined") return "";
  const name = `ems_dev_sec_${username}=`;
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function setCookieSecret(username: string, encryptedValue: string) {
  if (typeof document === "undefined") return;
  // Cookie lasts for 10 years (315360000 seconds)
  document.cookie = `ems_dev_sec_${username}=${encryptedValue}; path=/; max-age=315360000; SameSite=Lax; Secure`;
}

// Helper to interact with LocalStorage
function getLocalStorageSecret(username: string): string {
  if (typeof window === "undefined") return "";
  let val = localStorage.getItem(`ems_device_secret_${username}`);
  if (!val) {
    // Legacy fallback key to support old logins that used the single key
    val = localStorage.getItem("ems_device_secret");
  }
  return val || "";
}

function setLocalStorageSecret(username: string, encryptedValue: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`ems_device_secret_${username}`, encryptedValue);
  // Maintain the legacy fallback key to ease migrations
  localStorage.setItem("ems_device_secret", encryptedValue);
}

export function getBrowserAndSourceInfo(): { browser: string; source: string; os: string; fullInfo: string } {
  if (typeof window === "undefined") {
    return { browser: "Unknown", source: "Unknown", os: "Unknown", fullInfo: "Server" };
  }

  const ua = navigator.userAgent;

  // OS detection
  let os = "Desktop/Khác";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS (iPhone/iPad)";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";

  // Source (Zalo App vs Direct Web)
  let source = "Web trực tiếp";
  const ref = typeof document !== "undefined" ? document.referrer || "" : "";
  if (/Zalo/i.test(ua) || /ZaloTheme/i.test(ua) || /zalo/i.test(ref)) {
    source = "Zalo App";
  } else if (/FBAN|FBAV|Instagram|TikTok/i.test(ua)) {
    source = "Ứng dụng Mạng xã hội";
  }

  // Browser detection
  let browser = "Khác";
  if (/Zalo/i.test(ua)) {
    browser = "Zalo In-App Browser";
  } else if (/CriOS/i.test(ua)) {
    browser = "Chrome iOS";
  } else if (/FxiOS/i.test(ua)) {
    browser = "Firefox iOS";
  } else if (/Edg/i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Safari";
  }

  const fullInfo = `${os} • ${browser} (Nguồn: ${source})`;

  return { browser, source, os, fullInfo };
}

export function getHardwareFingerprint(username: string): string {
  if (typeof window === "undefined") return "";
  try {
    const parts: string[] = [
      username,
      `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
      `${window.devicePixelRatio || 1}`,
      `${navigator.hardwareConcurrency || 0}`,
      `${(navigator as any).deviceMemory || 0}`,
      navigator.platform || ""
    ];

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("SAPO_EMS_FP", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("SAPO_EMS_FP", 4, 17);
        parts.push(canvas.toDataURL());
      }
    } catch (e) {}

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          parts.push(`${vendor}~${renderer}`);
        }
      }
    } catch (e) {}

    const rawStr = parts.join("|||");
    let hash = 0x811c9dc5;
    for (let i = 0; i < rawStr.length; i++) {
      hash ^= rawStr.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return "hwfp_" + (hash >>> 0).toString(16);
  } catch (e) {
    return "";
  }
}

/**
 * Loads device secret by checking LocalStorage, Cookies, and IndexedDB.
 * Synthesizes a new one only if none exist, then synchronizes it across all three channels.
 */
export async function loadOrRegisterDeviceSecret(username: string): Promise<string> {
  if (typeof window === "undefined") return "";

  // 1. Read from all 3 storage sources
  let localVal = getLocalStorageSecret(username);
  let cookieVal = getCookieSecret(username);
  let idbVal = await getIndexedDBSecret(username);

  // 2. Select the first available encrypted value
  let encrypted = localVal || cookieVal || idbVal;
  let secret = "";

  if (encrypted) {
    secret = decryptSecret(encrypted, username);
  }

  // 3. Generate hardware fingerprint based secret if none is found
  if (!secret) {
    const hwFp = getHardwareFingerprint(username);
    const randomHex = generateDeviceSecret();
    secret = hwFp ? `${hwFp}_${randomHex}` : randomHex;
    encrypted = encryptSecret(secret, username);
  }

  // 4. Synergize and persist back to all 3 channels for redundancy
  setLocalStorageSecret(username, encrypted);
  setCookieSecret(username, encrypted);
  await setIndexedDBSecret(username, encrypted);

  return secret;
}

