import { prisma } from "../src/lib/db";

async function debug() {
  const users = await prisma.user.findMany({
    select: { username: true, branch: true }
  });
  console.log("Users and their branches:");
  console.table(users);

  const employees = await prisma.employee.findMany({
    take: 5,
    select: { fullName: true, branch: true }
  });
  console.log("Employees and their branches:");
  console.table(employees);
}

debug();
