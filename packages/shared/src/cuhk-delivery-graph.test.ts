import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeDeliveryFee, formatDeliveryQuote } from "./delivery-pricing.ts";
import { CUHK_COLLEGE_HALLS } from "./locations.ts";
import {
  BLOCK_THRESHOLD,
  CUHK_EDGES,
  CUHK_NODES,
  computeCuhkFee,
  cuhkDestinationNode,
  FEE_FLOOR,
  resolveCuhkNode,
  settleCuhkFee,
  type CuhkNode,
  type CuhkRoute,
} from "./cuhk-delivery-graph.ts";

const ROUTES = new Set<CuhkRoute>(["walk", "bus-3", "bus-3-4", "bus-8", "shuttle"]);

/**
 * Shortest paths. A few hand-table rows are cheaper on plain Dijkstra and are
 * asserted at that cheaper raw cost (the customer still pays the HK$5 floor):
 * fusion → uc raw 3 via LSK, fusion → na raw 3 via S.H. Ho, fusion → mmw raw 1
 * via S.H. Ho (the direct walk is 2), fusion → i-house-345 raw 1,
 * paper-coffee → fusion raw 1 via S.H. Ho.
 * uc → fusion is raw 3 via the S.H. Ho bus, not a tie at 4: the direct walk
 * costs 4 and the New Asia walk also costs 4, and both lose to uc → shho → fusion.
 */
const TRACES: { origin: string; dest: CuhkNode; raw: number; path: CuhkNode[] }[] = [
  { origin: "fusion", dest: "lsk", raw: 0, path: ["fusion", "lsk"] },
  { origin: "fusion", dest: "shho-mc-chungchi", raw: 1, path: ["fusion", "shho-mc-chungchi"] },
  { origin: "fusion", dest: "pg-halls", raw: 4, path: ["fusion", "pg-halls"] },
  { origin: "fusion", dest: "mmw", raw: 1, path: ["fusion", "shho-mc-chungchi", "mmw"] },
  { origin: "fusion", dest: "i-house-12", raw: 1, path: ["fusion", "lsk", "i-house-12"] },
  { origin: "fusion", dest: "wys", raw: 2, path: ["fusion", "lsk", "wys"] },
  { origin: "fusion", dest: "lws", raw: 3, path: ["fusion", "lsk", "lws"] },
  { origin: "fusion", dest: "uc", raw: 3, path: ["fusion", "lsk", "uc"] },
  { origin: "fusion", dest: "na", raw: 3, path: ["fusion", "shho-mc-chungchi", "mmw", "na"] },
  { origin: "fusion", dest: "i-house-345", raw: 1, path: ["fusion", "shho-mc-chungchi", "mmw", "i-house-345"] },
  { origin: "fusion", dest: "shaw", raw: 4, path: ["fusion", "srrs", "shaw"] },
  { origin: "fusion", dest: "cw-chu", raw: 3, path: ["fusion", "cw-chu"] },
  { origin: "uc", dest: "na", raw: 2, path: ["uc", "na"] },
  { origin: "uc", dest: "lsk", raw: 3, path: ["uc", "lsk"] },
  { origin: "uc", dest: "fusion", raw: 3, path: ["uc", "shho-mc-chungchi", "fusion"] },
  { origin: "uc", dest: "mmw", raw: 2, path: ["uc", "na", "mmw"] },
  { origin: "uc", dest: "i-house-345", raw: 2, path: ["uc", "na", "mmw", "i-house-345"] },
  { origin: "uc", dest: "lws", raw: 4, path: ["uc", "lws"] },
  { origin: "uc", dest: "wys", raw: 4, path: ["uc", "wys"] },
  { origin: "uc", dest: "cw-chu", raw: 4, path: ["uc", "cw-chu"] },
  { origin: "uc", dest: "shaw", raw: 4, path: ["uc", "shaw"] },
  { origin: "uc", dest: "i-house-12", raw: 4, path: ["uc", "i-house-12"] },
  { origin: "uc", dest: "shho-mc-chungchi", raw: 2, path: ["uc", "shho-mc-chungchi"] },
  { origin: "uc", dest: "pg-halls", raw: 5, path: ["uc", "shho-mc-chungchi", "pg-halls"] },
  { origin: "paper-coffee", dest: "shho-mc-chungchi", raw: 0, path: ["paper-coffee", "shho-mc-chungchi"] },
  { origin: "paper-coffee", dest: "pg-halls", raw: 1, path: ["paper-coffee", "pg-halls"] },
  { origin: "paper-coffee", dest: "mmw", raw: 0, path: ["paper-coffee", "shho-mc-chungchi", "mmw"] },
  { origin: "paper-coffee", dest: "i-house-345", raw: 0, path: ["paper-coffee", "shho-mc-chungchi", "mmw", "i-house-345"] },
  { origin: "paper-coffee", dest: "fusion", raw: 1, path: ["paper-coffee", "shho-mc-chungchi", "fusion"] },
  { origin: "paper-coffee", dest: "lsk", raw: 1, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "lsk"] },
  { origin: "paper-coffee", dest: "i-house-12", raw: 2, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "lsk", "i-house-12"] },
  { origin: "paper-coffee", dest: "na", raw: 5, path: ["paper-coffee", "na"] },
  { origin: "paper-coffee", dest: "uc", raw: 5, path: ["paper-coffee", "uc"] },
  { origin: "paper-coffee", dest: "lws", raw: 5, path: ["paper-coffee", "lws"] },
  { origin: "paper-coffee", dest: "shaw", raw: 5, path: ["paper-coffee", "shaw"] },
  { origin: "paper-coffee", dest: "wys", raw: 5, path: ["paper-coffee", "wys"] },
  { origin: "paper-coffee", dest: "cw-chu", raw: 5, path: ["paper-coffee", "cw-chu"] },
];

