"use client";

import { use } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { OrderChat } from "@/components/OrderChat";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";
import { resolveCampus } from "@fusion-express/shared/campus";

export default function ChatPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { user } = useUser();
  const campus = resolveCampus(user?.campus);
  const backHref = user?.isRunner
    ? campus === "cityu"
      ? "/cityu/runner/deliveries"
      : "/runner/dashboard"
    : campus === "cityu"
      ? `/cityu/track/${orderId}`
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
