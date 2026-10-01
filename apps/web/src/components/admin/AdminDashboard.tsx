"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { AdminUserChatModal } from "@/components/AdminUserChatModal";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import type { UserProfile } from "@/context/UserContext";
import {
  countActionExtras,
  fetchAdminDashboardStats,
  fetchAdminUsers,
  filterAndSortUsers,
  runnerMissingPayout,
  userCampus,
  userMissingInfo,
  type AdminDashboardStats,
  type AdminListFilter,
  type AdminSort,
} from "@/lib/admin-dashboard";
import { fetchUnreadReplyCounts } from "@/lib/direct-messages";
import { getAuthClient } from "@/lib/firebase";
import { normalizeRole, roleLabel, type UserRole } from "@/lib/roles";
import { updateUserProfileDoc } from "@/lib/users";

const PAGE_SIZE = 25;

type MetricKey =
  | "pending_payouts"
  | "orders_today"
  | "active_runners"
  | "new_users"
  | "revenue"
  | "discount_fees";

function formatHkd(n: number): string {
  return `HK$${n.toLocaleString("en-HK", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initials(name?: string, email?: string): string {
  const n = (name ?? "").trim();
  if (n && n !== "Guest") {
    const parts = n.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function emailDisplay(email?: string): ReactNode {
  const e = email?.trim();
  if (!e) return <span className="text-gray-400">—</span>;
  if (e.length > 40) {
    return (
      <span className="break-all text-gray-700" title={e}>
        {e.slice(0, 37)}…
      </span>
    );
  }
  return <span className="break-all text-gray-700">{e}</span>;
}

function CampusBadge({ campus }: { campus: "cuhk" | "cityu" | null }) {
  if (!campus) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
        —
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
        campus === "cuhk"
          ? "bg-purple-50 text-purple-800"
          : "bg-sky-50 text-sky-800"
      }`}
    >
      {campus === "cuhk" ? "CUHK" : "CityU"}
    </span>
  );
}

