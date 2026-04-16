import { NextResponse } from "next/server";
import { getMirroredEmails } from "@/lib/utils/dev-mailbox";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const messages = await getMirroredEmails();
  return NextResponse.json(messages, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
