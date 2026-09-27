/**
 * CUHK delivery is a directed graph. The fee is the cheapest path, not a
 * destination lookup. Add a route by appending to CUHK_EDGES — do not
 * special-case a hall in the search, and do not mirror an edge that is not
 * listed on its own.
 *
 * Every edge has a route tag. There are no untagged edges.
 *
 * fusion and sorazen are the same building. sorazen is an alias, not a node.
 * srrs is a hub only. It is not a customer hall.
 *
 * When BUS_ONLY[origin] includes the destination, walks that leave the origin
 * are dropped except edges whose `to` is in HUB_WALKS[origin]. Dijkstra then
 * runs on that filtered list. Other pairs use the full list.
 * On a cost tie, the path with fewer edges wins (a direct edge beats a longer
 * walk of the same cost).
 */

export const FEE_FLOOR = 5;
export const BLOCK_THRESHOLD = 12;

export const CUHK_NODES = [
  "fusion",
  "srrs",
  "paper-coffee",
  "uc",
  "lsk",
  "mmw",
  "na",
  "wys",
  "shaw",
  "lws",
  "i-house-12",
  "i-house-345",
  "pg-halls",
  "cw-chu",
  "shho-mc-chungchi",
] as const;

export type CuhkNode = (typeof CUHK_NODES)[number];

export type CuhkRoute = "walk" | "bus-3" | "bus-3-4" | "bus-8" | "shuttle";

export type CuhkEdge = {
  from: CuhkNode;
  to: CuhkNode;
  /** Raw edge cost. The HK$5 floor is applied to the path total, not here. */
  fee: number;
  route: CuhkRoute;
};

/** Directed. Do not mirror an edge unless it is listed on its own. */
export const CUHK_EDGES: CuhkEdge[] = [
  { from: "fusion", to: "lsk", fee: 0, route: "walk" },
  { from: "fusion", to: "mmw", fee: 2, route: "walk" },
  { from: "fusion", to: "srrs", fee: 1, route: "walk" },
  { from: "fusion", to: "pg-halls", fee: 4, route: "walk" },
  { from: "fusion", to: "shho-mc-chungchi", fee: 1, route: "walk" },
  { from: "fusion", to: "uc", fee: 4, route: "walk" },
  { from: "fusion", to: "cw-chu", fee: 3, route: "bus-8" },
  { from: "srrs", to: "shaw", fee: 3, route: "bus-3" },
  { from: "lsk", to: "i-house-12", fee: 1, route: "walk" },
  { from: "lsk", to: "wys", fee: 2, route: "walk" },
  { from: "lsk", to: "uc", fee: 3, route: "walk" },
  { from: "lsk", to: "lws", fee: 3, route: "walk" },
  { from: "uc", to: "na", fee: 2, route: "walk" },
  { from: "uc", to: "fusion", fee: 4, route: "walk" },
  { from: "uc", to: "lsk", fee: 3, route: "walk" },
  { from: "uc", to: "lws", fee: 4, route: "bus-3-4" },
  { from: "uc", to: "wys", fee: 4, route: "bus-3-4" },
  { from: "uc", to: "cw-chu", fee: 4, route: "bus-3-4" },
  { from: "uc", to: "shaw", fee: 4, route: "bus-3-4" },
  { from: "uc", to: "i-house-12", fee: 4, route: "bus-3-4" },
  { from: "uc", to: "shho-mc-chungchi", fee: 2, route: "bus-3-4" },
  { from: "mmw", to: "i-house-345", fee: 0, route: "walk" },
  { from: "mmw", to: "na", fee: 2, route: "walk" },
  { from: "mmw", to: "shho-mc-chungchi", fee: 1, route: "walk" },
  { from: "na", to: "mmw", fee: 0, route: "walk" },
  { from: "i-house-345", to: "mmw", fee: 0, route: "walk" },
  { from: "shho-mc-chungchi", to: "mmw", fee: 0, route: "walk" },
  { from: "shho-mc-chungchi", to: "fusion", fee: 1, route: "walk" },
  { from: "shho-mc-chungchi", to: "pg-halls", fee: 3, route: "walk" },
  { from: "pg-halls", to: "shho-mc-chungchi", fee: 3, route: "walk" },
  { from: "paper-coffee", to: "fusion", fee: 4, route: "bus-3-4" },
  { from: "paper-coffee", to: "shho-mc-chungchi", fee: 0, route: "walk" },
  { from: "paper-coffee", to: "pg-halls", fee: 1, route: "walk" },
  { from: "paper-coffee", to: "uc", fee: 5, route: "bus-3-4" },
  { from: "paper-coffee", to: "na", fee: 5, route: "bus-3-4" },
  { from: "paper-coffee", to: "lws", fee: 5, route: "bus-3-4" },
  { from: "paper-coffee", to: "shaw", fee: 5, route: "bus-3-4" },
  { from: "paper-coffee", to: "wys", fee: 5, route: "bus-3-4" },
  { from: "paper-coffee", to: "cw-chu", fee: 5, route: "bus-3-4" },
  { from: "wys", to: "shaw", fee: 1, route: "walk" },
  { from: "lws", to: "i-house-12", fee: 1, route: "walk" },
  { from: "lws", to: "shaw", fee: 1, route: "walk" },
];

