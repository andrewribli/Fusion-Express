"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RequireAdmin } from "@/components/RequireAdmin";
import { BootScreen } from "@/components/BootScreen";

/** /admin hub — founders land here from the header shortcut. */
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/users");
  }, [router]);

  return (
    <RequireAdmin>
      <BootScreen />
    </RequireAdmin>
  );
}
