import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { runAiCaptionWorkflow } from "../../lib/ai/aiCaptionWorkflow.mjs";

const OWNER = "user_caption_test";
const UUID = "550e8400-e29b-41d4-a716-446655440000";
const NOW = new Date("2026-10-19T09:00:00.000Z");
const DESCRIPTION = "Sunrise over a quiet mountain lake";

function fakeDb({ monthlyUsed = 0, dailyUsed = 0, failLedger = false } = {}) {
  const state = {
    buckets: {
      MONTH: { id: "month-1", used: monthlyUsed, limitValue: 20 },
      DAY: { id: "day-1", used: dailyUsed, limitValue: 3 },
    },
    actions: [],
    ledger: [],
  };

  const matches = (item, where) =>
    item.id === where.id && item.ownerId === where.ownerId &&
    (where.status === undefined || item.status === where.status) &&
    (where.quotaCounted === undefined || item.quotaCounted === where.quotaCounted);

  function actionApi(data) {
    return {
      async findUnique({ where }) {
        const key = where.ownerId_idempotencyKey;
        return data.actions.find((a) => a.ownerId === key.ownerId && a.idempotencyKey === key.idempotencyKey) ?? null;
      },
      async findFirst({ where }) {
        return data.actions.find((a) => matches(a, where)) ?? null;
      },
      async create({ data: values }) {
        const created = { ...values, id: `ai_${data.actions.length + 1}` };
        data.actions.push(created);
        return created;
      },
      async updateMany({ where, data: values }) {
        const action = data.actions.find((a) => matches(a, where));
        if (!action) return { count: 0 };
        Object.assign(action, values);
        return { count: 1 };
      },
    };
  }

  function transactionApi(data) {
    return {
      aiActionRequest: actionApi(data),
      async $executeRaw() { return 1; },
      aiQuotaBucket: {
        async findUnique({ where }) {
          const key = where.ownerId_quotaKey_period_periodStart;
          return data.buckets[key.period];
        },
        async updateMany({ where, data: values }) {
          const period = where.period ?? (where.id === "month-1" ? "MONTH" : "DAY");
          const bucket = data.buckets[period];
          if (!bucket || bucket.used < 0) return { count: 0 };
          if (where.used?.lt != null && bucket.used >= where.used.lt) return { count: 0 };
          if (where.used?.gt != null && bucket.used <= where.used.gt) return { count: 0 };
          if (values.used?.increment) bucket.used += values.used.increment;
          if (values.used?.decrement) bucket.used -= values.used.decrement;
          return { count: 1 };
        },
      },
      usageEvent: {
        async create({ data: record }) {
          if (failLedger) throw new Error("SIMULATED_LEDGER_ERROR");
          if (data.ledger.some((e) => e.aiActionRequestId === record.aiActionRequestId)) {
            throw new Error("DUPLICATE_LEDGER");
          }
          data.ledger.push(record);
          return record;
        },
      },
    };
  }

  return {
    state,
    aiActionRequest: actionApi(state),
    async $transaction(callback) {
      const pending = structuredClone(state);
      const result = await callback(transactionApi(pending));
      state.buckets = pending.buckets;
      state.actions = pending.actions;
      state.ledger = pending.ledger;
      return result;
    },
  };
}

function providerSuccess() {
  return {
    status: "SUCCESS", action: "CAPTION", provider: "openai",
    model: "gpt-6-luna", text: "A golden sunrise over still waters.",
    usage: { inputTokens: 1000, outputTokens: 200 },
  };
}

function args(prisma, extras = {}) {
  return {
    prisma, ownerId: OWNER, idempotencyKey: UUID,
    description: DESCRIPTION, now: NOW,
    enabled: true, providerFn: async () => providerSuccess(),
    ...extras,
  };
}

