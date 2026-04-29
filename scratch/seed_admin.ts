import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: "123",
      employeeName: "Quản trị viên",
      role: "ADMIN",
      status: "ACTIVE"
    }
  });
  console.log("Admin account created:", admin);
}

main().catch(console.error);
