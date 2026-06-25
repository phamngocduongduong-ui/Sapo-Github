"use server";

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Parse DATABASE_URL
// Connection string pattern: mysql://<username>:<password>@<host>:<port>/<database>
function parseDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured in the environment");
  }

  const match = url.match(/mysql:\/\/([^:]+)(?::([^@]*))?@([^:]+)(?::(\d+))?\/([^?]+)/);
  if (!match) {
    throw new Error("Invalid DATABASE_URL format");
  }

  const [_, username, password = "", host, port = "3306", database] = match;
  return { username, password, host, port, database };
}

export async function exportDatabase() {
  try {
    const { username, password, host, port, database } = parseDatabaseUrl();
    const tempFile = path.join(os.tmpdir(), `backup_${Date.now()}.sql`);

    // Build the mysqldump command
    // Use quotes around password to avoid shell expansion issues
    let cmd = `mysqldump -u ${username} -h ${host} -P ${port}`;
    if (password) {
      cmd += ` -p"${password}"`;
    }
    cmd += ` ${database} > "${tempFile}"`;

    await execAsync(cmd);

    // Read file and convert to base64
    const content = await fs.promises.readFile(tempFile, "base64");

    // Clean up temporary file
    await fs.promises.unlink(tempFile);

    return {
      success: true,
      filename: `${database}_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`,
      content
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
    const { username, password, host, port, database } = parseDatabaseUrl();
    const tempFile = path.join(os.tmpdir(), `restore_${Date.now()}.sql`);

    // Write base64 back to sql file
    const buffer = Buffer.from(base64Content, "base64");
    await fs.promises.writeFile(tempFile, buffer);

    // Build the mysql command
    let cmd = `mysql -u ${username} -h ${host} -P ${port}`;
    if (password) {
      cmd += ` -p"${password}"`;
    }
    cmd += ` ${database} < "${tempFile}"`;

    await execAsync(cmd);

    // Clean up temporary file
    await fs.promises.unlink(tempFile);

    return { success: true };
  } catch (error: any) {
    console.error("Import database error:", error);
    return {
      success: false,
      error: error.message || "Failed to import database"
    };
  }
}
