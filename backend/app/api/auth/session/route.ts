import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyFirebaseIdToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const body = await request.json().catch(() => ({}));
    const idToken = body?.idToken || getBearerToken(authorization);

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing Firebase ID token." }, { status: 400 });
    }

    const user = await verifyFirebaseIdToken(idToken);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const idToken = getBearerToken(authorization);
    const user = await verifyFirebaseIdToken(idToken);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
