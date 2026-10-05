import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  assertRunnerCollegeWrite,
  normalizeRunnerCollegeId,
  runnerCollegeLabel,
} from "@fusion-express/shared";
import { collectionName } from "@/lib/constants";
import { sendRunnerCollegeSetEmail } from "@/lib/email";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

const CONFIRMATION =
  "This is permanent. If you selected the wrong college, appeal at hello@gracerun.fit.";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Profile service unavailable." }, { status: 503 });
    }
    const body = (await request.json()) as { runnerCollege?: string };
    const ref = db.collection(collectionName("users")).doc(auth.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Create your account first." }, { status: 404 });
    }
    const data = snap.data() ?? {};
    if (data.campus === "cityu") {
      return NextResponse.json(
        { error: "CityU runners do not set a CUHK college." },
        { status: 400 },
      );
    }
    const locked = Boolean(data.runnerCollegeLockedAt) || Boolean(data.runnerCollege);
    const decision = assertRunnerCollegeWrite({
      currentCollege: typeof data.runnerCollege === "string" ? data.runnerCollege : null,
      locked,
      nextCollege: body.runnerCollege,
      viaAdminApproval: false,
    });
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: locked ? 409 : 400 });
    }
    const label = runnerCollegeLabel(decision.college);
    if (!locked) {
      await ref.update({
        runnerCollege: decision.college,
        runnerCollegeLockedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    let emailSent = false;
    const to = auth.email || (typeof data.email === "string" ? data.email : "");
    if (to && !locked) {
      try {
        await sendRunnerCollegeSetEmail(to, label);
        emailSent = true;
      } catch (err) {
        console.error("runner college email failed", err);
      }
    }
    return NextResponse.json({
      ok: true,
      runnerCollege: decision.college,
      label,
      locked: true,
      emailSent,
      confirmation: `Your college is set to ${label}. ${CONFIRMATION}`,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not save college.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Profile service unavailable." }, { status: 503 });
    }
    const snap = await db.collection(collectionName("users")).doc(auth.uid).get();
    const data = snap.data() ?? {};
    const college = normalizeRunnerCollegeId(
      typeof data.runnerCollege === "string" ? data.runnerCollege : null,
    );
    return NextResponse.json({
      runnerCollege: college,
      label: runnerCollegeLabel(college),
      locked: Boolean(data.runnerCollegeLockedAt) || Boolean(college),
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not load college." }, { status: 500 });
  }
}
