import { firestoreEmployees } from "@/lib/firestore-employees";
import { NextResponse } from "next/server";

export async function GET() {
  const employees = await firestoreEmployees.getAll();
  return NextResponse.json(employees);
}
