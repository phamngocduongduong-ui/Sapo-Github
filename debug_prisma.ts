import { prisma } from "./src/lib/db";

async function main() {
  console.log("Prisma models:", Object.keys(prisma).filter(k => !k.startsWith("_")));
}

main();
