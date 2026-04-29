import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang xóa toàn bộ dữ liệu ---');

  // Xóa các bảng giao dịch trước (có khóa ngoại)
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.materialPlan.deleteMany({});
  
  await prisma.productionPlanItem.deleteMany({});
  await prisma.productionPlan.deleteMany({});
  
  await prisma.purchasingPlanItem.deleteMany({});
  await prisma.dispatchOrder.deleteMany({});
  await prisma.purchasingPlan.deleteMany({});
  
  await prisma.leaveRequest.deleteMany({});
  await prisma.salaryIncreaseRequest.deleteMany({});
  
  // Xóa các bảng danh mục
  await prisma.product.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.position.deleteMany({});
  await prisma.country.deleteMany({});
  
  // Xóa Employee
  await prisma.employee.deleteMany({});
  
  // Xóa User trừ admin (hoặc xóa hết rồi tạo lại admin)
  await prisma.user.deleteMany({});
  
  console.log('--- Tạo tài khoản quản trị mặc định ---');
  await prisma.user.create({
    data: {
      username: 'admin',
      password: 'admin', // Mật khẩu mặc định là admin
      role: 'ADMIN',
      status: 'ACTIVE',
      employeeName: 'Quản trị viên'
    }
  });

  console.log('--- Đã xóa sạch dữ liệu. Tài khoản đăng nhập mới: admin / admin ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
