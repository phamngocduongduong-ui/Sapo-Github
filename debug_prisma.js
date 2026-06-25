const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contracts = await prisma.contract.findMany({
    include: { contractitem: true }
  });
  const products = await prisma.product.findMany();
  const orders = await prisma.order.findMany({
    include: { orderitem: true }
  });

  const targetContractNumber = "SC26ISC03";
  const selectedContractObj = contracts.find(c => c.contractNumber === targetContractNumber);

  if (!selectedContractObj) {
    console.log("Contract not found:", targetContractNumber);
    return;
  }

  console.log("Simulating for Contract:", targetContractNumber);

  const associatedOrders = orders.filter(o => 
    o.status !== "Đã hủy" &&
    o.note && o.note.includes(`Hợp đồng: ${selectedContractObj.contractNumber}`)
  );

  console.log("Associated Orders found:", associatedOrders.map(o => o.orderCode));

  selectedContractObj.contractitem.forEach(contractItem => {
    let total = 0;
    
    const prod = contractItem.productCode 
      ? products.find(p => p.code === contractItem.productCode) 
      : null;
    
    const possibleNames = new Set();
    if (contractItem.productName) {
      possibleNames.add(contractItem.productName.trim().toLowerCase());
    }
    if (prod) {
      if (prod.name) possibleNames.add(prod.name.trim().toLowerCase());
      if (prod.englishName) possibleNames.add(prod.englishName.trim().toLowerCase());
    }

    console.log(`Contract Item: "${contractItem.productName}"`);
    console.log("  - Possible Names:", Array.from(possibleNames));

    associatedOrders.forEach(o => {
      const itemsList = o.orderitem || [];
      itemsList.forEach((item) => {
        const orderItemName = (item.productName || "").trim().toLowerCase();
        const matches = possibleNames.has(orderItemName);
        console.log(`    - Comparing with Order Item: "${orderItemName}" -> Match? ${matches} (Qty: ${item.quantity})`);
        if (matches) {
          total += item.quantity || 0;
        }
      });
    });

    console.log(`  => Total Ordered Qty: ${total}`);
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
