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
import { fetchExpiredDeliveryCounts } from "@/lib/expired-delivery-counts";
import { fetchDirectoryUsers } from "@/lib/users";
import {
  applyAuthContacts,
  directoryEmailLabel,
  directoryNameLabel,
  filterDemoDirectoryUsers,
  isIncompleteDirectoryProfile,
  MISSING_DIRECTORY_EMAIL,
  MISSING_DIRECTORY_NAME,
  sortUsersByName,
  type AuthDirectoryContact,
} from "@/lib/user-directory";
import { PartyAvatar } from "@/components/DeliveryIdentity";

function DiscountFeesLine() {
  const [label, setLabel] = useState("Discount fees earned this month: HK$0");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getAuthClient().currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/admin/discount-fees", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as { label?: string; total?: number };
        if (!res.ok || cancelled) return;
        setLabel(
          data.label ??
            `Discount fees earned this month: HK$${Number(data.total ?? 0).toFixed(0)}`,
        );
      } catch {
        // The month total stays at zero when the query is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <p className="mt-3 text-sm font-semibold text-gray-900">{label}</p>;
}

function cell(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

type DirectoryCampus = "cuhk" | "cityu";

async function fillBlankAuthContacts(rows: UserProfile[]): Promise<UserProfile[]> {
  const missing = rows
    .filter((user) => user.uid && isIncompleteDirectoryProfile(user))
    .map((user) => user.uid as string);
  if (missing.length === 0) return rows;
  const token = await getAuthClient().currentUser?.getIdToken();
  if (!token) return rows;
  const res = await fetch("/api/admin/users/directory-auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uids: missing }),
  });
  if (!res.ok) return rows;
  const data = (await res.json()) as {
    contacts?: Record<string, AuthDirectoryContact>;
  };
  return sortUsersByName(applyAuthContacts(rows, data.contacts ?? {}));
}

async function loadDirectory(campus: DirectoryCampus): Promise<UserProfile[]> {
  if (campus === "cuhk") {
    const { users } = await fetchDirectoryUsers("cuhk");
    try {
      return await fillBlankAuthContacts(users);
    } catch {
      return users;
    }
  }
  const token = await getAuthClient().currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again as an admin.");
  const res = await fetch("/api/admin/cityu/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as {
    error?: string;
    users?: UserProfile[];
  };
  if (!res.ok) throw new Error(data.error ?? "Could not load CityU users.");
  return data.users ?? [];
}

export function AdminUsersDirectory({ campus }: { campus: DirectoryCampus }) {
  const cityu = campus === "cityu";
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [chatUser, setChatUser] = useState<UserProfile | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [repairingUid, setRepairingUid] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [expiredCounts, setExpiredCounts] = useState<Record<string, number>>({});
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await loadDirectory(campus);
        if (!cancelled) setUsers(rows);
        try {
          const counts = await fetchUnreadReplyCounts();
          if (!cancelled) setUnread(counts);
        } catch {
          // Chat badges are optional if indexes are still building.
        }
        try {
          const expired = await fetchExpiredDeliveryCounts();
          if (!cancelled) setExpiredCounts(expired);
        } catch {
          // Expired counts are optional if the field index is still building.
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
  }, [campus]);

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

  const visibleUsers = filterDemoDirectoryUsers(users, showDemo);
  const incompleteCount = visibleUsers.filter(isIncompleteDirectoryProfile).length;

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader
            showBack
            backHref={cityu ? "/cityu" : "/"}
            title={cityu ? "CityU users" : "Users"}
          />

          <main className="mx-auto max-w-7xl px-4 py-6">
            <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
              <h1 className="text-xl font-bold text-gray-900">
                {cityu ? "CityU users" : "Users"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "Loading…"
                  : `${visibleUsers.length} account${visibleUsers.length === 1 ? "" : "s"}, sorted by name`}
              </p>
              <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showDemo}
                  onChange={(e) => setShowDemo(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Show demo
              </label>
              {cityu ? (
                <p className="mt-2 text-sm text-gray-600">
                  Same users collection as CUHK, filtered to CityU emails.
                  Opening this page copies Auth signups into Firestore so names
                  and emails show here.
                </p>
              ) : null}
              {!loading && incompleteCount > 0 ? (
                <p className="mt-2 text-xs text-gray-600">
                  {incompleteCount} account{incompleteCount === 1 ? " is" : "s are"}{" "}
                  missing a name or email
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {cityu ? (
                  <Link
                    href="/admin/users"
                    className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800"
                  >
                    CUHK users
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/cityu/admin/users"
                      className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800"
                    >
                      CityU users
                    </Link>
                    <Link
                      href="/admin/messaging"
                      className="inline-flex min-h-11 items-center rounded-xl bg-[#ED1C24] px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Send email
                    </Link>
                    <Link
                      href="/admin/payouts"
                      className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800"
                    >
                      Runner payouts
                    </Link>
                  </>
                )}
              </div>
              {cityu ? null : (
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
                  {" · "}
                  <Link href="/admin/appeals" className="font-medium text-[#ED1C24] underline">
                    College appeals
                  </Link>
                </p>
              )}
              {cityu ? null : <DiscountFeesLine />}

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

              {!loading && visibleUsers.length === 0 && !error && (
                <p className="mt-4 text-sm text-gray-600">No accounts found.</p>
              )}

              {!loading && visibleUsers.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="whitespace-nowrap py-2 pr-4">Photo</th>
                        <th className="whitespace-nowrap py-2 pr-4">Full name</th>
                        <th className="whitespace-nowrap py-2 pr-4">Email</th>
                        <th className="whitespace-nowrap py-2 pr-4">Phone</th>
                        <th className="whitespace-nowrap py-2 pr-4">Is runner</th>
                        <th className="whitespace-nowrap py-2 pr-4">Expired deliveries</th>
                        <th className="whitespace-nowrap py-2 pr-4">Guest</th>
                        <th className="whitespace-nowrap py-2 pr-4">Message</th>
                        <th className="whitespace-nowrap py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.map((u) => {
                        const nameLabel = directoryNameLabel(u);
                        const emailLabel = directoryEmailLabel(u);
                        return (
                        <tr
                          key={u.uid ?? u.email ?? nameLabel}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="py-2.5 pr-4">
                            <PartyAvatar
                              name={nameLabel}
                              photoUrl={u.photoUrl || u.photoURL}
                            />
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 font-medium text-gray-900">
                            <span
                              className={`block max-w-[390px] truncate ${
                                nameLabel === MISSING_DIRECTORY_NAME
                                  ? "font-normal text-gray-500"
                                  : ""
                              }`}
                            >
                              {nameLabel}
                            </span>
                            {u.isAnonymous && u.pseudonym ? (
                              <span className="block max-w-[390px] truncate text-xs font-normal text-gray-500">
                                Partner sees {u.pseudonym}
                              </span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            <span
                              className={
                                emailLabel === MISSING_DIRECTORY_EMAIL
                                  ? "text-gray-500"
                                  : undefined
                              }
                            >
                              {emailLabel}
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {cell(u.phone)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {u.isRunner ? "Yes" : "No"}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {u.uid ? (expiredCounts[u.uid] ?? 0) : 0}
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
                        );
                      })}
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
