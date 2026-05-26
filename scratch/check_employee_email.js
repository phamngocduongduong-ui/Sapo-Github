const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: {
      fullName: {
        contains: "Phạm Ngọc Dương"
      }
    }
  });
  console.log("Found employees count:", employees.length);
  employees.forEach(emp => {
    console.log(`ID: ${emp.id}, Code: ${emp.employeeCode}, Name: ${emp.fullName}, Email: ${emp.email}, Status: ${emp.status}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