describe("Phase 21 server-only caption lifecycle", () => {
  test("disabled by default, without touching DB or provider", async () => {
    let called = 0;
    const result = await runAiCaptionWorkflow({
      providerFn: async () => { called++; },
    });
    assert.equal(result.outcome, "DISABLED");
    assert.equal(called, 0);
  });

  test("successful caption gets one ledger entry, token cost, and generated label", async () => {
    const db = fakeDb();
    const result = await runAiCaptionWorkflow(args(db));
    assert.equal(result.outcome, "COMPLETED");
    assert.equal(result.estimatedCostUsd, 0.0002);
    assert.equal(result.generated, true);
    assert.equal(db.state.ledger.length, 1);
    assert.equal(db.state.buckets.DAY.used, 1);
    assert.equal(db.state.buckets.MONTH.used, 1);
    assert.equal(db.state.actions[0].status, "COMPLETED");
  });

  test("same UUID returns existing without a second provider call", async () => {
    const db = fakeDb();
    let calls = 0;
    const providerFn = async () => { calls++; return providerSuccess(); };
    await runAiCaptionWorkflow(args(db, { providerFn }));
    const again = await runAiCaptionWorkflow(args(db, { providerFn }));
    assert.equal(again.outcome, "EXISTING");
    assert.equal(again.status, "COMPLETED");
    assert.equal(calls, 1);
    assert.equal(db.state.ledger.length, 1);
  });

  test("exhausted daily quota rejects before provider dispatch", async () => {
    const db = fakeDb({ dailyUsed: 3 });
    let calls = 0;
    const result = await runAiCaptionWorkflow(args(db, {
      providerFn: async () => { calls++; return providerSuccess(); },
    }));
    assert.equal(result.outcome, "QUOTA_EXCEEDED");
    assert.equal(result.period, "DAY");
    assert.equal(calls, 0);
    assert.equal(db.state.actions.length, 0);
  });

  test("same UUID with different input never invokes provider again", async () => {
    const db = fakeDb();
    await runAiCaptionWorkflow(args(db));
    let calls = 0;
    await assert.rejects(
      () => runAiCaptionWorkflow(args(db, {
        description: "Different photo entirely",
        providerFn: async () => { calls++; return providerSuccess(); },
      })),
      /AI_IDEMPOTENCY_CONFLICT/,
    );
    assert.equal(calls, 0);
    assert.equal(db.state.ledger.length, 1);
  });

  test("provider timeout becomes UNKNOWN, and same UUID cannot retry", async () => {
    const db = fakeDb();
    let calls = 0;
    const failing = async () => { calls++; throw new Error("NETWORK_TIMEOUT"); };
    const result = await runAiCaptionWorkflow(args(db, { providerFn: failing }));
    assert.equal(result.outcome, "UNKNOWN");
    const retried = await runAiCaptionWorkflow(args(db, { providerFn: failing }));
    assert.equal(retried.outcome, "EXISTING");
    assert.equal(retried.status, "UNKNOWN");
    assert.equal(calls, 1);
    assert.equal(db.state.buckets.DAY.used, 1);
    assert.equal(db.state.ledger.length, 0);
  });

  test("invalid usage is UNKNOWN, never falsely a free completion", async () => {
    const db = fakeDb();
    const invalid = async () => ({ ...providerSuccess(), usage: { inputTokens: 0, outputTokens: 2 } });
    const result = await runAiCaptionWorkflow(args(db, { providerFn: invalid }));
    assert.equal(result.outcome, "UNKNOWN");
    assert.equal(db.state.actions[0].status, "UNKNOWN");
    assert.equal(db.state.ledger.length, 0);
  });

  test("ledger failure keeps quota and requires reconciliation", async () => {
    const db = fakeDb({ failLedger: true });
    const result = await runAiCaptionWorkflow(args(db));
    assert.equal(result.outcome, "UNKNOWN");
    assert.equal(db.state.ledger.length, 0);
    assert.equal(db.state.actions[0].status, "UNKNOWN");
    assert.equal(db.state.buckets.MONTH.used, 1);
  });

  test("missing server-side provider is blocked before reservation", async () => {
    const db = fakeDb();
    await assert.rejects(
      () => runAiCaptionWorkflow(args(db, { providerFn: undefined })),
      /AI caption provider is not configured/,
    );
    assert.equal(db.state.actions.length, 0);
  });
});
