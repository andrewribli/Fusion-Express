"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  MEAL_SEARCH_DEBOUNCE_MS,
  MEAL_SEARCH_MIN_CHARS,
  MEAL_SEARCH_PAGE_SIZE,
  MEAL_SEARCH_PRICE_CEILING,
  SUGGESTION_QUERIES,
  campusMenuHref,
  countActiveFilters,
  defaultFilters,
  distanceAvailable,
  formatEstPrice,
  formatWalkMinutes,
  hasActiveFilters,
  searchCampusDishes,
  type DistanceFilter,
  type MealBucket,
  type MealSearchCampus,
  type MealSearchFilters,
  type MealSort,
  type PriceFilter,
  type RankedDish,
} from "@/lib/meal-search";
import { FavoriteHeart } from "@/components/FavoriteHeart";
import { useFavorites } from "@/context/FavoritesContext";
import { useUser } from "@/context/UserContext";
import { canteenFavoriteId } from "@/lib/favorites";

const BUCKETS: { id: MealBucket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "meals", label: "Meals" },
  { id: "drinks", label: "Drinks" },
  { id: "snacks", label: "Snacks" },
  { id: "desserts", label: "Desserts" },
];

const PRICE_PRESETS: {
  id: Extract<PriceFilter, { kind: "preset" }>["preset"];
  label: string;
}[] = [
  { id: "under20", label: "Under $20" },
  { id: "20-40", label: "$20–$40" },
  { id: "40-60", label: "$40–$60" },
  { id: "60plus", label: "$60+" },
];

const SORTS: { id: MealSort; label: string }[] = [
  { id: "best", label: "Best match" },
  { id: "price-asc", label: "Price ascending" },
  { id: "price-desc", label: "Price descending" },
  { id: "distance", label: "Distance ascending" },
  { id: "az", label: "A–Z" },
  { id: "favorites", label: "Favorites first" },
];

const DISTANCE_PRESETS: { id: DistanceFilter; label: string }[] = [
  { id: "any", label: "Any distance" },
  { id: "under10", label: "Under 10 min" },
  { id: "10-15", label: "10–15" },
  { id: "15-20", label: "15–20" },
  { id: "20plus", label: "20+" },
];

function useMediaMin640() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setOk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return ok;
}

/** Keep mobile sheets inside the visible viewport so the keyboard does not cover results. */
function useKeyboardViewport() {
  const [box, setBox] = useState({ height: 0, offsetTop: 0, covered: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      setBox({
        height: vv.height,
        offsetTop: vv.offsetTop,
        covered: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      });
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);
  return box;
}

function DishThumb({ dish }: { dish: RankedDish }) {
  if (dish.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dish.imageUrl}
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-400"
      aria-hidden
    >
      {dish.name.slice(0, 1)}
    </div>
  );
}

