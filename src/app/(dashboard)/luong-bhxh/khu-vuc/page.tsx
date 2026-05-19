import React from "react";
import AreaTable from "./AreaTable";
import { getCheckInAreas } from "./actions";

export default async function AreaPage() {
  const areas = await getCheckInAreas();
  
  return (
    <div className="p-6">
      <AreaTable initialData={areas} />
    </div>
  );
}
