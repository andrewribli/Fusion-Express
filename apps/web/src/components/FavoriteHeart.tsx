"use client";

import { useEffect, useState } from "react";
import { useFavorites } from "@/context/FavoritesContext";

export function FavoriteHeart({
  itemId,
  className = "",
}: {
  itemId: string;
  className?: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(itemId);
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy || !itemId}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        setBusy(true);
        void toggleFavorite(itemId).finally(() => setBusy(false));
      }}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={fav}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base shadow-sm ring-1 ring-black/5 transition hover:bg-white disabled:opacity-60 ${className}`}
    >
      <span
        aria-hidden
        className={fav ? "text-[#ED1C24]" : "text-gray-400"}
      >
        {fav ? "♥" : "♡"}
      </span>
    </button>
  );
}

/** Lightweight toast for favorite save failures. */
export function FavoritesToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || !detail.trim()) return;
      setMessage(detail.trim());
    }
    window.addEventListener("gracerun-toast", onToast);
    return () => window.removeEventListener("gracerun-toast", onToast);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-20 left-1/2 z-[80] w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  );
}
