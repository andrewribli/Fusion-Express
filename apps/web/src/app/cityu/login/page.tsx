"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * CityU used to have its own login ("CityU email" only). Sign-in is universal:
 * one form, and the address decides the campus. This route only forwards.
 */
export default function CityULoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next === "/runner/register") params.set("next", "/cityu/runner/register");
    if (next === "/checkout") params.set("next", "/cityu/checkout");
    const query = params.toString();
    router.replace(query ? `/login?${query}` : "/login");
  }, [router]);

  return null;
}
