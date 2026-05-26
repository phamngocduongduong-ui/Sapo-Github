
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const contracts = await (prisma as any).laborcontract.findMany({
    where: { branch: "Hồ Chí Minh" }
  })
  console.log("HCM Contracts:", contracts)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
