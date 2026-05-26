import React from "react";
import AreaTable from "./AreaTable";
import { getCheckInAreas } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AreaPage() {
  const areas = await getCheckInAreas();
  
  return (
    <AreaTable initialData={areas} />
  );
}
