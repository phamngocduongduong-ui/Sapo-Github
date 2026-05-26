import { getUnits } from "./actions";
import UnitTable from "./UnitTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UnitPage() {
  const units = await getUnits();

  return (
    <div style={{ width: "100%" }}>
      <UnitTable initialUnits={units as any} />
    </div>
  );
}
