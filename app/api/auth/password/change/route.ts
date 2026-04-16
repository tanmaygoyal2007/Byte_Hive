import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "@/features/auth/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!email || !oldPassword || !newPassword) {
      return NextResponse.json({ error: "Email, old password, and new password are required." }, { status: 400 });
    }

    await changePassword({ email, oldPassword, newPassword });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to change password.";

    if (message === "auth/user-not-found") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (message === "auth/wrong-password") {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    if (message === "auth/password-same") {
      return NextResponse.json({ error: "New password cannot be the same as current password." }, { status: 400 });
    }
    if (message === "auth/weak-password") {
      return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
