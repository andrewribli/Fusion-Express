"use client";

export function useDemoAuth(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_AUTH === "true";
}
