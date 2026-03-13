import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
  ];

  const isAllowed = allowedOrigins.includes(origin);

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowed ? origin : "",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const response = NextResponse.next();
  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};