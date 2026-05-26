import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PrintContractClient from "./PrintContractClient";

export const dynamic = "force-dynamic";

export default async function PrintContractPage({ params }: { params: { id: string } }) {
  const contract = await (prisma as any).contract.findUnique({
    where: { id: params.id },
    include: { contractitem: true },
  });

  if (!contract) {
    return notFound();
  }

  if (contract.status === "Đã hủy") {
    return (
      <div style={{ padding: "2rem", textAlign: "center", fontFamily: "Segoe UI, sans-serif" }}>
        <h2 style={{ color: "#ef4444" }}>Không thể in hợp đồng đã hủy</h2>
        <p>Hợp đồng này đã bị hủy bỏ và không được phép in ấn.</p>
      </div>
    );
  }

  // Fetch additional customer address or details using raw query to bypass cached Prisma client schema
  let customer: any = null;
  if (contract.buyer) {
    try {
      const results = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM customer WHERE name = ? LIMIT 1`,
        contract.buyer
      );
      if (results && results.length > 0) {
        customer = results[0];
      } else {
        const trimmedBuyer = contract.buyer.trim();
        const fallbackResults = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM customer WHERE name LIKE ? LIMIT 1`,
          `%${trimmedBuyer}%`
        );
        if (fallbackResults && fallbackResults.length > 0) {
          customer = fallbackResults[0];
        }
      }
    } catch (e) {
      customer = await prisma.customer.findFirst({
        where: { name: contract.buyer },
      });
    }
  }

  // Fetch seller details from customer table
  let sellerDetails: any = null;
  if (contract.seller) {
    try {
      const results = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM customer WHERE name = ? LIMIT 1`,
        contract.seller
      );
      if (results && results.length > 0) {
        sellerDetails = results[0];
      } else {
        const trimmedSeller = contract.seller.trim();
        const fallbackResults = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM customer WHERE name LIKE ? LIMIT 1`,
          `%${trimmedSeller}%`
        );
        if (fallbackResults && fallbackResults.length > 0) {
          sellerDetails = fallbackResults[0];
        }
      }
    } catch (e) {
      sellerDetails = await prisma.customer.findFirst({
        where: { name: contract.seller },
      });
    }
  }

  return (
    <PrintContractClient 
      contract={JSON.parse(JSON.stringify(contract))} 
      customer={JSON.parse(JSON.stringify(customer))} 
      sellerDetails={JSON.parse(JSON.stringify(sellerDetails))}
    />
  );
}