/**
 * Destinations that must not use the origin's ordinary walks.
 * Filtering applies only when the destination is in this list.
 */
export const BUS_ONLY: Partial<Record<CuhkNode, readonly CuhkNode[]>> = {
  fusion: ["cw-chu", "shaw"],
  "paper-coffee": ["uc", "na", "lws", "shaw", "wys", "cw-chu"],
  uc: ["lws", "wys", "cw-chu", "shaw", "i-house-12", "shho-mc-chungchi", "pg-halls"],
};

/** Walks out of the origin that stay available on a bus-only search. */
export const HUB_WALKS: Partial<Record<CuhkNode, readonly CuhkNode[]>> = {
  fusion: ["srrs"],
  "paper-coffee": [],
  uc: [],
};

export type CuhkFeeHit = {
  fee: number;
  rawFee: number;
  path: CuhkNode[];
  floored: boolean;
};

export type CuhkFeeBlocked = {
  fee: null;
  rawFee: number;
  path: CuhkNode[];
  reason: "route_too_expensive";
  floored: false;
};

const NODE_SET = new Set<string>(CUHK_NODES);

function isNode(value: string): value is CuhkNode {
  return NODE_SET.has(value);
}

/** sorazen is Fusion. Ids the shop already uses are accepted here. srrs stays a hub. */
export function resolveCuhkNode(id: string | null | undefined): CuhkNode | null {
  const raw = (id ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "sorazen") return "fusion";
  if (raw === "paper-and-coffee") return "paper-coffee";
  if (raw === "uc-canteen") return "uc";
  if (isNode(raw)) return raw;
  return null;
}

