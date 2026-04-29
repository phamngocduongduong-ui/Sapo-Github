import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany();
  const contracts = await prisma.laborContract.findMany();
  const attendances = await prisma.attendance.findMany();
  
  console.log("--- All Employees ---");
  console.log(JSON.stringify(employees, null, 2));
}

main().catch(console.error);
