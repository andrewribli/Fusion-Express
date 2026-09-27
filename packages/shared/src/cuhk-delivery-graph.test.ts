import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeDeliveryFee } from "./delivery-pricing.ts";
import {
  BLOCK_THRESHOLD,
  CUHK_NODES,
  computeCuhkFee,
  cuhkDestinationNode,
  FEE_FLOOR,
  settleCuhkFee,
  type CuhkNode,
} from "./cuhk-delivery-graph.ts";

const TRACES: { origin: string; dest: CuhkNode; raw: number; path: CuhkNode[] }[] = [
  { origin: "fusion", dest: "shaw", raw: 3, path: ["fusion", "lsk", "wys", "shaw"] },
  { origin: "fusion", dest: "i-house-345", raw: 1, path: ["fusion", "shho-mc-chungchi", "mmw", "i-house-345"] },
  { origin: "fusion", dest: "na", raw: 3, path: ["fusion", "shho-mc-chungchi", "mmw", "na"] },
  { origin: "fusion", dest: "lws", raw: 3, path: ["fusion", "lsk", "lws"] },
  { origin: "fusion", dest: "i-house-12", raw: 1, path: ["fusion", "lsk", "i-house-12"] },
  { origin: "fusion", dest: "wys", raw: 2, path: ["fusion", "lsk", "wys"] },
  { origin: "fusion", dest: "cw-chu", raw: 3, path: ["fusion", "cw-chu"] },
  { origin: "fusion", dest: "pg-halls", raw: 3, path: ["fusion", "shho-mc-chungchi", "pg-halls"] },
  { origin: "fusion", dest: "shho-mc-chungchi", raw: 1, path: ["fusion", "shho-mc-chungchi"] },
  { origin: "fusion", dest: "uc", raw: 3, path: ["fusion", "lsk", "uc"] },
  { origin: "uc", dest: "na", raw: 2, path: ["uc", "na"] },
  { origin: "uc", dest: "lsk", raw: 3, path: ["uc", "lsk"] },
  { origin: "uc", dest: "mmw", raw: 2, path: ["uc", "na", "mmw"] },
  { origin: "uc", dest: "i-house-345", raw: 2, path: ["uc", "na", "mmw", "i-house-345"] },
  { origin: "uc", dest: "shaw", raw: 6, path: ["uc", "lsk", "wys", "shaw"] },
  { origin: "uc", dest: "lws", raw: 6, path: ["uc", "lsk", "lws"] },
  { origin: "uc", dest: "i-house-12", raw: 4, path: ["uc", "lsk", "i-house-12"] },
  { origin: "uc", dest: "wys", raw: 5, path: ["uc", "lsk", "wys"] },
  { origin: "uc", dest: "fusion", raw: 4, path: ["uc", "fusion"] },
  { origin: "uc", dest: "pg-halls", raw: 5, path: ["uc", "na", "mmw", "shho-mc-chungchi", "pg-halls"] },
  { origin: "uc", dest: "shho-mc-chungchi", raw: 3, path: ["uc", "na", "mmw", "shho-mc-chungchi"] },
  { origin: "uc", dest: "cw-chu", raw: 7, path: ["uc", "fusion", "cw-chu"] },
  { origin: "paper-coffee", dest: "shho-mc-chungchi", raw: 0, path: ["paper-coffee", "shho-mc-chungchi"] },
  { origin: "paper-coffee", dest: "pg-halls", raw: 1, path: ["paper-coffee", "pg-halls"] },
  { origin: "paper-coffee", dest: "mmw", raw: 0, path: ["paper-coffee", "shho-mc-chungchi", "mmw"] },
  { origin: "paper-coffee", dest: "i-house-345", raw: 0, path: ["paper-coffee", "shho-mc-chungchi", "mmw", "i-house-345"] },
  { origin: "paper-coffee", dest: "na", raw: 2, path: ["paper-coffee", "shho-mc-chungchi", "mmw", "na"] },
  { origin: "paper-coffee", dest: "fusion", raw: 1, path: ["paper-coffee", "shho-mc-chungchi", "fusion"] },
  { origin: "paper-coffee", dest: "lsk", raw: 1, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "lsk"] },
  { origin: "paper-coffee", dest: "i-house-12", raw: 2, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "lsk", "i-house-12"] },
  { origin: "paper-coffee", dest: "wys", raw: 3, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "lsk", "wys"] },
  { origin: "paper-coffee", dest: "shaw", raw: 4, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "lsk", "wys", "shaw"] },
  { origin: "paper-coffee", dest: "uc", raw: 4, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "lsk", "uc"] },
  { origin: "paper-coffee", dest: "lws", raw: 4, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "lsk", "lws"] },
  { origin: "paper-coffee", dest: "cw-chu", raw: 4, path: ["paper-coffee", "shho-mc-chungchi", "fusion", "cw-chu"] },
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
    assert.equal(cuhkDestinationNode("Campus Facilities", "University Library"), null);
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

  it("charges a UC customer ordering from Paper & Coffee the floored path fee", () => {
    const quote = computeDeliveryFee({
      campus: "cuhk",
      sourceId: "paper-and-coffee",
      college: "United College",
      hallId: "Adam Schall",
    });
    assert.equal(quote.available, true);
    assert.equal(quote.deliveryOrigin, "paper-coffee");
    assert.equal(quote.deliveryDestination, "uc");
    assert.equal(quote.deliveryFeeRaw, 4);
    assert.deepEqual(quote.deliveryPath, [
      "paper-coffee",
      "shho-mc-chungchi",
      "fusion",
      "lsk",
      "uc",
    ]);
    assert.equal(quote.total, FEE_FLOOR);
  });
});
