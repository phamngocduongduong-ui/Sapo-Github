const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking admin user...");
  const admin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (!admin) {
    console.log("Creating default admin...");
    await prisma.user.create({
      data: {
        username: 'admin',
        password: 'Admin123',
        employeeName: 'Admin',
        role: 'Admin',
        status: 'ACTIVE',
        branch: 'Tất cả chi nhánh'
      }
    });
    console.log("✅ Admin account created successfully!");
  } else {
    await prisma.user.update({
      where: { username: 'admin' },
      data: {
        employeeName: 'Admin',
        role: 'Admin',
        status: 'ACTIVE'
      }
    });
    console.log("✅ Admin account updated!");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
