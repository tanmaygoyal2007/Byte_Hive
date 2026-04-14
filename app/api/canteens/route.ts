import { NextResponse } from "next/server";
import { CANTEENS } from "@/features/canteens/components/canteens";

export function GET() {
  return NextResponse.json(CANTEENS);
}
