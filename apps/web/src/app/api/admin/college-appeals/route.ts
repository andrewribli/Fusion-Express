import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  assertRunnerCollegeWrite,
  normalizeRunnerCollegeId,
  runnerCollegeLabel,
} from "@fusion-express/shared";
import { collectionName } from "@/lib/constants";
import { sendCollegeAppealDecisionEmail } from "@/lib/email";
import {
  AdminAuthError,
  getAdminDb,
  requireAdminFromRequest,
} from "@/lib/firebase-admin";

function submittedAtIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminFromRequest(request);
    void auth;
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Admin service unavailable." }, { status: 503 });
    }
    const snap = await db.collection(collectionName("users")).where("isRunner", "==", true).get();
    const appeals = snap.docs.flatMap((doc) => {
      const data = doc.data();
      if (data.campus === "cityu") return [];
      const appeal = data.runnerCollegeAppeal as
        | {
            requestedCollege?: string;
            reason?: string;
            submittedAt?: unknown;
            status?: string;
          }
        | undefined;
      if (!appeal || appeal.status !== "pending") return [];
      return [
        {
          uid: doc.id,
          name: typeof data.fullName === "string" ? data.fullName : "Runner",
          email: typeof data.email === "string" ? data.email : "",
          currentCollege: runnerCollegeLabel(
            typeof data.runnerCollege === "string" ? data.runnerCollege : null,
          ),
          requestedCollege: runnerCollegeLabel(appeal.requestedCollege),
          requestedCollegeId: normalizeRunnerCollegeId(appeal.requestedCollege),
          reason: typeof appeal.reason === "string" ? appeal.reason : "",
          submittedAt: submittedAtIso(appeal.submittedAt),
        },
      ];
    });
    appeals.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    return NextResponse.json({ appeals });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not load appeals.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminFromRequest(request);
    void auth;
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Admin service unavailable." }, { status: 503 });
    }
    const body = (await request.json()) as {
      uid?: string;
      action?: string;
    };
    const uid = body.uid?.trim() ?? "";
    const action = body.action === "approve" || body.action === "reject" ? body.action : null;
    if (!uid || !action) {
      return NextResponse.json({ error: "uid and action are required." }, { status: 400 });
    }
    const ref = db.collection(collectionName("users")).doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Runner not found." }, { status: 404 });
    }
    const data = snap.data() ?? {};
    const appeal = data.runnerCollegeAppeal as
      | { requestedCollege?: string; reason?: string; submittedAt?: unknown; status?: string }
      | undefined;
    if (!appeal || appeal.status !== "pending") {
      return NextResponse.json({ error: "No pending appeal." }, { status: 409 });
    }
    const current = normalizeRunnerCollegeId(
      typeof data.runnerCollege === "string" ? data.runnerCollege : null,
    );
    const requested = normalizeRunnerCollegeId(appeal.requestedCollege);
    if (action === "approve") {
      const decision = assertRunnerCollegeWrite({
        currentCollege: current,
        locked: true,
        nextCollege: requested,
        viaAdminApproval: true,
      });
      if (!decision.ok) {
        return NextResponse.json({ error: decision.error }, { status: 400 });
      }
      await ref.update({
        runnerCollege: decision.college,
        runnerCollegeLockedAt: FieldValue.serverTimestamp(),
        runnerCollegeAppeal: {
          requestedCollege: decision.college,
          reason: appeal.reason ?? "",
          submittedAt: appeal.submittedAt ?? new Date(),
          status: "approved",
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      const email = typeof data.email === "string" ? data.email : "";
      if (email) {
        void sendCollegeAppealDecisionEmail({
          to: email,
          approved: true,
          collegeLabel: runnerCollegeLabel(decision.college),
        }).catch((err) => console.error("appeal decision email failed", err));
      }
      await db.collection(collectionName("notifications")).add({
        type: "college_appeal",
        userId: uid,
        orderId: "",
        message: `Your college appeal was approved. Your college is now ${runnerCollegeLabel(decision.college)}.`,
        read: false,
        accent: "green",
        href: "/runner/profile",
        createdAt: new Date(),
      });
      return NextResponse.json({ ok: true, status: "approved" });
    }

    await ref.update({
      runnerCollegeAppeal: {
        requestedCollege: requested ?? appeal.requestedCollege ?? "",
        reason: appeal.reason ?? "",
        submittedAt: appeal.submittedAt ?? new Date(),
        status: "rejected",
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    const email = typeof data.email === "string" ? data.email : "";
    if (email) {
      void sendCollegeAppealDecisionEmail({
        to: email,
        approved: false,
        collegeLabel: runnerCollegeLabel(current),
      }).catch((err) => console.error("appeal decision email failed", err));
    }
    await db.collection(collectionName("notifications")).add({
      type: "college_appeal",
      userId: uid,
      orderId: "",
      message: `Your college appeal was not approved. Your college stays ${runnerCollegeLabel(current) || "the same"}.`,
      read: false,
      accent: "default",
      href: "/runner/profile",
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not update appeal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
