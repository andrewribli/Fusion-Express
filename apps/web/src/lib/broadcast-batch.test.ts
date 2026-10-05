import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BROADCAST_BATCH_SIZE,
  broadcastConfirmMessage,
  chunkEmails,
} from "./broadcast-batch";

describe("chunkEmails", () => {
  it("dedupes and chunks at Resend batch size", () => {
    const emails = Array.from({ length: 250 }, (_, i) => `u${i}@link.cuhk.edu.hk`);
    emails.push("u0@link.cuhk.edu.hk");
    const chunks = chunkEmails(emails);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0]!.length, BROADCAST_BATCH_SIZE);
    assert.equal(chunks[1]!.length, BROADCAST_BATCH_SIZE);
    assert.equal(chunks[2]!.length, 50);
    assert.equal(chunks.flat().length, 250);
  });
});

describe("broadcastConfirmMessage", () => {
  it("asks for confirmation with the real count", () => {
    assert.equal(broadcastConfirmMessage(25), "This will send to 25 users. Continue?");
    assert.equal(broadcastConfirmMessage(1), "This will send to 1 user. Continue?");
  });
});
