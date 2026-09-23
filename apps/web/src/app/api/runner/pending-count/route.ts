import { NextResponse } from "next/server";
import { resolveCampus } from "@fusion-express/shared/campus";
import { collectionName } from "@/lib/constants";
import { adminAccessToken } from "@/lib/firestore-rest";

export type PendingQueueItem = {
  id: string;
  college: string;
  hall: string;
};

function fieldString(
  fields: Record<string, { stringValue?: string }> | undefined,
  key: string,
): string {
  return String(fields?.[key]?.stringValue ?? "").trim();
}

/**
 * Pending-queue count + summaries for the header bell dropdown.
 * Uses Firestore REST (not firebase-admin) to avoid the jose ESM crash on Vercel.
 * Public so customers can see available deliveries without runner list rules.
 */
export async function GET(request: Request) {
  const campus = resolveCampus(new URL(request.url).searchParams.get("campus"));
  try {
    const ctx = await adminAccessToken();
    if (!ctx) {
      return NextResponse.json({ count: 0, orders: [] as PendingQueueItem[] });
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
            limit: 40,
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
      return NextResponse.json({ count: 0, orders: [] as PendingQueueItem[] });
    }

    const rows = (await res.json()) as {
      document?: {
        name?: string;
        fields?: Record<
          string,
          { stringValue?: string }
        >;
      };
    }[];

    const orders: PendingQueueItem[] = [];
    for (const row of rows) {
      const fields = row.document?.fields;
      if (!fields) continue;
      const runnerId = fieldString(fields, "runnerId");
      const runnerUid = fieldString(fields, "runnerUid");
      if (runnerId || runnerUid) continue;
      if (resolveCampus(fieldString(fields, "campus")) !== campus) continue;
      const name = row.document?.name ?? "";
      const id = name.split("/").pop()?.trim() || fieldString(fields, "id");
      if (!id) continue;
      orders.push({
        id,
        college: fieldString(fields, "college"),
        hall: fieldString(fields, "hall"),
      });
    }

    return NextResponse.json({ count: orders.length, orders });
  } catch (err) {
    console.error("[pending-count] failed", err);
    return NextResponse.json({ count: 0, orders: [] as PendingQueueItem[] });
  }
}
