import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hongKongHour, hongKongMinutes, isServiceOpen } from "./constants";

describe("Fusion SERVICE_HOURS (Asia/Hong_Kong)", () => {
  it("is closed just before 8:00pm", () => {
    const at = new Date("2026-10-01T19:59:00+08:00");
    assert.equal(hongKongHour(at), 19);
    assert.equal(hongKongMinutes(at), 19 * 60 + 59);
    assert.equal(isServiceOpen(at), false);
  });

  it("opens at 8:00pm inclusive", () => {
    const at = new Date("2026-10-01T20:00:00+08:00");
    assert.equal(hongKongHour(at), 20);
    assert.equal(isServiceOpen(at), true);
  });

  it("stays open through late evening and midnight", () => {
    assert.equal(isServiceOpen(new Date("2026-10-01T23:59:00+08:00")), true);
    assert.equal(isServiceOpen(new Date("2026-10-02T00:00:00+08:00")), true);
    assert.equal(isServiceOpen(new Date("2026-10-02T00:59:00+08:00")), true);
  });

  it("closes at 1:00am exclusive", () => {
    assert.equal(isServiceOpen(new Date("2026-10-02T01:00:00+08:00")), false);
    assert.equal(isServiceOpen(new Date("2026-10-02T01:15:00+08:00")), false);
    assert.equal(isServiceOpen(new Date("2026-10-02T13:00:00+08:00")), false);
  });

  it("uses Hong Kong wall time even when the runtime TZ is UTC", () => {
    // 12:30 UTC = 20:30 HKT — must be open.
    assert.equal(isServiceOpen(new Date("2026-10-01T12:30:00Z")), true);
    // 17:15 UTC = 01:15 HKT — must be closed.
    assert.equal(isServiceOpen(new Date("2026-10-01T17:15:00Z")), false);
  });
});
