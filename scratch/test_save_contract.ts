
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const employeeName = "Trần Văn Thương";
  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });
  
  if (!employee) {
    console.log("Employee not found");
    return;
  }

  try {
    const newContract = await prisma.laborContract.create({
      data: {
        employeeName,
        contractNumber: "TEST/001",
        contractType: "Hợp đồng chính thức",
        contractDate: new Date(),
        startDate: new Date(),
        durationMonths: 12,
        endDate: new Date(),
        position: employee.position,
        department: employee.department,
        salaryLevel: "L01",
        creator: "Admin",
        approver: "",
        note: "",
        branch: employee.branch || "",
        status: "Tạo mới",
        salaryBase: 5000000,
        attendanceAllowance: 500000,
        performanceAllowance: 500000,
        responsibilityAllowance: 0,
        attractionAllowance: 0,
        positionAllowance: 0,
        otherAllowance: 0,
        socialInsurance: 1000000,
        createdDate: new Date()
      }
    });
    console.log("Success:", newContract);
  } catch (err) {
    console.error("Error:", err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
