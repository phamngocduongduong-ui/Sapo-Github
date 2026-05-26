const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({ take: 5 });
  const branches = await prisma.branch.findMany({ take: 5 });
  const employees = await prisma.employee.findMany({ take: 5 });
  const products = await prisma.product.findMany({ take: 5 });
  
  console.log("Customers:", customers.map(c => c.code));
  console.log("Branches:", branches.map(b => b.name));
  console.log("Employees:", employees.map(e => e.fullName));
  console.log("Products:", products.map(p => p.name));
}

main()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
