"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAuthClient } from "@/lib/firebase";
import {
  clearLocalFavoriteIds,
  normalizeFavoriteIds,
  readLocalFavoriteIds,
} from "@/lib/favorites";
import { useUser } from "@/context/UserContext";

type FavoritesContextValue = {
  favoriteIds: string[];
  favoriteSet: Set<string>;
  ready: boolean;
  isFavorite: (itemId: string) => boolean;
  toggleFavorite: (itemId: string) => Promise<boolean>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

async function authHeaders(): Promise<HeadersInit> {
  const auth = getAuthClient();
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in to save favorites.");
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const uid = user && !user.isGuest ? user.uid : undefined;
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    if (!uid) {
      setFavoriteIds(readLocalFavoriteIds());
      setReady(true);
      return;
    }

    void (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch("/api/account/favorites", { headers });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as { favorites?: unknown };
        let next = normalizeFavoriteIds(data.favorites);
        const local = readLocalFavoriteIds();
        const missing = local.filter((id) => !next.includes(id));
        if (missing.length > 0) {
          for (const itemId of missing.slice(0, 20)) {
            try {
              const write = await fetch("/api/account/favorites", {
                method: "POST",
                headers,
                body: JSON.stringify({ itemId, action: "add" }),
              });
              if (write.ok) {
                const body = (await write.json()) as { favorites?: unknown };
                next = normalizeFavoriteIds(body.favorites);
              }
            } catch {
              /* keep going */
            }
          }
          clearLocalFavoriteIds();
        }
        if (!cancelled) setFavoriteIds(next);
      } catch {
        if (!cancelled) setFavoriteIds(readLocalFavoriteIds());
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback(
    (itemId: string) => favoriteSet.has(itemId),
    [favoriteSet],
  );

  const toggleFavorite = useCallback(
    async (itemId: string): Promise<boolean> => {
      const id = itemId.trim();
      if (!id) return false;
      const was = favoriteSet.has(id);
      const optimistic = was
        ? favoriteIds.filter((row) => row !== id)
        : [...favoriteIds, id];
      setFavoriteIds(optimistic);

      if (!uid) {
        try {
          localStorage.setItem("fusion_favorites", JSON.stringify(optimistic));
        } catch {
          /* ignore */
        }
        return !was;
      }

      try {
        const headers = await authHeaders();
        const res = await fetch("/api/account/favorites", {
          method: "POST",
          headers,
          body: JSON.stringify({ itemId: id, action: "toggle" }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          favorites?: unknown;
          error?: string;
        };
        if (!res.ok) {
          setFavoriteIds(favoriteIds);
          window.dispatchEvent(
            new CustomEvent("gracerun-toast", {
              detail:
                data.error?.trim() ||
                "Couldn't save favorite. Try again.",
            }),
          );
          return was;
        }
        setFavoriteIds(normalizeFavoriteIds(data.favorites));
        return !was;
      } catch {
        setFavoriteIds(favoriteIds);
        window.dispatchEvent(
          new CustomEvent("gracerun-toast", {
            detail: "Couldn't save favorite. Try again.",
          }),
        );
        return was;
      }
    },
    [favoriteIds, favoriteSet, uid],
  );

  const value = useMemo(
    () => ({
      favoriteIds,
      favoriteSet,
      ready,
      isFavorite,
      toggleFavorite,
    }),
    [favoriteIds, favoriteSet, ready, isFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    return {
      favoriteIds: [],
      favoriteSet: new Set(),
      ready: true,
      isFavorite: () => false,
      toggleFavorite: async () => false,
    };
  }
  return ctx;
}
