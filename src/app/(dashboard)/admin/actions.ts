import { revalidatePath } from "next/cache";

// Mock for static export - Server Actions are not supported on GitHub Pages
export async function ensureDefaultAdmin() {
      console.log("ensureDefaultAdmin: Skipped (Static Export)");
      return;
}

export async function createUser() {
      console.log("createUser: Skipped (Static Export)");
      return;
}

export async function updateUser() {
      console.log("updateUser: Skipped (Static Export)");
      return;
}

export async function updateUserStatus() {
      console.log("updateUserStatus: Skipped (Static Export)");
      return;
}

export async function resetPassword() {
      console.log("resetPassword: Skipped (Static Export)");
      return;
}
