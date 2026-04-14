import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import vendorMasterKeys from "@/lib/config/vendor-master-keys.json";

type VendorMasterKeyRecord = {
  outletName: string;
  masterKey: string;
};

function secureEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const { outletName, masterKey } = await req.json();

    if (!outletName || !masterKey) {
      return NextResponse.json({ error: "Outlet and master key are required." }, { status: 400 });
    }

    const records = vendorMasterKeys as VendorMasterKeyRecord[];
    const matchedOutlet = records.find((record) => record.outletName === outletName);

    if (!matchedOutlet || !secureEquals(matchedOutlet.masterKey, String(masterKey).trim())) {
      return NextResponse.json({ error: "Invalid outlet or master key." }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      outletName: matchedOutlet.outletName,
    });
  } catch (error) {
    console.error("vendor auth error:", error);
    return NextResponse.json({ error: "Vendor authentication failed." }, { status: 500 });
  }
}
