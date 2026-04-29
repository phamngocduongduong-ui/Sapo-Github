"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encrypt } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function login(prevState: any, formData: FormData) {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

  if (!username || !password) {
        return { error: "Please fill in all fields" };
  }

  const user = await prisma.user.findUnique({
        where: { username },
  });

  if (!user || user.password !== password) {
        return { error: "Invalid username or password" };
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ userId: user.id, expires });

  const cookieStore = await cookies();
    cookieStore.set("session", session, {
          expires,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
    });

  redirect("/");
}
