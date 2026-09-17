"use client";

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { collectionName, storagePath } from "@/lib/constants";
import { getDb, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";

export type PaymentSubmissionStatus = "pending" | "confirmed" | "rejected";

export type PaymentSubmission = {
  id: string;
  orderId: string;
  userId: string;
  screenshotUrl: string;
  note: string;
  status: PaymentSubmissionStatus;
  submittedAt: Date;
};

function col() {
  return collectionName("paymentSubmissions");
}

function parseStatus(value: unknown): PaymentSubmissionStatus {
  if (value === "confirmed" || value === "rejected") return value;
  return "pending";
}

function parse(id: string, data: Record<string, unknown>): PaymentSubmission {
  const ts = data.submittedAt;
  return {
    id,
    orderId: String(data.orderId ?? ""),
    userId: String(data.userId ?? ""),
    screenshotUrl: String(data.screenshotUrl ?? ""),
    note: String(data.note ?? ""),
    status: parseStatus(data.status),
    submittedAt:
      ts && typeof ts === "object" && "toDate" in ts
        ? (ts as Timestamp).toDate()
        : new Date(String(ts ?? Date.now())),
  };
}

export async function uploadPaymentScreenshot(
  userId: string,
  orderId: string,
  file: Blob,
  filename = "payme.jpg",
): Promise<string> {
  const name =
    "name" in file && typeof (file as { name?: string }).name === "string"
      ? (file as { name: string }).name
      : filename;
  if (!isFirebaseConfigured()) {
    return `mock://payment/${orderId}/${name}`;
  }
  const storageRef = ref(
    getFirebaseStorage(),
    storagePath(`payment-submissions/${userId}/${orderId}/${Date.now()}-${name}`),
  );
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function submitPaymentProof(opts: {
  orderId: string;
  userId: string;
  screenshotUrl: string;
  note?: string;
}): Promise<PaymentSubmission> {
  const now = new Date();
  const payload = {
    orderId: opts.orderId,
    userId: opts.userId,
    screenshotUrl: opts.screenshotUrl,
    note: (opts.note ?? "").trim().slice(0, 500),
    status: "pending" as const,
    submittedAt: Timestamp.fromDate(now),
  };
  if (!isFirebaseConfigured()) {
    return {
      id: crypto.randomUUID(),
      ...payload,
      submittedAt: now,
    };
  }
  const refDoc = await addDoc(collection(getDb(), col()), payload);
  return { id: refDoc.id, ...payload, submittedAt: now };
}

export async function fetchPaymentSubmissionForOrder(
  orderId: string,
  userId?: string,
): Promise<PaymentSubmission | null> {
  if (!isFirebaseConfigured()) return null;
  const constraints = userId
    ? [
        where("userId", "==", userId),
        where("orderId", "==", orderId),
        orderBy("submittedAt", "desc"),
        limit(1),
      ]
    : [
        where("orderId", "==", orderId),
        orderBy("submittedAt", "desc"),
        limit(1),
      ];
  const snap = await getDocs(query(collection(getDb(), col()), ...constraints));
  const first = snap.docs[0];
  return first ? parse(first.id, first.data() as Record<string, unknown>) : null;
}

export async function fetchPaymentSubmissions(): Promise<PaymentSubmission[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(collection(getDb(), col()), orderBy("submittedAt", "desc"), limit(100)),
  );
  return snap.docs.map((d) => parse(d.id, d.data() as Record<string, unknown>));
}

export async function updatePaymentSubmissionStatus(
  id: string,
  status: "confirmed" | "rejected",
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await updateDoc(doc(getDb(), col(), id), { status });
}
