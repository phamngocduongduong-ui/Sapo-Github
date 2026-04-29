import { revalidatePath } from "next/cache";

// Mock for static export - Server Actions are not supported on GitHub Pages
export async function ensureDefaultAdmin(...args: any[]) {
        console.log("ensureDefaultAdmin: Skipped (Static Export)", args);
        return;
}

export async function createUser(...args: any[]) {
        console.log("createUser: Skipped (Static Export)", args);
        return;
}

export async function updateUser(...args: any[]) {
        console.log("updateUser: Skipped (Static Export)", args);
        return;
}

export async function updateUserStatus(...args: any[]) {
        console.log("updateUserStatus: Skipped (Static Export)", args);
        return;
}

export async function resetPassword(...args: any[]) {
        console.log("resetPassword: Skipped (Static Export)", args);
        return;
}
