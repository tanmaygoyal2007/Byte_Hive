import { NextRequest, NextResponse } from "next/server";
import { getAllMenuItems } from "@/features/orders/services/order-portal.service";

export function GET(request: NextRequest) {
  const canteenId = request.nextUrl.searchParams.get("canteenId");
  const items = getAllMenuItems();

  return NextResponse.json(
    canteenId ? items.filter((item) => item.canteenId === canteenId) : items
  );
}
