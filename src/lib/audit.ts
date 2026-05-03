import { prisma } from "./db";

export async function logAudit({
  tableName,
  recordId,
  action,
  oldData,
  newData,
  changedBy,
  changeDetail
}: {
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  oldData?: any;
  newData?: any;
  changedBy: string;
  changeDetail?: string;
}) {
  try {
    await (prisma as any).auditlog.create({
      data: {
        tableName,
        recordId,
        action,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
        changedBy,
        changeDetail
      }
    });

  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