function RoleBadge({ user }: { user: UserProfile }) {
  const role = normalizeRole(user.role, Boolean(user.isRunner));
  return (
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
      {roleLabel(role)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  href,
  active,
  onClick,
}: {
  label: string;
  value: string;
  href: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left shadow-sm transition ${
        active
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-100 bg-white hover:border-gray-200"
      }`}
    >
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
        {value}
      </p>
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 inline-block text-[11px] font-semibold text-gray-600 hover:text-gray-900"
      >
        View →
      </Link>
    </button>
  );
}

function UserActionsMenu({
  user,
  unread,
  onMessage,
  onWarn,
  onEditRole,
  onRepair,
  onDelete,
  busy,
}: {
  user: UserProfile;
  unread: number;
  onMessage: () => void;
  onWarn: () => void;
  onEditRole: () => void;
  onRepair: () => void;
  onDelete: () => void;
  busy?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        aria-label="User actions"
      >
        ⋯
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-gray-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onMessage();
              }}
            >
              Send message
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onWarn();
              }}
            >
              Send warning
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onEditRole();
              }}
            >
              Edit role
            </button>
            <button
              type="button"
              disabled={!user.uid || busy === "repair"}
              className="block w-full px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
              onClick={() => {
                setOpen(false);
                onRepair();
              }}
            >
              {busy === "repair" ? "Fixing login…" : "Fix login"}
            </button>
            <button
              type="button"
              disabled={!user.uid || busy === "delete"}
              className="block w-full px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              {busy === "delete" ? "Deleting…" : "Delete account"}
            </button>
            <Link
              href={`/admin/users?uid=${encodeURIComponent(user.uid ?? "")}`}
              className="block px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              View profile
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminListFilter>("all");
  const [sort, setSort] = useState<AdminSort>("newest");
  const [showDemo, setShowDemo] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [chatUser, setChatUser] = useState<UserProfile | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<string>("");

  const reload = useCallback(async () => {
    setError("");
    const [nextStats, nextUsers] = await Promise.all([
      fetchAdminDashboardStats(),
      fetchAdminUsers(),
    ]);
    const extras = countActionExtras(nextUsers);
    setStats({ ...nextStats, ...extras });
    setUsers(nextUsers);
    try {
      setUnread(await fetchUnreadReplyCounts());
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load admin home.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchUnreadReplyCounts().then(setUnread).catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filter, sort, showDemo]);

  const filtered = useMemo(
    () => filterAndSortUsers(users, { search, filter, sort, showDemo }),
    [users, search, filter, sort, showDemo],
  );

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const totalFiltered = filtered.length;

  const urgent = useMemo(() => {
    if (!stats) return [];
    const items: { key: AdminListFilter; label: string; count: number; tone: "red" | "yellow"; href?: string }[] = [];
    if (stats.pendingPayoutCount > 0) {
      items.push({
        key: "pending_payouts",
        label: "Pending runner reimbursements",
        count: stats.pendingPayoutCount,
        tone: "red",
        href: "/admin/payouts",
      });
    }
    if (stats.noPayoutMethodCount > 0) {
      items.push({
        key: "no_payout_method",
        label: "Runners with no payout method",
        count: stats.noPayoutMethodCount,
        tone: "red",
      });
    }
    if (stats.missingReceiptCount > 0) {
      items.push({
        key: "missing_receipt",
        label: "Orders with missing receipt",
        count: stats.missingReceiptCount,
        tone: "yellow",
        href: "/admin/payouts",
      });
    }
    if (stats.missingInfoCount > 0) {
      items.push({
        key: "missing_info",
        label: "Accounts with missing info",
        count: stats.missingInfoCount,
        tone: "yellow",
      });
    }
    return items;
  }, [stats]);

  const redUrgent = urgent.filter((i) => i.tone === "red");
  const yellowUrgent = urgent.filter((i) => i.tone === "yellow");
  const showGroupedRed = redUrgent.length > 2;

  function applyMetricFilter(key: MetricKey) {
    setFilter(key);
  }

  async function handleRepair(user: UserProfile) {
    if (!user.uid) return;
    setBusyUid(user.uid);
    setBusyKind("repair");
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
      const data = (await res.json()) as { error?: string; email?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not repair account");
      setActionMsg(`Repaired login for ${user.fullName || user.email}: ${data.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not repair account.");
    } finally {
      setBusyUid(null);
      setBusyKind("");
    }
  }

  async function handleDelete(user: UserProfile) {
    if (!user.uid) return;
    const label = user.fullName || user.email || user.uid;
    if (!window.confirm(`Delete account “${label}”? This cannot be undone.`)) {
      return;
    }
    setBusyUid(user.uid);
    setBusyKind("delete");
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
      setBusyUid(null);
      setBusyKind("");
    }
  }

  async function handleEditRole(user: UserProfile) {
    if (!user.uid) return;
    const current = normalizeRole(user.role, Boolean(user.isRunner));
    const next = window.prompt(
      `Set role for ${user.fullName || user.email}\n(customer | runner | both)`,
      current,
    );
    if (!next) return;
    const role = next.trim().toLowerCase() as UserRole;
    if (!["customer", "runner", "both"].includes(role)) {
      setError("Role must be customer, runner, or both.");
      return;
    }
    try {
      await updateUserProfileDoc(user.uid, {
        role,
        isRunner: role === "runner" || role === "both",
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? { ...u, role, isRunner: role === "runner" || role === "both" }
            : u,
        ),
      );
      setActionMsg(`Updated role for ${user.fullName || user.email} → ${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role.");
    }
  }

  const chips: { id: AdminListFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "customers", label: "Customers" },
    { id: "runners", label: "Runners" },
    { id: "cuhk", label: "CUHK" },
    { id: "cityu", label: "CityU" },
    { id: "missing_info", label: "Missing info" },
  ];

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/" title="Admin" />
          <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Daily ops
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {loading
                    ? "Loading metrics…"
                    : stats
                      ? `Stats in ${Math.round(stats.statsMs)}ms · ${users.length} accounts`
                      : "Admin home"}
                </p>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  aria-label="Settings"
                >
                  Settings
                </button>
                {settingsOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40"
                      aria-label="Close settings"
                      onClick={() => setSettingsOpen(false)}
                    />
                    <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-lg">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showDemo}
                          onChange={(e) => setShowDemo(e.target.checked)}
                          className="accent-[#ED1C24]"
                        />
                        <span className="text-gray-800">Show demo accounts</span>
                      </label>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setSettingsOpen(false);
                          void reload();
                        }}
                      >
                        Refresh data
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {actionMsg && (
              <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {actionMsg}
              </p>
            )}
            {error && (
              <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Metrics */}
            <section
              className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6"
              aria-label="Business metrics"
            >
              <MetricCard
                label="Pending payouts"
                value={stats ? formatHkd(stats.pendingPayoutHkd) : "—"}
                href="/admin/payouts"
                active={filter === "pending_payouts"}
                onClick={() => applyMetricFilter("pending_payouts")}
              />
              <MetricCard
                label="Orders today"
                value={stats ? String(stats.ordersToday) : "—"}
                href="/admin/payouts"
                active={filter === "orders_today"}
                onClick={() => applyMetricFilter("orders_today")}
              />
              <MetricCard
                label="Active runners"
                value={stats ? String(stats.activeRunners) : "—"}
                href="/admin/users"
                active={filter === "active_runners"}
                onClick={() => applyMetricFilter("active_runners")}
              />
              <MetricCard
                label="New users (7d)"
                value={stats ? String(stats.newUsers7d) : "—"}
                href="/admin/users"
                active={filter === "new_users"}
                onClick={() => applyMetricFilter("new_users")}
              />
              <MetricCard
                label="Revenue this month"
                value={stats ? formatHkd(stats.revenueMonthHkd) : "—"}
                href="/admin/payments"
                active={filter === "revenue"}
                onClick={() => applyMetricFilter("revenue")}
              />
              <MetricCard
                label="Discount fees"
                value={stats ? formatHkd(stats.discountFeesMonthHkd) : "—"}
                href="/admin/refunds"
                active={filter === "discount_fees"}
                onClick={() => applyMetricFilter("discount_fees")}
              />
            </section>

            {/* Action items */}
            <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
              <h2 className="text-sm font-bold text-gray-900">Needs attention</h2>
              {!loading && urgent.length === 0 && (
                <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
                  ✅ All clear.
                </p>
              )}
              <ul className="mt-2 space-y-1.5">
                {showGroupedRed ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => setFilter("pending_payouts")}
                      className="flex w-full items-center justify-between rounded-xl bg-red-50 px-3 py-2.5 text-left text-sm font-semibold text-red-800 hover:bg-red-100"
                    >
                      <span>🔴 {redUrgent.length} urgent items</span>
                      <span className="text-xs font-bold">
                        {redUrgent.reduce((s, i) => s + i.count, 0)}
                      </span>
                    </button>
                    <ul className="mt-1 space-y-1 pl-3">
                      {redUrgent.map((item) => (
                        <li key={item.key}>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.href) window.location.href = item.href;
                              else setFilter(item.key);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-red-800 hover:bg-red-50"
                          >
                            <span>{item.label}</span>
                            <span className="font-bold">({item.count})</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  redUrgent.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.href) window.location.href = item.href;
                          else setFilter(item.key);
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-red-50 px-3 py-2.5 text-left text-sm font-semibold text-red-800 hover:bg-red-100"
                      >
                        <span>🔴 {item.label}</span>
                        <span>({item.count})</span>
                      </button>
                    </li>
                  ))
                )}
                {yellowUrgent.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.href) window.location.href = item.href;
                        else setFilter(item.key);
                      }}
                      className="flex w-full items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 text-left text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      <span>🟡 {item.label}</span>
                      <span>({item.count})</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Quick links */}
            <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
              <Link href="/admin/payouts" className="hover:text-gray-900">
                Runner payouts
                {stats && stats.pendingPayoutCount > 0 ? (
                  <span className="ml-1 rounded-full bg-gray-200 px-1.5 text-[10px] font-bold text-gray-800">
                    {stats.pendingPayoutCount}
                  </span>
                ) : null}
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/admin/messaging" className="hover:text-gray-900">
                Send email
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/admin/support" className="hover:text-gray-900">
                Support chat
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/admin/warnings" className="hover:text-gray-900">
                Warnings
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/admin/feedback" className="hover:text-gray-900">
                College appeals
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/admin/feedback" className="hover:text-gray-900">
                Feedback
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/admin/users" className="hover:text-gray-900">
                Classic users table
              </Link>
            </nav>

            {/* User list */}
            <section className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="sticky top-[3.25rem] z-20 space-y-3 border-b border-gray-100 bg-white/95 p-3 backdrop-blur sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or email"
                    className="w-full flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as AdminSort)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800"
                    aria-label="Sort users"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="name_asc">Name ↑</option>
                    <option value="name_desc">Name ↓</option>
                    <option value="campus">Campus</option>
                  </select>
                </div>
                <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5">
                  {chips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setFilter(chip.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        filter === chip.id
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Showing {Math.min(visible.length, totalFiltered)} of{" "}
                  {totalFiltered}
                  {totalFiltered !== users.length
                    ? ` (filtered from ${users.length})`
                    : ""}
                </p>
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2">User</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Campus</th>
                      <th className="px-4 py-2">Role</th>
                      <th className="px-4 py-2">Signed up</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((u) => {
                      const name = u.fullName?.trim();
                      const noName = !name || name === "Guest";
                      return (
                        <tr
                          key={u.uid ?? u.email ?? name}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                                {u.photoURL ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={u.photoURL}
                                    alt=""
                                    className="h-9 w-9 rounded-full object-cover"
                                  />
                                ) : (
                                  initials(u.fullName, u.email)
                                )}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {noName ? "—" : name}
                                  {noName && (
                                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                      no name
                                    </span>
                                  )}
                                  {runnerMissingPayout(u) && (
                                    <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                                      no payout
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-xs px-4 py-3">{emailDisplay(u.email)}</td>
                          <td className="px-4 py-3">
                            <CampusBadge campus={userCampus(u)} />
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge user={u} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {formatDate(u.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <UserActionsMenu
                              user={u}
                              unread={u.uid ? unread[u.uid] ?? 0 : 0}
                              onMessage={() => setChatUser(u)}
                              onWarn={() => {
                                window.location.href = "/admin/warnings";
                              }}
                              onEditRole={() => void handleEditRole(u)}
                              onRepair={() => void handleRepair(u)}
                              onDelete={() => void handleDelete(u)}
                              busy={
                                busyUid === u.uid ? busyKind : undefined
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-gray-50 md:hidden">
                {visible.map((u) => {
                  const name = u.fullName?.trim();
                  const noName = !name || name === "Guest";
                  return (
                    <li
                      key={u.uid ?? u.email ?? name}
                      className="flex items-start gap-3 px-3 py-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                        {initials(u.fullName, u.email)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {noName ? "—" : name}
                              {noName && (
                                <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-900">
                                  no name
                                </span>
                              )}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <CampusBadge campus={userCampus(u)} />
                              <RoleBadge user={u} />
                            </div>
                          </div>
                          <UserActionsMenu
                            user={u}
                            unread={u.uid ? unread[u.uid] ?? 0 : 0}
                            onMessage={() => setChatUser(u)}
                            onWarn={() => {
                              window.location.href = "/admin/warnings";
                            }}
                            onEditRole={() => void handleEditRole(u)}
                            onRepair={() => void handleRepair(u)}
                            onDelete={() => void handleDelete(u)}
                            busy={busyUid === u.uid ? busyKind : undefined}
                          />
                        </div>
                        <p className="mt-1.5 text-sm">{emailDisplay(u.email)}</p>
                        {userMissingInfo(u) && (
                          <p className="mt-1 text-[11px] font-semibold text-amber-800">
                            Missing account info
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {!loading && totalFiltered === 0 && (
                <p className="px-4 py-8 text-center text-sm text-gray-500">
                  No accounts match this filter.
                </p>
              )}

              {visible.length < totalFiltered && (
                <div className="border-t border-gray-100 p-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Load more
                  </button>
                </div>
              )}
            </section>

            {stats && stats.warnings.length > 0 && (
              <details className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs text-amber-900">
                <summary className="cursor-pointer font-semibold">
                  {stats.warnings.length} metric warning
                  {stats.warnings.length === 1 ? "" : "s"} (indexes / fields)
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {stats.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </details>
            )}
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
