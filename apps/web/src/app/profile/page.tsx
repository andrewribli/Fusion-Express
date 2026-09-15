"use client";

import { ProfileView } from "@/components/ProfileView";
import { RequireCustomer } from "@/components/RequireAuth";

export default function ProfilePage() {
  return (
    <RequireCustomer>
      <ProfileView />
    </RequireCustomer>
  );
}
