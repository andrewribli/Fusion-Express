import { NextResponse } from "next/server";
import { collectionName } from "@/lib/constants";
import { adminAccessToken } from "@/lib/firestore-rest";

/**
 * Pending-queue count for the header bell.
 * Uses Firestore REST (not firebase-admin) to avoid the jose ESM crash on Vercel.
 * Public so customers can see available deliveries without runner list rules.
 */
export async function GET() {
  try {
    const ctx = await adminAccessToken();
    if (!ctx) {
      return NextResponse.json({ count: 0 });
    }

    const col = collectionName("orders");
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${ctx.project}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: col }],
            where: {
              fieldFilter: {
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "pending" },
              },
            },
            limit: 100,
          },
        }),
      },
    );

    if (!res.ok) {
      console.error(
        "[pending-count] runQuery failed",
        res.status,
        (await res.text()).slice(0, 400),
      );
      return NextResponse.json({ count: 0 });
    }

    const rows = (await res.json()) as {
      document?: {
        fields?: {
          runnerId?: { stringValue?: string };
          runnerUid?: { stringValue?: string };
        };
      };
    }[];

    const count = rows.filter((row) => {
      const fields = row.document?.fields;
      if (!fields) return false;
      const runnerId = fields.runnerId?.stringValue?.trim();
      const runnerUid = fields.runnerUid?.stringValue?.trim();
      return !runnerId && !runnerUid;
    }).length;

    return NextResponse.json({ count });
  } catch (err) {
    console.error("[pending-count] failed", err);
    return NextResponse.json({ count: 0 });
  }
}
