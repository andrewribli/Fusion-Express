"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import type { UserProfile } from "@/context/UserContext";
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
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchAllUsers();
      setUsers(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

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
              <p className="mt-2 text-sm">
                <Link href="/admin/payouts" className="font-medium text-[#ED1C24] underline">
                  Runner payouts
                </Link>
                {" · "}
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
                        <th className="whitespace-nowrap py-2 pr-4">Username</th>
                        <th className="whitespace-nowrap py-2 pr-4">Email</th>
                        <th className="whitespace-nowrap py-2 pr-4">College / hall</th>
                        <th className="whitespace-nowrap py-2 pr-4">Room number</th>
                        <th className="whitespace-nowrap py-2 pr-4">Is runner</th>
                        <th className="whitespace-nowrap py-2 pr-4">CUHK verified</th>
                        <th className="whitespace-nowrap py-2 pr-4">Phone</th>
                        <th className="whitespace-nowrap py-2 pr-4">Student ID</th>
                        <th className="whitespace-nowrap py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.uid ?? u.username ?? u.studentId}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="whitespace-nowrap py-2.5 pr-4 font-medium text-gray-900">
                            {cell(u.fullName)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {cell(u.username)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {cell(u.email)}
                          </td>
                          <td className="py-2.5 pr-4 text-gray-700">
                            {cell(formatDeliveryAddress(u.college, u.hall))}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {cell(u.roomNumber)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {u.isRunner ? "Yes" : "No"}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {u.cuhkVerifiedAt ? "Yes" : "No"}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {cell(u.phone)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                            {cell(u.studentId)}
                          </td>
                          <td className="whitespace-nowrap py-2.5">
                            <button
                              type="button"
                              disabled={!u.uid || deletingUid === u.uid}
                              onClick={() => void handleDelete(u)}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingUid === u.uid ? "Deleting…" : "Delete"}
                            </button>
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
    </RequireAdmin>
  );
}
