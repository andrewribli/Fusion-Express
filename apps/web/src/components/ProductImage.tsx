"use client";

import Image from "next/image";
import { useState } from "react";

type PlaceholderKind =
  | "meat"
  | "dairy"
  | "produce"
  | "seafood"
  | "noodles"
  | "snacks"
  | "drinks"
  | "frozen"
  | "household"
  | "other";

const LABELS: Record<PlaceholderKind, string> = {
  meat: "Meat",
  dairy: "Dairy",
  produce: "Produce",
  seafood: "Seafood",
  noodles: "Noodles",
  snacks: "Snacks",
  drinks: "Drinks",
  frozen: "Frozen",
  household: "Household",
  other: "Grocery",
};

function kindFromCategory(category?: string): PlaceholderKind {
  const c = (category ?? "").toLowerCase();
  if (/(meat|beef|pork|steak|chicken|lamb|striploin|sausage)/.test(c)) return "meat";
  if (/(dairy|egg|milk|cheese|yogurt|butter)/.test(c)) return "dairy";
  if (/(fruit|veg|produce|salad)/.test(c)) return "produce";
  if (/(seafood|fish|shrimp|prawn)/.test(c)) return "seafood";
  if (/(noodle|ramen|instant)/.test(c)) return "noodles";
  if (/(snack|chip|biscuit|cracker|pickle)/.test(c)) return "snacks";
  if (/(drink|tea|coffee|juice|beverage)/.test(c)) return "drinks";
  if (/(frozen)/.test(c)) return "frozen";
  if (/(household|clean|toiletries)/.test(c)) return "household";
  return "other";
}

function PlaceholderIcon({ kind }: { kind: PlaceholderKind }) {
  const common = "h-8 w-8 text-[#5A8F6A]";
  if (kind === "meat") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 10c0-3 2.5-5 5.5-5S18 7 18 10c2 0 3 1.6 3 3.4C21 16 19 18 16.5 18h-8C6 18 4 16 4 13.4 4 11.6 5 10 7 10Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  if (kind === "dairy") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9 4h6l1 4H8l1-4Zm-1 4h8v12H8V8Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  if (kind === "produce") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 20c4 0 7-3.2 7-8-3 0-5.5 1-7 3-1.5-2-4-3-7-3 0 4.8 3 8 7 8Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M12 15V5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ProductImage({
  src,
  alt,
  category,
  className = "object-contain p-2",
  sizes = "(min-width: 768px) 33vw, 50vw",
  showLabel = true,
}: {
  src?: string | null;
  alt: string;
  category?: string;
  className?: string;
  sizes?: string;
  showLabel?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const usable = Boolean(src && src.trim() && !failed);
  const kind = kindFromCategory(category || alt);

  if (!usable) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#F0F7F2] px-2">
        <PlaceholderIcon kind={kind} />
        {showLabel ? (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[#5A8F6A]">
            {LABELS[kind]}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Image
      src={src!}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
