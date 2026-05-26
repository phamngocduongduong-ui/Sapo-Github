import { getWarehouses } from "./actions";
import WarehouseTable from "./WarehouseTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WarehousePage() {
  const warehouses = await getWarehouses();

  return (
    <div style={{ width: "100%" }}>
      <WarehouseTable initialWarehouses={warehouses} />
    </div>
  );
}
