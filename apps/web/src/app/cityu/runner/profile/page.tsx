"use client";

import Link from "next/link";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { CAMPUS } from "@/ptero/config/campus";
import { useUser } from "@/ptero/context/AppState";

export default function RunnerProfilePage() {
  const { user, setMode } = useUser();

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader title="Runner profile" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-28">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-lg font-bold">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
          <p className="mt-2 text-sm">
            Phone: <span className="font-semibold">{user?.phone ?? "—"}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            campus: {CAMPUS.id} · supermarket: {CAMPUS.supermarket}
          </p>
        </div>
        <Link
          href="/cityu"
          onClick={() => setMode("customer")}
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-fusion-red py-3 text-sm font-bold text-white"
        >
          Switch to Customer
        </Link>
      </main>
    </AppShell>
  );
}
