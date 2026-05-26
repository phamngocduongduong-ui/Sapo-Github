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