function squash(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const COLLEGE_NODE: Record<string, CuhkNode> = {
  "shaw college": "shaw",
  "united college": "uc",
  "chung chi college": "shho-mc-chungchi",
  "new asia college": "na",
  "s h ho college shho": "shho-mc-chungchi",
  "s h ho college": "shho-mc-chungchi",
  "morningside college": "shho-mc-chungchi",
  "c w chu college": "cw-chu",
  "wu yee sun college wys": "wys",
  "wu yee sun college": "wys",
  "lee woo sing college lws": "lws",
  "lee woo sing college": "lws",
  "postgraduate halls pgh": "pg-halls",
  "postgraduate halls": "pg-halls",
};

function iHouseNode(label: string): CuhkNode | null {
  const match = squash(label).match(/\bi\s*house\s*([1-5])\b/);
  if (!match) return null;
  const block = Number(match[1]);
  if (block === 1 || block === 2) return "i-house-12";
  return "i-house-345";
}

function pgHallNode(label: string): CuhkNode | null {
  const text = squash(label);
  if (text === "pgh" || text.startsWith("pgh ") || text.includes("postgraduate")) {
    return "pg-halls";
  }
  return null;
}

/** The SRRS hub is not a hall a customer can select. */
function customerNode(node: CuhkNode | null): CuhkNode | null {
  if (node === "srrs") return null;
  return node;
}

/**
 * Map a CUHK dorm onto a graph node. International House needs a block
 * number (1–2 vs 3–5). The SRRS hub and anything else unmatched stay unpriced.
 */
export function cuhkDestinationNode(
  college: string | null | undefined,
  hall: string | null | undefined,
): CuhkNode | null {
  if (resolveCuhkNode(hall) === "srrs" || resolveCuhkNode(college) === "srrs") {
    return null;
  }
  const hallNode = customerNode(resolveCuhkNode(hall));
  if (hallNode) return hallNode;
  const collegeNode = customerNode(resolveCuhkNode(college));
  if (collegeNode) return collegeNode;

  const hallLabel = hall ?? "";
  const collegeLabel = college ?? "";
  const fromHall =
    iHouseNode(hallLabel) ??
    pgHallNode(hallLabel) ??
    COLLEGE_NODE[squash(hallLabel)] ??
    null;
  if (fromHall) return customerNode(fromHall);

  if (iHouseNode(collegeLabel)) return null;
  return customerNode(
    pgHallNode(collegeLabel) ??
      COLLEGE_NODE[squash(collegeLabel)] ??
      null,
  );
}

export function cuhkOriginLabel(sourceId: string | null | undefined): string {
  const id = (sourceId ?? "").trim().toLowerCase();
  if (id === "fusion" || id === "sorazen") return id === "sorazen" ? "SoraZen" : "Fusion";
  if (id === "paper-coffee" || id === "paper-and-coffee") return "Paper & Coffee";
  if (id === "uc" || id === "uc-canteen") return "UC Canteen";
  if (id === "eben" || id === "ebeneezers" || id === "ebeneezers-5380") return "Ebeneezer's";
  if (id === "orchid-lodge") return "Orchid Lodge";
  return id || "this shop";
}

export function cuhkUnavailableMessage(origin: string, destination: string): string {
  return `We don't currently deliver from ${origin} to ${destination}. Check back soon.`;
}

/**
 * Cheapest directed path. Returns null when no path exists.
 * When the raw cost is above BLOCK_THRESHOLD, fee is null and reason is
 * route_too_expensive — that route is not charged.
 */
export function computeCuhkFee(
  origin: string,
  destination: string,
): CuhkFeeHit | CuhkFeeBlocked | null {
  const start = resolveCuhkNode(origin);
  const end = resolveCuhkNode(destination);
  if (!start || !end) return null;

  if (start === end) {
    return { fee: 0, rawFee: 0, path: [start], floored: false };
  }

  const found = cheapestPath(start, end, edgesForSearch(start, end));
  if (!found) return null;
  return settleCuhkFee(found.rawFee, found.path, false, `${start} → ${end}`);
}

/** Floor and block apply to the finished path cost, never to a single edge. */
export function settleCuhkFee(
  rawFee: number,
  path: CuhkNode[],
  sameNode: boolean,
  label = path.join(" → "),
): CuhkFeeHit | CuhkFeeBlocked {
  if (sameNode) {
    return { fee: 0, rawFee: 0, path, floored: false };
  }
  if (rawFee > BLOCK_THRESHOLD) {
    return {
      fee: null,
      rawFee,
      path,
      reason: "route_too_expensive",
      floored: false,
    };
  }
  const floored = rawFee < FEE_FLOOR;
  if (floored) {
    console.warn(
      `[delivery] CUHK fee floor raised ${label} from HK$${rawFee} to HK$${FEE_FLOOR}`,
    );
  }
  return {
    fee: floored ? FEE_FLOOR : rawFee,
    rawFee,
    path,
    floored,
  };
}

function edgesForSearch(origin: CuhkNode, destination: CuhkNode): CuhkEdge[] {
  const busOnly = BUS_ONLY[origin];
  if (!busOnly || !busOnly.includes(destination)) return CUHK_EDGES;
  const hubs = new Set<CuhkNode>(HUB_WALKS[origin] ?? []);
  return CUHK_EDGES.filter((edge) => {
    if (edge.from !== origin || edge.route !== "walk") return true;
    return hubs.has(edge.to);
  });
}

type PathState = { cost: number; hops: number };

/** True when `next` is a strictly cheaper cost, or the same cost with fewer edges. */
function isBetterPath(next: PathState, known: PathState | undefined): boolean {
  if (!known) return true;
  if (next.cost !== known.cost) return next.cost < known.cost;
  return next.hops < known.hops;
}

function cheapestPath(
  start: CuhkNode,
  end: CuhkNode,
  edges: readonly CuhkEdge[],
): { rawFee: number; path: CuhkNode[] } | null {
  const adjacency: Record<CuhkNode, { to: CuhkNode; fee: number }[]> = {
    fusion: [],
    srrs: [],
    "paper-coffee": [],
    uc: [],
    lsk: [],
    mmw: [],
    na: [],
    wys: [],
    shaw: [],
    lws: [],
    "i-house-12": [],
    "i-house-345": [],
    "pg-halls": [],
    "cw-chu": [],
    "shho-mc-chungchi": [],
  };
  for (const edge of edges) {
    adjacency[edge.from].push({ to: edge.to, fee: edge.fee });
  }

  const best = new Map<CuhkNode, PathState>();
  const prev = new Map<CuhkNode, CuhkNode>();
  const settled = new Set<CuhkNode>();
  best.set(start, { cost: 0, hops: 0 });

  while (settled.size < CUHK_NODES.length) {
    let current: CuhkNode | null = null;
    let currentBest: PathState | null = null;
    for (const node of CUHK_NODES) {
      if (settled.has(node)) continue;
      const candidate = best.get(node);
      if (!candidate || !isBetterPath(candidate, currentBest ?? undefined)) continue;
      current = node;
      currentBest = candidate;
    }
    if (!current || !currentBest) break;
    if (current === end) break;
    settled.add(current);
    for (const edge of adjacency[current]) {
      const next = { cost: currentBest.cost + edge.fee, hops: currentBest.hops + 1 };
      if (!isBetterPath(next, best.get(edge.to))) continue;
      best.set(edge.to, next);
      prev.set(edge.to, current);
    }
  }

  const rawFee = best.get(end)?.cost;
  if (rawFee == null) return null;

  const path: CuhkNode[] = [end];
  let cursor = end;
  while (cursor !== start) {
    const prior = prev.get(cursor);
    if (!prior) return null;
    path.push(prior);
    cursor = prior;
  }
  path.reverse();
  return { rawFee, path };
}
