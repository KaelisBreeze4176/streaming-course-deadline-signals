import assert from "node:assert/strict";
import test from "node:test";
import { decideDeadline } from "../src/deadline_policy.js";

test("flags a learner for educator attention inside the two-day window", () => {
  const now = new Date("2026-09-07T09:00:00.000Z");
  const deadline = new Date("2026-09-09T09:00:00.000Z");

  assert.deepEqual(decideDeadline(deadline, now), {
    status: "due_soon",
    educatorAttention: true,
    learnerInstruction: "Prioritize the next required action and keep the explanation concise.",
  });
});

test("keeps an on-track learner out of the attention report", () => {
  const now = new Date("2026-09-07T09:00:00.000Z");
  const deadline = new Date("2026-09-12T09:00:00.000Z");

  assert.equal(decideDeadline(deadline, now).educatorAttention, false);
});
