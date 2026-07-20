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

  // 3. Generate a new secret if decryption fails or if no secret is found
  if (!secret) {
    secret = generateDeviceSecret();
    encrypted = encryptSecret(secret, username);
  }

  // 4. Synergize and persist back to all 3 channels for redundancy
  setLocalStorageSecret(username, encrypted);
  setCookieSecret(username, encrypted);
  await setIndexedDBSecret(username, encrypted);

  return secret;
}

