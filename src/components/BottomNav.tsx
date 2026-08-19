"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { countRunnerActiveOrders } from "@/lib/orders";

const BASE_TABS = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/orders", label: "Orders", icon: "📋" },
  { href: "/profile", label: "Profile", icon: "👤" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!user?.isRunner || !user.runnerId) return;
    void countRunnerActiveOrders(user.runnerId).then(setActiveCount);
    const interval = setInterval(() => {
      void countRunnerActiveOrders(user.runnerId!).then(setActiveCount);
    }, 15000);
    return () => clearInterval(interval);
  }, [user?.isRunner, user?.runnerId]);

  const tabs = user?.isRunner
    ? [
        BASE_TABS[0],
        { href: "/runner/dashboard", label: "Runner", icon: "🏃", badge: activeCount },
        BASE_TABS[1],
        BASE_TABS[2],
      ]
    : [...BASE_TABS];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-[480px]">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href === "/home" && pathname.startsWith("/browse")) ||
            (tab.href === "/runner/dashboard" && pathname.startsWith("/runner"));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                active ? "text-fusion-red" : "text-gray-500"
              }`}
            >
              <span className="relative text-lg">
                {tab.icon}
                {"badge" in tab && tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fusion-red px-1 text-[9px] font-bold text-white">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
