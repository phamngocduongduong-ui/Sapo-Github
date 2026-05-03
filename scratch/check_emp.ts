
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { fullName: "Trần Văn Thương" }
  })
  console.log("Employee:", emp)
  
  const contracts = await prisma.laborContract.findMany({
    where: { employeeName: "Trần Văn Thương" }
  })
  console.log("Contracts:", contracts)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
