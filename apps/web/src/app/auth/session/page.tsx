"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BootScreen } from "@/components/BootScreen";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.startsWith("/login") || raw.startsWith("/auth/session")) return "/";
  return raw;
}

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token")?.trim() ?? "";
    const next = safeNext(searchParams.get("next"));
    if (!token) {
      setError("Missing session token.");
      return;
    }
    if (!isFirebaseConfigured()) {
      setError("Firebase is not configured.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { signInWithCustomToken } = await import("firebase/auth");
        await signInWithCustomToken(getAuthClient(), token);
        if (!cancelled) router.replace(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "This login link expired or is invalid.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Could not sign in</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-flex rounded-xl bg-[#ED1C24] px-4 py-2 text-sm font-semibold text-white"
          >
            Go to login
          </a>
        </div>
      </main>
    );
  }

  return <BootScreen />;
}

export default function AuthSessionPage() {
  return (
    <Suspense fallback={<BootScreen />}>
      <SessionContent />
    </Suspense>
  );
}