describe("CUHK delivery graph", () => {
  for (const trace of TRACES) {
    it(`${trace.origin} → ${trace.dest} raw ${trace.raw}`, () => {
      const hit = computeCuhkFee(trace.origin, trace.dest);
      assert.ok(hit, "expected a path");
      assert.equal(hit.rawFee, trace.raw);
      assert.deepEqual(hit.path, trace.path);
      if (trace.raw > BLOCK_THRESHOLD) {
        assert.equal(hit.fee, null);
        assert.equal("reason" in hit && hit.reason, "route_too_expensive");
      } else if (trace.raw === 0 && trace.origin === trace.dest) {
        assert.equal(hit.fee, 0);
      } else {
        assert.equal(hit.fee, Math.max(trace.raw, FEE_FLOOR));
        assert.equal(hit.floored, trace.raw < FEE_FLOOR);
      }
    });
  }

  it("requires a route tag on every edge", () => {
    assert.ok(CUHK_EDGES.length > 0);
    for (const edge of CUHK_EDGES) {
      assert.equal(ROUTES.has(edge.route), true, `${edge.from} → ${edge.to}`);
    }
  });

  it("prefers fewer edges when the raw cost ties (fusion → pg-halls is a tie at raw 4)", () => {
    const direct = computeCuhkFee("fusion", "pg-halls");
    assert.equal(direct?.rawFee, 4);
    assert.deepEqual(direct?.path, ["fusion", "pg-halls"]);
    assert.equal(direct?.path.length, 2);
  });

  it("keeps the SRRS hub walk for Fusion to Shaw and does not walk LSK", () => {
    const hit = computeCuhkFee("fusion", "shaw");
    assert.equal(hit?.rawFee, 4);
    assert.deepEqual(hit?.path, ["fusion", "srrs", "shaw"]);
    assert.equal(hit?.fee, FEE_FLOOR);
  });

  it("reaches C.W. Chu from Fusion on the direct bus-8", () => {
    const hit = computeCuhkFee("fusion", "cw-chu");
    assert.equal(hit?.rawFee, 3);
    assert.deepEqual(hit?.path, ["fusion", "cw-chu"]);
  });

  it("stops Paper & Coffee from using the free S.H. Ho shortcut on a bus trip", () => {
    const hit = computeCuhkFee("paper-coffee", "na");
    assert.equal(hit?.rawFee, 5);
    assert.deepEqual(hit?.path, ["paper-coffee", "na"]);
    assert.equal(hit?.fee, 5);
  });

  it("prices UC to postgraduate halls on the bus through S.H. Ho, not via Fusion", () => {
    const hit = computeCuhkFee("uc", "pg-halls");
    assert.equal(hit?.rawFee, 5);
    assert.deepEqual(hit?.path, ["uc", "shho-mc-chungchi", "pg-halls"]);
    assert.equal(hit?.fee, 5);
  });

  it("prices sorazen as fusion", () => {
    for (const dest of CUHK_NODES) {
      if (dest === "fusion") continue;
      assert.deepEqual(computeCuhkFee("sorazen", dest), computeCuhkFee("fusion", dest));
    }
  });

  it("charges 0 for the same building and does not apply the floor", () => {
    for (const node of CUHK_NODES) {
      const hit = computeCuhkFee(node, node);
      assert.deepEqual(hit, { fee: 0, rawFee: 0, path: [node], floored: false });
    }
    const alias = computeCuhkFee("sorazen", "fusion");
    assert.deepEqual(alias, { fee: 0, rawFee: 0, path: ["fusion"], floored: false });
    const uc = computeCuhkFee("uc-canteen", "uc");
    assert.equal(uc?.fee, 0);
  });

  it("floors every positive raw fee under 5 and leaves the raw cost visible", () => {
    const raised = TRACES.filter((trace) => trace.raw > 0 && trace.raw < FEE_FLOOR);
    assert.ok(raised.length > 0);
    for (const trace of raised) {
      const hit = computeCuhkFee(trace.origin, trace.dest);
      assert.equal(hit?.fee, FEE_FLOOR);
      assert.equal(hit?.rawFee, trace.raw);
      assert.equal(hit && "floored" in hit && hit.floored, true);
    }
  });

  it("blocks a raw cost above 12 instead of charging it", () => {
    const blocked = settleCuhkFee(13, ["fusion", "cw-chu"], false);
    assert.equal(blocked.fee, null);
    assert.equal(blocked.rawFee, 13);
    assert.equal(blocked.reason, "route_too_expensive");
    const charged = settleCuhkFee(12, ["fusion", "cw-chu"], false);
    assert.equal(charged.fee, 12);
  });

  it("maps halls onto nodes and leaves an unknown hall unmapped", () => {
    assert.equal(cuhkDestinationNode("United College", "Adam Schall"), "uc");
    assert.equal(cuhkDestinationNode("Shaw College", "Kuo Mou Hall"), "shaw");
    assert.equal(cuhkDestinationNode("International House (I-House)", "I-House 1"), "i-house-12");
    assert.equal(cuhkDestinationNode("International House (I-House)", "I-House 5"), "i-house-345");
    assert.equal(cuhkDestinationNode("Postgraduate Halls (PGH)", "PGH 3"), "pg-halls");
    assert.equal(cuhkDestinationNode("Chung Chi College", "Ming Hua"), "shho-mc-chungchi");
    assert.equal(cuhkDestinationNode("Campus Facilities", "University Library"), "lsk");
  });

  it("prices University Library as the LSK stop", () => {
    assert.equal(resolveCuhkNode("University Library"), "lsk");
    assert.equal(resolveCuhkNode("university library"), "lsk");
    assert.equal(resolveCuhkNode("university-library"), "lsk");
    assert.equal(cuhkDestinationNode("Campus Facilities", "university-library"), "lsk");
    assert.equal(resolveCuhkNode("Campus Facilities"), null);
    assert.equal(cuhkDestinationNode("Campus Facilities", undefined), null);
    assert.equal(cuhkDestinationNode("Campus Facilities", ""), null);
    assert.equal(cuhkDestinationNode(undefined, "Campus Facilities"), null);
    assert.equal(
      cuhkDestinationNode("International House (I-House)", "I-House 1"),
      "i-house-12",
    );
    assert.equal(
      cuhkDestinationNode("International House (I-House)", "I-House 5"),
      "i-house-345",
    );

    for (const origin of ["fusion", "uc", "paper-coffee"]) {
      const library = computeCuhkFee(origin, "University Library");
      const lsk = computeCuhkFee(origin, "lsk");
      assert.deepEqual(library, lsk);
      assert.equal(library?.fee, lsk?.fee);
      assert.deepEqual(library?.path, lsk?.path);
    }

    const sameStop = computeCuhkFee("lsk", "University Library");
    assert.deepEqual(sameStop, { fee: 0, rawFee: 0, path: ["lsk"], floored: false });

    const quote = computeDeliveryFee({
      campus: "cuhk",
      sourceId: "fusion",
      college: "Campus Facilities",
      hallId: "University Library",
    });
    const lskQuote = computeDeliveryFee({
      campus: "cuhk",
      sourceId: "fusion",
      hallId: "lsk",
    });
    assert.equal(quote.available, true);
    assert.equal(quote.deliveryDestination, "lsk");
    assert.equal(quote.total, lskQuote.total);
    assert.deepEqual(quote.deliveryPath, lskQuote.deliveryPath);
    assert.equal(formatDeliveryQuote(quote), `Delivery: HK$${quote.total}`);
    assert.equal(formatDeliveryQuote(quote).includes("fusion"), false);
  });

  it("rejects the SRRS hub as a customer destination and keeps it out of the hall picker", () => {
    assert.equal(resolveCuhkNode("srrs"), "srrs");
    assert.equal(cuhkDestinationNode("srrs", "srrs"), null);
    assert.equal(cuhkDestinationNode("Shaw College", "srrs"), null);
    assert.equal(cuhkDestinationNode("srrs", "Kuo Mou Hall"), null);
    const labels = Object.entries(CUHK_COLLEGE_HALLS).flatMap(([college, halls]) => [
      college,
      ...halls,
    ]);
    assert.equal(
      labels.some((label) => label.toLowerCase().includes("srrs")),
      false,
    );
    const quote = computeDeliveryFee({
      campus: "cuhk",
      sourceId: "fusion",
      college: "srrs",
      hallId: "srrs",
    });
    assert.equal(quote.available, false);
    assert.equal(quote.deliveryDestination, undefined);
    assert.notEqual(quote.total, computeCuhkFee("fusion", "srrs")?.fee);
  });

  it("keeps CityU hall tiers off the CUHK graph", () => {
    const quote = computeDeliveryFee({
      campus: "cityu",
      sourceId: "wellcome",
      hallId: "cityu-10",
    });
    assert.equal(quote.pricing, "cityu-tier");
    assert.equal(quote.total, 23);
    assert.equal(quote.deliveryPath, undefined);
  });

  it("charges a UC customer ordering from Paper & Coffee the direct bus fee", () => {
    const quote = computeDeliveryFee({
      campus: "cuhk",
      sourceId: "paper-and-coffee",
      college: "United College",
      hallId: "Adam Schall",
    });
    assert.equal(quote.available, true);
    assert.equal(quote.deliveryOrigin, "paper-coffee");
    assert.equal(quote.deliveryDestination, "uc");
    assert.equal(quote.deliveryFeeRaw, 5);
    assert.deepEqual(quote.deliveryPath, ["paper-coffee", "uc"]);
    assert.equal(quote.total, 5);
  });
});
