import {test, expect} from "bun:test";
import {reserveAiAction} from "../../lib/ai/aiQuotaReservation.mjs";
const identity={ownerId:"clerk_user_x",idempotencyKey:"550e8400-e29b-41d4-a716-446655440000",inputHash:"a".repeat(64),action:"CAPTION",quotaDayStart:new Date("2026-10-19T00:00:00Z"),quotaMonthStart:new Date("2026-10-01T00:00:00Z")};
function fake(budgetSql=1, existing=null){let calls=0,spends=0,created=0; const tx={
  $executeRaw:async()=>{calls++;return calls===3?budgetSql:1;},
  aiActionRequest:{findUnique:async()=>existing,create:async()=>{created++;return{id:"job_1",status:"RESERVED"};}},
  aiQuotaBucket:{findUnique:async({where})=>({id:where.ownerId_quotaKey_period_periodStart.period, used:0,limitValue:20}),updateMany:async()=>({count:1})},
  aiSpendReservation:{create:async()=>{spends++;}}
};return {prisma:{$transaction:async(cb)=>cb(tx)},result:()=>({calls,spends,created})};}
test("paid caption reserves database budget and stores durable job proof",async()=>{const x=fake();const r=await reserveAiAction({prisma:x.prisma,identity,budgetMicros:1000});expect(r.outcome).toBe("RESERVED");expect(x.result().spends).toBe(1);});
test("global budget exhausted blocks before any quota or job updates",async()=>{const x=fake(0);const r=await reserveAiAction({prisma:x.prisma,identity,budgetMicros:1000});expect(r.outcome).toBe("SPEND_BUDGET_BLOCKED");expect(x.result().created).toBe(0);});
test("paid amount is not user-controlled",async()=>{const x=fake();await expect(reserveAiAction({prisma:x.prisma,identity,budgetMicros:1})).rejects.toThrow("AI_SPEND_BUDGET_POLICY_DENIED");});
test("existing request reuses idempotency and never budgets again",async()=>{const x=fake(1,{id:"old",status:"UNKNOWN",action:"CAPTION",inputHash:identity.inputHash});const r=await reserveAiAction({prisma:x.prisma,identity,budgetMicros:1000});expect(r.outcome).toBe("EXISTING");expect(x.result().spends).toBe(0);});
