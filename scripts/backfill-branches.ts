import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting backfill for LaborContract branches...');
  
  const contracts = await prisma.laborContract.findMany({
    where: { branch: null }
  });

  for (const contract of contracts) {
    const employee = await prisma.employee.findFirst({
      where: { fullName: contract.employeeName }
    });

    if (employee && employee.branch) {
      await prisma.laborContract.update({
        where: { id: contract.id },
        data: { branch: employee.branch }
      });
      console.log(`Updated contract ${contract.contractNumber} with branch ${employee.branch}`);
    } else {
      console.log(`Could not find branch for employee ${contract.employeeName}`);
    }
  }

  console.log('Backfill for LaborContract finished.');

  console.log('Starting backfill for other HR modules...');
  
  // Attendance
  const attendances = await prisma.attendance.findMany({ where: { branch: null } });
  for (const att of attendances) {
    const emp = await prisma.employee.findUnique({ where: { employeeCode: att.employeeCode } });
    if (emp && emp.branch) {
      await prisma.attendance.update({ where: { id: att.id }, data: { branch: emp.branch } });
    }
  }

  // TransferPromotion
  const transfers = await prisma.transferPromotion.findMany({ where: { branch: null } });
  for (const tr of transfers) {
    const emp = await prisma.employee.findFirst({ where: { fullName: tr.employeeName } });
    if (emp && emp.branch) {
      await prisma.transferPromotion.update({ where: { id: tr.id }, data: { branch: emp.branch } });
    }
  }

  // LeaveRequest
  const leaves = await prisma.leaveRequest.findMany({ where: { branch: null } });
  for (const lv of leaves) {
    const emp = await prisma.employee.findFirst({ where: { fullName: lv.employeeName } });
    if (emp && emp.branch) {
      await prisma.leaveRequest.update({ where: { id: lv.id }, data: { branch: emp.branch } });
    }
  }

  // SalaryChange
  const salaryChanges = await prisma.salaryChange.findMany({ where: { branch: null } });
  for (const sc of salaryChanges) {
    const emp = await prisma.employee.findFirst({ where: { fullName: sc.employeeName } });
    if (emp && emp.branch) {
      await prisma.salaryChange.update({ where: { id: sc.id }, data: { branch: emp.branch } });
    }
  }

  console.log('Backfill finished.');
}

backfill()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