function ResultRow({
  dish,
  onPick,
}: {
  dish: RankedDish;
  onPick: (dish: RankedDish) => void;
}) {
  const closed = !dish.interactive;
  const favId = canteenFavoriteId(dish.canteenId, dish.itemId);
  return (
    <div className="relative flex w-full items-center gap-1 pr-1">
      <button
        type="button"
        disabled={closed}
        onClick={() => {
          if (closed) return;
          onPick(dish);
        }}
        className={`flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition ${
          closed
            ? "cursor-not-allowed opacity-50 grayscale"
            : "hover:bg-red-50/70"
        }`}
      >
        <DishThumb dish={dish} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{dish.name}</p>
          <p className="mt-0.5 text-sm font-medium text-[#ED1C24]">
            {formatEstPrice(dish.price)}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {dish.canteenName}
            {dish.walkMinutes != null
              ? ` · ${formatWalkMinutes(dish.walkMinutes)}`
              : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
            dish.openNow
              ? "bg-emerald-50 text-emerald-700"
              : dish.orderable
                ? "bg-amber-50 text-amber-800"
                : "bg-gray-100 text-gray-500"
          }`}
        >
          {dish.openNow ? "Open" : dish.orderable ? "Closed" : "Soon"}
        </span>
      </button>
      <FavoriteHeart itemId={favId} className="shrink-0" />
    </div>
  );
}


function CategoryChips({
  value,
  onChange,
  className = "",
}: {
  value: MealBucket;
  onChange: (b: MealBucket) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {BUCKETS.map((b) => {
        const active = value === b.id;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onChange(b.id)}
            className={`flex min-h-10 shrink-0 items-center rounded-full px-3 text-xs font-semibold transition ${
              active
                ? "bg-[#ED1C24] text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-200"
            }`}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}

function PriceControls({
  value,
  onChange,
}: {
  value: PriceFilter;
  onChange: (p: PriceFilter) => void;
}) {
  const min =
    value.kind === "range" ? value.min : 0;
  const max =
    value.kind === "range"
      ? value.max
      : MEAL_SEARCH_PRICE_CEILING;
  const maxPlus = value.kind === "range" ? value.maxPlus : true;
  const [more, setMore] = useState(value.kind === "range");

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Price
      </p>
      <div className="flex flex-wrap gap-2">
        {PRICE_PRESETS.map((p) => {
          const active = value.kind === "preset" && value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                onChange(
                  active
                    ? { kind: "none" }
                    : { kind: "preset", preset: p.id },
                )
              }
              className={`flex min-h-10 items-center rounded-full px-3 text-xs font-semibold ${
                active
                  ? "bg-[#ED1C24] text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setMore((v) => !v)}
        className="text-xs font-semibold text-gray-600 underline"
      >
        {more ? "Hide range" : "More"}
      </button>
      {more ? (
      <div className="px-1">
        <div className="relative h-8">
          <input
            type="range"
            min={0}
            max={MEAL_SEARCH_PRICE_CEILING}
            value={min}
            onChange={(e) => {
              const nextMin = Math.min(Number(e.target.value), max);
              onChange({
                kind: "range",
                min: nextMin,
                max,
                maxPlus: max >= MEAL_SEARCH_PRICE_CEILING,
              });
            }}
            className="absolute inset-x-0 top-2 z-20 w-full appearance-none bg-transparent"
            aria-label="Minimum price"
          />
          <input
            type="range"
            min={0}
            max={MEAL_SEARCH_PRICE_CEILING}
            value={max}
            onChange={(e) => {
              const nextMax = Math.max(Number(e.target.value), min);
              onChange({
                kind: "range",
                min,
                max: nextMax,
                maxPlus: nextMax >= MEAL_SEARCH_PRICE_CEILING,
              });
            }}
            className="absolute inset-x-0 top-2 z-30 w-full appearance-none bg-transparent"
            aria-label="Maximum price"
          />
        </div>
        <p className="mt-1 text-xs text-gray-600">
          HK${min} – HK${maxPlus || max >= MEAL_SEARCH_PRICE_CEILING ? "100+" : max}
        </p>
      </div>
      ) : null}
    </div>
  );
}

function FiltersBody({
  filters,
  setFilters,
  canteens,
  hasHall,
  showSort,
}: {
  filters: MealSearchFilters;
  setFilters: (fn: (prev: MealSearchFilters) => MealSearchFilters) => void;
  canteens: { id: string; name: string; shortName: string }[];
  hasHall: boolean;
  showSort: boolean;
}) {
  const [canteenOpen, setCanteenOpen] = useState(false);
  const selected =
    filters.canteenIds === null
      ? new Set(canteens.map((c) => c.id))
      : new Set(filters.canteenIds);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Category
        </p>
        <CategoryChips
          value={filters.bucket}
          onChange={(bucket) => setFilters((f) => ({ ...f, bucket }))}
        />
      </div>

      <PriceControls
        value={filters.price}
        onChange={(price) => setFilters((f) => ({ ...f, price }))}
      />

      <label className="flex items-center justify-between gap-3 text-sm font-medium text-gray-800">
        <span>Open now</span>
        <input
          type="checkbox"
          checked={filters.openNowOnly}
          onChange={(e) =>
            setFilters((f) => ({ ...f, openNowOnly: e.target.checked }))
          }
          className="h-5 w-5 rounded border-gray-300 text-[#ED1C24]"
        />
      </label>

      <label className="flex items-center justify-between gap-3 text-sm font-medium text-gray-800">
        <span>♥ Favorites only</span>
        <input
          type="checkbox"
          checked={filters.favoritesOnly}
          onChange={(e) =>
            setFilters((f) => ({ ...f, favoritesOnly: e.target.checked }))
          }
          className="h-5 w-5 rounded border-gray-300 text-[#ED1C24]"
        />
      </label>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Distance
        </p>
        {hasHall ? (
          <div className="flex flex-wrap gap-2">
            {DISTANCE_PRESETS.map((p) => {
              const active = filters.distance === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({ ...f, distance: p.id }))
                  }
                  className={`flex min-h-10 items-center rounded-full px-3 text-xs font-semibold ${
                    active
                      ? "bg-[#ED1C24] text-white"
                      : "bg-white text-gray-700 ring-1 ring-gray-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Set your hall in your profile to see walk times.
          </p>
        )}
      </div>

      {canteens.length > 1 ? (
        <div>
          <button
            type="button"
            onClick={() => setCanteenOpen((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Canteens
            <span className="text-gray-400">{canteenOpen ? "▲" : "▼"}</span>
          </button>
          {canteenOpen ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {canteens.map((c) => {
                const on = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const next = new Set(selected);
                          if (on) next.delete(c.id);
                          else next.add(c.id);
                          const allOn = next.size === canteens.length;
                          setFilters((f) => ({
                            ...f,
                            canteenIds:
                              next.size === 0
                                ? []
                                : allOn
                                  ? null
                                  : [...next],
                          }));
                        }}
                      />
                      {c.shortName}
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showSort ? (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Sort
        </p>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => {
            const disabled = s.id === "distance" && !hasHall;
            const active = filters.sort === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setFilters((f) => ({ ...f, sort: s.id }));
                }}
                className={`flex min-h-10 items-center rounded-full px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 ring-1 ring-gray-200"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      ) : null}
    </div>
  );
}

/**
 * Shared campus-aware meal search for /canteen (CUHK) and /cityu/canteen.
 * Do not duplicate — both index pages render this component.
 */
export function MealSearch({ campus }: { campus: MealSearchCampus }) {
  const router = useRouter();
  const { user } = useUser();
  const listId = useId();
  const desktop = useMediaMin640();
  const viewport = useKeyboardViewport();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragY = useRef(0);
  const hall = user?.hall?.trim() || null;
  const college = user?.college?.trim() || null;
  const hasHall = distanceAvailable(campus, hall, college);

  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MealSearchFilters>(defaultFilters);
  const [focused, setFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(MEAL_SEARCH_PAGE_SIZE);
  const [sheetDrag, setSheetDrag] = useState(0);
  const { favoriteSet } = useFavorites();

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(draft.trim());
      setLimit(MEAL_SEARCH_PAGE_SIZE);
    }, MEAL_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [draft]);

  const result = useMemo(
    () =>
      searchCampusDishes(campus, query, filters, favoriteSet, {
        hall,
        college,
      }),
    [campus, query, filters, favoriteSet, hall, college],
  );

  const panelVisible =
    focused ||
    mobileOpen ||
    query.length >= MEAL_SEARCH_MIN_CHARS ||
    hasActiveFilters(filters);

  const showPanel =
    panelVisible &&
    (query.length >= MEAL_SEARCH_MIN_CHARS || hasActiveFilters(filters));

  const visible = result.items.slice(0, limit);
  const filterCount = countActiveFilters(filters);

  const closeSheet = useCallback(() => {
    setMobileOpen(false);
    setFocused(false);
    setSheetDrag(0);
  }, []);

  useEffect(() => {
    if (!mobileOpen && !filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (filtersOpen) setFiltersOpen(false);
      else closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, filtersOpen, closeSheet]);

  useEffect(() => {
    if (desktop || !mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [desktop, mobileOpen]);

  const onPick = useCallback(
    (dish: RankedDish) => {
      if (!dish.interactive) return;
      const href = campusMenuHref(campus, dish.canteenId, dish.itemId);
      setMobileOpen(false);
      setFocused(false);
      setDraft("");
      setQuery("");
      router.push(href);
    },
    [campus, router],
  );

  const clearFilters = () => setFilters(defaultFilters());

  const emptyBlock: ReactNode =
    result.emptyReason === "query" ? (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-gray-700">
          No dishes match &apos;{query}&apos;.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {SUGGESTION_QUERIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setDraft(s);
                setQuery(s);
              }}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    ) : result.emptyReason === "filters" ? (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-gray-700">
          {filters.favoritesOnly
            ? "You haven't favorited anything yet. Tap the ♥ on any item to save it here."
            : "No dishes match your filters."}
        </p>
        <button
          type="button"
          onClick={clearFilters}
          className="mt-3 text-sm font-semibold text-[#ED1C24]"
        >
          Clear filters
        </button>
      </div>
    ) : null;

  const resultsContent = (
    <>
      {result.allClosed && result.items.length > 0 ? (
        <div className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          These canteens are currently closed.
        </div>
      ) : null}
      {emptyBlock}
      {visible.length > 0 ? (
        <ul id={listId} className="divide-y divide-gray-50">
          {visible.map((dish) => (
            <li key={dish.key}>
              <ResultRow dish={dish} onPick={onPick} />
            </li>
          ))}
        </ul>
      ) : null}
      {result.total > limit ? (
        <button
          type="button"
          onClick={() => setLimit((n) => n + MEAL_SEARCH_PAGE_SIZE)}
          className="w-full border-t border-gray-100 py-3 text-sm font-semibold text-[#ED1C24]"
        >
          Show more
        </button>
      ) : null}
    </>
  );

  const filterBar = (
    <div
      className="flex items-center gap-2 border-b border-gray-100 bg-white px-2 py-2"
      style={{ paddingBottom: desktop ? undefined : undefined }}
    >
      <div className="min-w-0 flex-1 sm:hidden">
        <CategoryChips
          value={filters.bucket}
          onChange={(bucket) => setFilters((f) => ({ ...f, bucket }))}
        />
      </div>
      <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
        <CategoryChips
          value={filters.bucket}
          onChange={(bucket) => setFilters((f) => ({ ...f, bucket }))}
        />
        <select
          value={filters.sort}
          onChange={(e) =>
            setFilters((f) => ({ ...f, sort: e.target.value as MealSort }))
          }
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700"
          aria-label="Sort"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id} disabled={s.id === "distance" && !hasHall}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="flex min-h-10 shrink-0 items-center rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800"
      >
        {filterCount > 0 ? `Filters · ${filterCount}` : "Filters"}
      </button>
      {filterCount > 0 ? (
        <button
          type="button"
          onClick={clearFilters}
          className="shrink-0 text-xs font-semibold text-[#ED1C24]"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );

  const sheetHeight = viewport.height > 0 ? `${viewport.height}px` : "100dvh";

  return (
    <div className="relative min-w-0 flex-1">
      <div className="relative h-11 w-full min-w-0">
        <input
          ref={inputRef}
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (!desktop) setMobileOpen(true);
          }}
          onBlur={() => {
            if (desktop) {
              window.setTimeout(() => setFocused(false), 180);
            }
          }}
          placeholder="Search your meal"
          className="h-11 w-full rounded-full border border-gray-200 bg-white pl-4 pr-12 text-sm outline-none shadow-sm sm:border-0 sm:shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          autoComplete="off"
          enterKeyHint="search"
          aria-autocomplete="list"
          aria-controls={listId}
        />
        <button
          type="button"
          onClick={() => {
            inputRef.current?.focus();
            if (!desktop) setMobileOpen(true);
          }}
          className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#ff6a00] text-white"
          aria-label="Search"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2.2" />
            <path
              d="m16 16 4 4"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Desktop dropdown ≥640px */}
      {desktop &&
      showPanel &&
      (focused ||
        query.length >= MEAL_SEARCH_MIN_CHARS ||
        hasActiveFilters(filters)) ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filterBar}
          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {resultsContent}
          </div>
        </div>
      ) : null}

      {/* Mobile full-screen sheet from the bottom <640px */}
      {!desktop && mobileOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search dishes"
            className="fixed inset-x-0 z-[81] flex flex-col rounded-t-2xl bg-white shadow-2xl"
            style={{
              top: viewport.offsetTop,
              height: sheetHeight,
              transform: sheetDrag > 0 ? `translateY(${sheetDrag}px)` : undefined,
            }}
          >
            <div
              className="flex shrink-0 justify-center pt-2"
              onTouchStart={(e) => {
                dragStart.current = e.touches[0]?.clientY ?? null;
              }}
              onTouchMove={(e) => {
                if (dragStart.current == null) return;
                const dy = (e.touches[0]?.clientY ?? dragStart.current) - dragStart.current;
                dragY.current = Math.max(0, dy);
                setSheetDrag(dragY.current);
              }}
              onTouchEnd={() => {
                if (dragY.current > 72) closeSheet();
                else setSheetDrag(0);
                dragY.current = 0;
                dragStart.current = null;
              }}
            >
              <span className="h-1.5 w-10 rounded-full bg-gray-300" aria-hidden />
            </div>
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2">
              <button
                type="button"
                onClick={closeSheet}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-gray-700"
                aria-label="Close"
              >
                ×
              </button>
              <input
                autoFocus
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search your meal"
                className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#ED1C24]"
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
            <div className="sticky top-0 z-10 bg-white">{filterBar}</div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {resultsContent}
            </div>
          </div>
        </div>
      ) : null}

      {/* Filters sheet — separate from the results sheet */}
      {filtersOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"
            style={{
              marginBottom: viewport.covered,
              paddingBottom: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {filterCount > 0 ? `Filters · ${filterCount}` : "Filters"}
              </h2>
              <div className="flex items-center gap-3">
                {filterCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-gray-500"
                  >
                    Clear all
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="text-sm font-semibold text-[#ED1C24]"
                >
                  Done
                </button>
              </div>
            </div>
            <FiltersBody
              filters={filters}
              setFilters={setFilters}
              canteens={result.canteensInResults}
              hasHall={hasHall}
              showSort={!desktop}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
