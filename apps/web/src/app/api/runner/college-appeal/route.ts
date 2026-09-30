import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  appealReasonOk,
  normalizeRunnerCollegeId,
  runnerCollegeLabel,
} from "@fusion-express/shared";
import { collectionName } from "@/lib/constants";
import { sendCollegeAppealInboxEmail } from "@/lib/email";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Profile service unavailable." }, { status: 503 });
    }
    const body = (await request.json()) as {
      requestedCollege?: string;
      reason?: string;
    };
    const requested = normalizeRunnerCollegeId(body.requestedCollege);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!requested) {
      return NextResponse.json({ error: "Choose a college." }, { status: 400 });
    }
    if (!appealReasonOk(reason)) {
      return NextResponse.json(
        { error: "Tell us why in at least 20 characters." },
        { status: 400 },
      );
    }
    const ref = db.collection(collectionName("users")).doc(auth.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Create your account first." }, { status: 404 });
    }
    const data = snap.data() ?? {};
    if (data.campus === "cityu") {
      return NextResponse.json(
        { error: "CityU runners do not have a CUHK college appeal." },
        { status: 400 },
      );
    }
    if (data.isRunner !== true) {
      return NextResponse.json({ error: "Only runners can appeal a college." }, { status: 403 });
    }
    const current = normalizeRunnerCollegeId(
      typeof data.runnerCollege === "string" ? data.runnerCollege : null,
    );
    if (!current) {
      return NextResponse.json(
        { error: "Set your college before appealing a change." },
        { status: 400 },
      );
    }
    if (current === requested) {
      return NextResponse.json(
        { error: "That is already your college." },
        { status: 400 },
      );
    }
    const existing = data.runnerCollegeAppeal as { status?: string } | undefined;
    if (existing?.status === "pending") {
      return NextResponse.json(
        { error: "You already have an appeal in review." },
        { status: 409 },
      );
    }
    const submittedAt = new Date();
    await ref.update({
      runnerCollegeAppeal: {
        requestedCollege: requested,
        reason,
        submittedAt,
        status: "pending",
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    let emailSent = false;
    const runnerEmail = auth.email || (typeof data.email === "string" ? data.email : "");
    if (runnerEmail) {
      try {
        await sendCollegeAppealInboxEmail({
          runnerName: typeof data.fullName === "string" ? data.fullName : "Runner",
          runnerEmail,
          currentCollege: runnerCollegeLabel(current),
          requestedCollege: runnerCollegeLabel(requested),
          reason,
        });
        emailSent = true;
      } catch (err) {
        console.error("college appeal email failed", err);
      }
    }

    return NextResponse.json({
      ok: true,
      emailSent,
      message: "Appeal submitted. We'll review within 3 business days.",
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not submit appeal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
