"use server";

import { prisma } from "@/lib/db";

// Date reviver for JSON.parse
function reviveDates(key: string, value: any) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
    return new Date(value);
  }
  return value;
}

export async function exportDatabase() {
  try {
    const keys = Object.keys(prisma);
    const models = keys.filter(key => {
      return (
        prisma[key as keyof typeof prisma] &&
        typeof (prisma[key as keyof typeof prisma] as any).findMany === 'function'
      );
    });

    const backup: Record<string, any[]> = {};
    for (const model of models) {
      const data = await (prisma[model as keyof typeof prisma] as any).findMany();
      backup[model] = data;
    }

    const jsonString = JSON.stringify(backup);
    const base64Content = Buffer.from(jsonString).toString("base64");

    return {
      success: true,
      filename: `sapo_ems_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      content: base64Content
    };
  } catch (error: any) {
    console.error("Export database error:", error);
    return {
      success: false,
      error: error.message || "Failed to export database"
    };
  }
}

export async function importDatabase(base64Content: string) {
  try {
    const jsonString = Buffer.from(base64Content, "base64").toString("utf-8");
    const parsedBackup = JSON.parse(jsonString, reviveDates);

    const keys = Object.keys(prisma);
    const models = keys.filter(key => {
      return (
        prisma[key as keyof typeof prisma] &&
        typeof (prisma[key as keyof typeof prisma] as any).findMany === 'function'
      );
    });

    // Disable foreign key checks
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;");

    try {
      // Truncate all tables
      for (const model of models) {
        await (prisma[model as keyof typeof prisma] as any).deleteMany({});
      }

      // Restore all tables
      for (const model of models) {
        const records = parsedBackup[model];
        if (records && records.length > 0) {
          await (prisma[model as keyof typeof prisma] as any).createMany({
            data: records
          });
        }
      }
    } finally {
      // Re-enable foreign key checks
      await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");
    }

    return { success: true };
  } catch (error: any) {
    console.error("Import database error:", error);
    return {
      success: false,
      error: error.message || "Failed to import database"
    };
  }
}
