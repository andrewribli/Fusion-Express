import { NextResponse } from "next/server";
import { resolveCampus } from "@fusion-express/shared/campus";
import { collectionName } from "@/lib/constants";
import { adminAccessToken } from "@/lib/firestore-rest";

export type PendingQueueItem = {
  id: string;
  college: string;
  hall: string;
};

type QueryField = {
  stringValue?: string;
  timestampValue?: string;
};

function fieldString(
  fields: Record<string, QueryField> | undefined,
  key: string,
): string {
  return String(fields?.[key]?.stringValue ?? "").trim();
}

function fieldTimestamp(
  fields: Record<string, QueryField> | undefined,
  key: string,
): string {
  return String(fields?.[key]?.timestampValue ?? "").trim();
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
    const pageSize = 200;
    const orders: PendingQueueItem[] = [];
    const seen = new Set<string>();
    let startAfterCreatedAt: string | undefined;

    for (let page = 0; page < 30; page++) {
      const structuredQuery: Record<string, unknown> = {
        from: [{ collectionId: col }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "pending" },
          },
        },
        orderBy: [
          {
            field: { fieldPath: "createdAt" },
            direction: "DESCENDING",
          },
        ],
        limit: pageSize,
      };
      if (startAfterCreatedAt) {
        structuredQuery.startAt = {
          values: [{ timestampValue: startAfterCreatedAt }],
          before: false,
        };
      }

      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${ctx.project}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ctx.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ structuredQuery }),
        },
      );

      if (!res.ok) {
        console.error(
          "[pending-count] runQuery failed",
          res.status,
          (await res.text()).slice(0, 400),
        );
        break;
      }

      const rows = (await res.json()) as {
        document?: {
          name?: string;
          fields?: Record<string, QueryField>;
        };
      }[];

      let pageCount = 0;
      let lastCreatedAt = "";
      for (const row of rows) {
        const fields = row.document?.fields;
        if (!fields) continue;
        pageCount += 1;
        const createdAt = fieldTimestamp(fields, "createdAt");
        if (createdAt) lastCreatedAt = createdAt;
        const runnerId = fieldString(fields, "runnerId");
        const runnerUid = fieldString(fields, "runnerUid");
        if (runnerId || runnerUid) continue;
        if (resolveCampus(fieldString(fields, "campus")) !== campus) continue;
        const name = row.document?.name ?? "";
        const id = name.split("/").pop()?.trim() || fieldString(fields, "id");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        orders.push({
          id,
          college: fieldString(fields, "college") || fieldString(fields, "compound"),
          hall: fieldString(fields, "hall"),
        });
      }

      if (pageCount < pageSize || !lastCreatedAt || lastCreatedAt === startAfterCreatedAt) {
        break;
      }
      startAfterCreatedAt = lastCreatedAt;
    }

    return NextResponse.json({ count: orders.length, orders });
  } catch (err) {
    console.error("[pending-count] failed", err);
    return NextResponse.json({ count: 0, orders: [] as PendingQueueItem[] });
  }
}
