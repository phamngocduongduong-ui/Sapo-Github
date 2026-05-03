const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany();
  console.log('All Branches:', branches.map(b => b.name));
  
  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
  console.log('Admin User Branch Field:', admin?.branch);
}

main().catch(console.error).finally(() => prisma.$disconnect());
