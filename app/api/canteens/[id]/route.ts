import { NextRequest, NextResponse } from "next/server";
import { CANTEENS } from "@/features/canteens/components/canteens";

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const canteen = CANTEENS.find((entry) => entry.id === id);

    if (!canteen) {
      return NextResponse.json({ error: "Canteen not found." }, { status: 404 });
    }

    return NextResponse.json(canteen);
  });
}
