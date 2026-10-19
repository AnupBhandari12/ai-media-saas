import { describe, expect, test } from "bun:test";
import {
  completeAiAction,
  markAiActionUnknown,
  releaseUnsentAiAction,
  startAiAction,
} from "../../lib/ai/aiActionAccounting.mjs";

const OWNER = "user_06c";
const REQUEST = "request_06c";
const DAY = new Date("2026-10-19T00:00:00.000Z");
const MONTH = new Date("2026-10-01T00:00:00.000Z");
const NOW = new Date("2026-10-19T10:00:00.000Z");

function fakeDatabase({ status = "RESERVED", failLedger = false, failDayRelease = false } = {}) {
  const state = {
    action: {
      id: REQUEST,
      ownerId: OWNER,
      action: "CAPTION",
      status,
      quotaCounted: true,
      quotaDayStart: DAY,
      quotaMonthStart: MONTH,
    },
    buckets: { MONTH: 1, DAY: 1 },
    events: [],
  };

  function matches(action, where) {
    return action.id === where.id && action.ownerId === where.ownerId &&
      (!where.status || action.status === where.status) &&
      (where.quotaCounted === undefined || action.quotaCounted === where.quotaCounted);
  }

  function actionMethods(snapshot) {
    return {
      findFirst: async ({ where }) =>
        matches(snapshot.action, where) ? structuredClone(snapshot.action) : null,
      updateMany: async ({ where, data }) => {
        if (!matches(snapshot.action, where)) return { count: 0 };
        Object.assign(snapshot.action, structuredClone(data));
        return { count: 1 };
      },
    };
  }

  return {
    state,
    aiActionRequest: actionMethods(state),
    $transaction: async (callback) => {
      const pending = structuredClone(state);
      const tx = {
        aiActionRequest: actionMethods(pending),
        $executeRaw: async () => pending.buckets.MONTH > 0 ? 1 : 0,
        aiQuotaBucket: {
          updateMany: async ({ where, data }) => {
            if (where.ownerId !== OWNER || where.quotaKey !== "AI_ACTION") {
              return { count: 0 };
            }
            if (failDayRelease && where.period === "DAY") return { count: 0 };
            if (pending.buckets[where.period] <= 0) return { count: 0 };
            pending.buckets[where.period] -= data.used.decrement;
            return { count: 1 };
          },
        },
        usageEvent: {
          create: async ({ data }) => {
            if (failLedger) throw new Error("SIMULATED_LEDGER_FAILURE");
            if (pending.events.some(e => e.aiActionRequestId === data.aiActionRequestId)) {
              throw new Error("DUPLICATE_LEDGER");
            }
            pending.events.push(structuredClone(data));
          },
        },
      };
      const result = await callback(tx);
      // Simulate transactional commit ONLY after a successful callback.
      state.action = pending.action;
      state.buckets = pending.buckets;
      state.events = pending.events;
      return result;
    },
  };
}

const completeArgs = {
  ownerId: OWNER,
  requestId: REQUEST,
  text: "An inspiring mountain caption",
  model: "gpt-6-luna",
  inputTokens: 1000,
  outputTokens: 200,
  now: NOW,
};

