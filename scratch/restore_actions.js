const { execSync } = require('child_process');

const files = [
  'src/app/(dashboard)/danh-muc/chi-nhanh/actions.ts',
  'src/app/(dashboard)/danh-muc/khach-hang/actions.ts',
  'src/app/(dashboard)/nhan-su/bac-luong/actions.ts',
  'src/app/(dashboard)/nhan-su/bang-luong/actions.ts',
  'src/app/(dashboard)/nhan-su/bo-phan/actions.ts',
  'src/app/(dashboard)/nhan-su/cham-cong/actions.ts',
  'src/app/(dashboard)/nhan-su/chuc-vu/actions.ts',
  'src/app/(dashboard)/nhan-su/hop-dong/actions.ts',
  'src/app/(dashboard)/nhan-su/nghi-phep/actions.ts',
  'src/app/(dashboard)/nhan-su/nhan-vien/actions.ts',
  'src/app/(dashboard)/nhan-su/tang-giam-luong/actions.ts',
  'src/app/(dashboard)/production/ke-hoach-vat-tu/actions.ts',
  'src/app/(dashboard)/profile/actions.ts',
  'src/app/(dashboard)/purchasing/dispatch/actions.ts',
  'src/app/(dashboard)/sales/don-hang/actions.ts',
  'src/app/login/actions.ts',
  'src/app/(dashboard)/admin/actions.ts'
];

files.forEach(file => {
  try {
    console.log(`Restoring ${file}...`);
    execSync(`git checkout 505d43d -- "${file}"`);
  } catch (e) {
    console.error(`Failed to restore ${file}: ${e.message}`);
  }
});
