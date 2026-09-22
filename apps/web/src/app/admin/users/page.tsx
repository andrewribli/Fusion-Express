"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import type { UserProfile } from "@/context/UserContext";
import { AdminUserChatModal } from "@/components/AdminUserChatModal";
import { fetchUnreadReplyCounts } from "@/lib/direct-messages";
import { getAuthClient } from "@/lib/firebase";
import { fetchAllUsers } from "@/lib/users";

function cell(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [chatUser, setChatUser] = useState<UserProfile | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [repairingUid, setRepairingUid] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchAllUsers();
        if (!cancelled) setUsers(rows);
        try {
          const counts = await fetchUnreadReplyCounts();
          if (!cancelled) setUnread(counts);
        } catch {
          // Chat badges are optional if indexes are still building.
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load users.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchUnreadReplyCounts().then(setUnread).catch(() => undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleRepair(user: UserProfile) {
    if (!user.uid) return;
    const label = user.username || user.email || user.uid;
    setRepairingUid(user.uid);
    setActionMsg("");
    setError("");
    try {
      const token = await getAuthClient().currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in again as an admin.");
      const res = await fetch("/api/admin/users/repair-auth-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      });
      let data: {
        error?: string;
        email?: string;
        previousAuthEmail?: string;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error(
          res.status === 500
            ? "Server failed to load admin Auth (try again). If it keeps failing, redeploy."
            : `Could not repair account (HTTP ${res.status}).`,
        );
      }
      if (!res.ok) throw new Error(data.error ?? "Could not repair account");
      setActionMsg(
        data.previousAuthEmail && data.previousAuthEmail !== data.email
          ? `Repaired ${label}: Auth email ${data.previousAuthEmail} → ${data.email}. They can use Forgot password now.`
          : `Repaired ${label}: Auth email is ${data.email}. They can use Forgot password now.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not repair account.");
    } finally {
      setRepairingUid(null);
    }
  }

  async function handleDelete(user: UserProfile) {
    if (!user.uid) return;
    const label = user.username || user.email || user.uid;
    const ok = window.confirm(
      `Delete account “${label}”?\n\nThis removes Auth, the users profile, and username maps. Cannot be undone.`,
    );
    if (!ok) return;

    setDeletingUid(user.uid);
    setActionMsg("");
    setError("");
    try {
      const token = await getAuthClient().currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in again as an admin.");
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid, username: user.username }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete account");
      setActionMsg(`Deleted ${label}.`);
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account.");
    } finally {
      setDeletingUid(null);
    }
  }

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/" title="Users" />

          <main className="mx-auto max-w-7xl px-4 py-6">
            <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
              <h1 className="text-xl font-bold text-gray-900">Users</h1>
              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "Loading…"
                  : `${users.length} account${users.length === 1 ? "" : "s"}, sorted by name`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/admin/messaging"
                  className="inline-flex min-h-11 items-center rounded-xl bg-[#ED1C24] px-4 py-2.5 text-sm font-bold text-white"
                >
                  Send email
                </Link>
                <Link href="/admin/payouts" className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800">
                  Runner payouts
                </Link>
              </div>
              <p className="mt-3 text-sm">
                <Link href="/admin/refunds" className="font-medium text-[#ED1C24] underline">
                  Pending Fusion price refunds
                </Link>
                {" · "}
                <Link href="/admin/feedback" className="font-medium text-[#ED1C24] underline">
                  Feedback
                </Link>
                {" · "}
                <Link href="/admin/support" className="font-medium text-[#ED1C24] underline">
                  Support chat
                </Link>
                {" · "}
                <Link href="/admin/payments" className="font-medium text-[#ED1C24] underline">
                  Payment submissions
                </Link>
                {" · "}
                <Link href="/admin/warnings" className="font-medium text-[#ED1C24] underline">
                  Warnings
                </Link>
              </p>

              {actionMsg && (
                <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                  {actionMsg}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              {!loading && users.length === 0 && !error && (
                <p className="mt-4 text-sm text-gray-600">No accounts found.</p>
              )}

              {!loading && users.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="whitespace-nowrap py-2 pr-4">Full name</th>
                        <th className="whitespace-nowrap py-2 pr-4">Email</th>
                        <th className="whitespace-nowrap py-2 pr-4">Phone</th>
                        <th className="whitespace-nowrap py-2 pr-4">Is runner</th>
                        <th className="whitespace-nowrap py-2 pr-4">Guest</th>
                        <th className="whitespace-nowrap py-2 pr-4">Message</th>
                        <th className="whitespace-nowrap py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.uid ?? u.email ?? u.fullName}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="whitespace-nowrap py-2.5 pr-4 font-medium text-gray-900">
                            {cell(u.fullName)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {cell(u.email)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {cell(u.phone)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {u.isRunner ? "Yes" : "No"}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {u.isGuest ? "Yes" : "No"}
                          </td>
                          <td className="whitespace-nowrap py-2.5">
                            <button
                              type="button"
                              onClick={() => setChatUser(u)}
                              disabled={!u.uid}
                              className="relative rounded-lg bg-[#ED1C24] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                            >
                              Message
                              {u.uid && (unread[u.uid] ?? 0) > 0 ? (
                                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-gray-900">
                                  {unread[u.uid]}
                                </span>
                              ) : null}
                            </button>
                          </td>
                          <td className="whitespace-nowrap py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={!u.uid || repairingUid === u.uid}
                                onClick={() => void handleRepair(u)}
                                className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                              >
                                {repairingUid === u.uid ? "Fixing…" : "Fix login"}
                              </button>
                              <button
                                type="button"
                                disabled={!u.uid || deletingUid === u.uid}
                                onClick={() => void handleDelete(u)}
                                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingUid === u.uid ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
      {chatUser && (
        <AdminUserChatModal
          target={chatUser}
          onClose={() => {
            setChatUser(null);
            void fetchUnreadReplyCounts().then(setUnread).catch(() => undefined);
          }}
        />
      )}
    </RequireAdmin>
  );
}
