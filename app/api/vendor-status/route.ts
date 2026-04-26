import { NextRequest, NextResponse } from "next/server";
import { getStoredVendorStatuses, replaceStoredVendorStatuses } from "@/lib/server/vendor-status-store";

export async function GET() {
  const statuses = await getStoredVendorStatuses();
  return NextResponse.json(statuses, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload.statuses !== "object" || Array.isArray(payload.statuses)) {
      return NextResponse.json({ error: "Invalid vendor status snapshot." }, { status: 400 });
    }

    const statuses = await replaceStoredVendorStatuses(payload.statuses);
    return NextResponse.json(statuses);
  } catch {
    return NextResponse.json({ error: "Unable to save vendor statuses." }, { status: 500 });
  }
}
