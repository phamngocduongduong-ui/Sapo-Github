import { revalidatePath } from "next/cache";

// Mock for static export - Server Actions are not supported on GitHub Pages
export async function ensureDefaultAdmin() {
    console.log("ensureDefaultAdmin: Skipped (Static Export)");
    return;
}

