"use client";

import { CampusEmailOtp } from "@/components/CampusEmailOtp";

/**
 * CUHK-only OTP (forgot-password / legacy callers).
 * Signup should use CampusEmailOtp with the selected campus.
 */
export function CuhkEmailOtp({
  initialEmail = "",
  verified,
  onVerified,
  hint: _hint,
}: {
  initialEmail?: string;
  verified: boolean;
  onVerified: (email: string) => void;
  hint?: string;
}) {
  return (
    <CampusEmailOtp
      campus="cuhk"
      initialEmail={initialEmail}
      verified={verified}
      onVerified={onVerified}
    />
  );
}
