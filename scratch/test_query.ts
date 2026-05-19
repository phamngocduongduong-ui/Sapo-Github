import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await (prisma as any).user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { permission: true }
  });

  const activeEmployees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { fullName: true },
    orderBy: { fullName: "asc" }
  });

  console.log("USERS:", JSON.stringify(users.map(u => ({...u, createdAt: u.createdAt.toISOString()})), null, 2));
  console.log("ACTIVE EMPLOYEES:", JSON.stringify(activeEmployees, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
