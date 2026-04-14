import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  void request;
  return NextResponse.json(
    { error: "Session token verification is unavailable after Firebase removal." },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  void request;
  return NextResponse.json(
    { error: "Session token verification is unavailable after Firebase removal." },
    { status: 410 }
  );
}
