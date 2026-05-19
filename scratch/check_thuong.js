const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emps = await prisma.employee.findMany({ where: { fullName: { contains: "Thương" } } });
  console.log("Employees:", emps);
  const users = await prisma.user.findMany({ where: { employeeName: { contains: "Thương" } } });
  console.log("Users:", users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