describe("Phase 21 AI action accounting", () => {
  test("claims a reserved request exactly once", async () => {
    const prisma = fakeDatabase();
    const first = await startAiAction({ prisma, ownerId: OWNER, requestId: REQUEST, now: NOW });
    const second = await startAiAction({ prisma, ownerId: OWNER, requestId: REQUEST, now: NOW });
    expect(first.outcome).toBe("STARTED");
    expect(second.outcome).toBe("NOT_STARTABLE");
    expect(prisma.state.action.status).toBe("PROCESSING");
  });

  test("does not start another user's request", async () => {
    const prisma = fakeDatabase();
    const result = await startAiAction({ prisma, ownerId: "another_user", requestId: REQUEST });
    expect(result.outcome).toBe("NOT_STARTABLE");
    expect(prisma.state.action.status).toBe("RESERVED");
  });

  test("completes with one ledger event and estimated cost", async () => {
    const prisma = fakeDatabase({ status: "PROCESSING" });
    const result = await completeAiAction({ prisma, ...completeArgs });
    expect(result.outcome).toBe("COMPLETED");
    expect(result.estimatedCostUsd).toBe(0.0002);
    expect(prisma.state.action.status).toBe("COMPLETED");
    expect(prisma.state.events).toHaveLength(1);
    expect(prisma.state.events[0].aiActionRequestId).toBe(REQUEST);
    expect(prisma.state.buckets).toEqual({ MONTH: 1, DAY: 1 });
  });

  test("repeat completion never creates a second ledger event", async () => {
    const prisma = fakeDatabase({ status: "PROCESSING" });
    await completeAiAction({ prisma, ...completeArgs });
    const again = await completeAiAction({ prisma, ...completeArgs });
    expect(again.outcome).toBe("ALREADY_COMPLETED");
    expect(prisma.state.events).toHaveLength(1);
  });

  test("releases an unsent reservation from both original periods", async () => {
    const prisma = fakeDatabase();
    const result = await releaseUnsentAiAction({ prisma, ownerId: OWNER, requestId: REQUEST, now: NOW });
    expect(result.outcome).toBe("RELEASED");
    expect(prisma.state.action.status).toBe("FAILED");
    expect(prisma.state.action.quotaCounted).toBe(false);
    expect(prisma.state.buckets).toEqual({ MONTH: 0, DAY: 0 });
    expect(prisma.state.events).toHaveLength(0);
  });

  test("repeat release never decrements counters twice", async () => {
    const prisma = fakeDatabase();
    await releaseUnsentAiAction({ prisma, ownerId: OWNER, requestId: REQUEST });
    const again = await releaseUnsentAiAction({ prisma, ownerId: OWNER, requestId: REQUEST });
    expect(again.outcome).toBe("NOT_RELEASABLE");
    expect(prisma.state.buckets).toEqual({ MONTH: 0, DAY: 0 });
  });

  test("cannot refund a processing request", async () => {
    const prisma = fakeDatabase({ status: "PROCESSING" });
    const result = await releaseUnsentAiAction({ prisma, ownerId: OWNER, requestId: REQUEST });
    expect(result.outcome).toBe("NOT_RELEASABLE");
    expect(prisma.state.buckets).toEqual({ MONTH: 1, DAY: 1 });
  });

  test("unknown provider outcome keeps quota and blocks auto-retry", async () => {
    const prisma = fakeDatabase({ status: "PROCESSING" });
    const first = await markAiActionUnknown({ prisma, ownerId: OWNER, requestId: REQUEST });
    const second = await markAiActionUnknown({ prisma, ownerId: OWNER, requestId: REQUEST });
    expect(first.outcome).toBe("UNKNOWN");
    expect(second.outcome).toBe("UNCHANGED");
    expect(prisma.state.action.status).toBe("UNKNOWN");
    expect(prisma.state.buckets).toEqual({ MONTH: 1, DAY: 1 });
  });

  test("a ledger insert error rolls back successful completion", async () => {
    const prisma = fakeDatabase({ status: "PROCESSING", failLedger: true });
    await expect(completeAiAction({ prisma, ...completeArgs })).rejects.toThrow("SIMULATED_LEDGER_FAILURE");
    expect(prisma.state.action.status).toBe("PROCESSING");
    expect(prisma.state.events).toHaveLength(0);
  });

  test("failure to release daily bucket rolls back monthly release and status", async () => {
    const prisma = fakeDatabase({ failDayRelease: true });
    await expect(releaseUnsentAiAction({ prisma, ownerId: OWNER, requestId: REQUEST })).rejects.toThrow("AI DAY quota release failed.");
    expect(prisma.state.action.status).toBe("RESERVED");
    expect(prisma.state.action.quotaCounted).toBe(true);
    expect(prisma.state.buckets).toEqual({ MONTH: 1, DAY: 1 });
  });

  test("requires real token usage rather than defaulting to free", async () => {
    const prisma = fakeDatabase({ status: "PROCESSING" });
    await expect(completeAiAction({ prisma, ...completeArgs, inputTokens: 0 })).rejects.toThrow("Provider input token usage is required.");
    expect(prisma.state.action.status).toBe("PROCESSING");
  });

  test("never completes an action which was released", async () => {
    const prisma = fakeDatabase();
    await releaseUnsentAiAction({ prisma, ownerId: OWNER, requestId: REQUEST });
    const result = await completeAiAction({ prisma, ...completeArgs });
    expect(result.outcome).toBe("NOT_COMPLETABLE");
    expect(prisma.state.events).toHaveLength(0);
  });
});
