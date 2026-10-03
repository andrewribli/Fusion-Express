import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { collectionName } from "@/lib/constants";
import {
  AdminAuthError,
  getAdminDb,
  requireAdminFromRequest,
} from "@/lib/firebase-admin";

function hongKongMonthRange(now = new Date()): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const start = new Date(Date.UTC(year, month - 1, 1, -8, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, -8, 0, 0));
  return { start, end };
}

export async function GET(request: Request) {
  try {
    await requireAdminFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Admin service unavailable." }, { status: 503 });
    }
    const { start, end } = hongKongMonthRange();
    const snap = await db
      .collection(collectionName("orders"))
      .where("platformDiscountFeeAt", ">=", Timestamp.fromDate(start))
      .where("platformDiscountFeeAt", "<", Timestamp.fromDate(end))
      .get();
    let total = 0;
    for (const doc of snap.docs) {
      if (String(doc.get("status") ?? "") === "cancelled") continue;
      const fee = Number(doc.get("platformDiscountFee") ?? 0);
      if (fee > 0) total += fee;
    }
    return NextResponse.json({
      total: Math.round(total * 100) / 100,
      label: `Discount fees earned this month: HK$${total.toFixed(0)}`,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not load discount fees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
