"use client";

import { use } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { OrderChat } from "@/components/OrderChat";
import { RequireAuth } from "@/components/RequireAuth";

export default function ChatPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);

  return (
    <RequireAuth>
      <AppShell>
        <div className="min-h-screen bg-gray-50">
          <AppHeader
            showBack
            backHref={`/track?orderId=${orderId}`}
            title="Chat"
          />
          <main className="mx-auto max-w-[480px] px-4 py-4">
            <OrderChat orderId={orderId} backHref={`/track?orderId=${orderId}`} />
          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
