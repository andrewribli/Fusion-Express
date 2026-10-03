"use client";

import { useEffect, useState } from "react";
import { collectionName } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";

export type CustomerNotification = {
  id: string;
  type: string;
  userId: string;
  orderId: string;
  message: string;
  read: boolean;
  accent?: "gold" | "green" | "default" | string;
  href?: string;
  createdAt: Date;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate();
  }
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function useCustomerNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<CustomerNotification[]>(
    [],
  );

  useEffect(() => {
    if (!userId || !isFirebaseConfigured()) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(getDb(), collectionName("notifications")),
      where("userId", "==", userId),
      limit(40),
    );
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            type: String(data.type ?? ""),
            userId: String(data.userId ?? ""),
            orderId: String(data.orderId ?? ""),
            message: String(data.message ?? ""),
            read: Boolean(data.read),
            accent: data.accent ? String(data.accent) : undefined,
            href: data.href ? String(data.href) : undefined,
            createdAt: toDate(data.createdAt),
          };
        });
        rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setNotifications(rows.slice(0, 30));
      },
      (err) => {
        console.error("customer notifications subscribe failed", err);
        setNotifications([]);
      },
    );
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string): Promise<void> {
    if (!isFirebaseConfigured()) return;
    try {
      await updateDoc(doc(getDb(), collectionName("notifications"), id), {
        read: true,
      });
    } catch (err) {
      console.error("mark notification read failed", err);
    }
  }

  async function markAllRead(): Promise<void> {
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) => markRead(n.id)),
    );
  }

  return { notifications, unreadCount, markRead, markAllRead };
}
