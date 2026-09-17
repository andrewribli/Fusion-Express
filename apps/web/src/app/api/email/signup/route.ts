import { NextResponse } from "next/server";
import { sendAdminNewUserNotice } from "@/lib/email";

export async function POST(request: Request) {
  let body: {
    fullName?: string;
    email?: string;
    isRunner?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await sendAdminNewUserNotice({
      fullName: body.fullName ?? "",
      email: body.email ?? "",
      collegeHall: "",
      isRunner: Boolean(body.isRunner),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin new-user notice failed after retry", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
