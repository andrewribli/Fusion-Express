"use client";

import { use } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { OrderChat } from "@/components/OrderChat";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";

export default function ChatPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { user } = useUser();
  const backHref = user?.isRunner
    ? "/runner/dashboard"
    : `/track?orderId=${orderId}`;

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref={backHref} title="Chat" />
          <main className="mx-auto max-w-[480px] px-4 py-4">
            <OrderChat orderId={orderId} backHref={backHref} />
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
