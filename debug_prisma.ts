import { prisma } from "./src/lib/db";

async function main() {
  const contracts = await prisma.contract.findMany({
    select: { status: true }
  });
  const statuses = Array.from(new Set(contracts.map(c => c.status)));
  console.log("Distinct contract statuses in database:", statuses);
  console.log("Contracts:", contracts);
}

main();
