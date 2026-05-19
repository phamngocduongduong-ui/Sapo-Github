import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmp = await prisma.employee.findFirst({
    where: { fullName: "Quản trị viên" }
  });

  if (!adminEmp) {
    await prisma.employee.create({
      data: {
        id: "admin-emp-01",
        employeeCode: "ADMIN01",
        fullName: "Quản trị viên",
        position: "Quản trị hệ thống",
        department: "Ban Giám Đốc",
        branch: "Hồ Chí Minh",
        status: "ACTIVE",
        startDate: new Date(),
        creator: "System",
        updatedAt: new Date()
      }
    });
    console.log("Created employee record for Quản trị viên");
  } else {
    console.log("Employee record for Quản trị viên already exists");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
