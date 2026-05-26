const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ALL_MODULE_KEYS = [
    "CA_NHAN", "CN_HO_SO", "CN_CHAM_CONG", "CN_NGHI_PHEP", "CN_NGHI_VIEC", "CN_TRA_CUU_LUONG",
    "DANH_MUC", "DM_BO_PHAN", "DM_CHI_NHANH", "DM_CHUC_VU", "DM_KHACH_HANG", "DM_NHA_CUNG_CAP", "DM_NHOM_SP", "DM_QUOC_GIA", "DM_SAN_PHAM", "DM_DON_VI_TINH", "DM_KHO_HANG", "DM_VI_TRI",
    "NHAN_SU", "NS_NHAN_VIEN", "NS_HOP_DONG", "NS_DIEU_DONG", "NS_APPROVE", "NS_BAO_CAO",
    "LUONG_BHXH", "LB_CHAM_CONG", "LB_KHU_VUC", "NS_BANG_LUONG", "NS_TANG_GIAM_LUONG", "NS_BAC_LUONG",
    "KINH_DOANH", "KD_HOP_DONG", "KD_DON_HANG",
    "THU_MUA", "TM_LENH_MUA", "TM_APPROVE", "TM_DON_MUA", "TM_DIEU_DONG", "TM_BAO_CAO",
    "SAN_XUAT", "SX_DON_SAN_XUAT", "SX_KE_HOACH_GIAO", "SX_VAT_TU",
    "BAO_TRI", "BT_DE_NGHI_MUA", "BT_PHE_DUYET",
    "THU_KHO", "TK_KHO_VAT_TU", "TK_KHO_THANH_PHAM",
    "QUAN_TRI", "QT_TAI_KHOAN", "QT_MUC_QUYEN", "QT_PHAN_QUYEN",
    "AN_NINH", "AN_DANG_KY", "AN_DANH_SACH", "AN_KIEM_TRA",
    "PHE_DUYET", "PD_NHAN_SU", "PD_HOP_DONG_LD", "PD_HOP_DONG_BH", "PD_LUONG_THUONG", "PD_THANH_TOAN", "PD_MUA_HANG", "PD_BAO_TRI"
  ];

  let adminPermission = await prisma.permission.findUnique({ where: { code: "ADMIN_FULL" } });
  if (!adminPermission) {
    adminPermission = await prisma.permission.create({
      data: {
        id: require('crypto').randomUUID(),
        code: "ADMIN_FULL",
        name: "Quản trị hệ thống (Toàn quyền)",
      }
    });
  }

  // Dọn dẹp các moduleKey cũ/lỗi thời
  await prisma.permissiondetail.deleteMany({
    where: {
      moduleKey: {
        notIn: ALL_MODULE_KEYS
      }
    }
  });

  // Đồng bộ chi tiết quyền cho ADMIN_FULL
  const existingAdminDetails = await prisma.permissiondetail.findMany({
    where: { permissionId: adminPermission.id }
  });
  const existingAdminKeys = new Set(existingAdminDetails.map(d => d.moduleKey));
  const adminKeysToInsert = ALL_MODULE_KEYS.filter(key => !existingAdminKeys.has(key));

  if (adminKeysToInsert.length > 0) {
    await prisma.permissiondetail.createMany({
      data: adminKeysToInsert.map(key => ({
        permissionId: adminPermission.id,
        moduleKey: key,
        canAccess: true
      }))
    });
    console.log(`Inserted ${adminKeysToInsert.length} keys for ADMIN_FULL.`);
  } else {
    console.log("ADMIN_FULL already has all keys.");
  }
  
  // Đảm bảo các quyền PHE_DUYET luôn được canAccess = true
  const updated = await prisma.permissiondetail.updateMany({
    where: {
      permissionId: adminPermission.id,
      moduleKey: {
        in: ["PHE_DUYET", "PD_NHAN_SU", "PD_HOP_DONG_LD", "PD_HOP_DONG_BH", "PD_LUONG_THUONG", "PD_THANH_TOAN", "PD_MUA_HANG", "PD_BAO_TRI"]
      }
    },
    data: {
      canAccess: true
    }
  });
  console.log(`Updated ${updated.count} keys to canAccess = true for ADMIN_FULL.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
