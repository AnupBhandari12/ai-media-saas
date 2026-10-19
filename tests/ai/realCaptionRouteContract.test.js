import {test,expect} from "bun:test";
import {readFileSync} from "node:fs";
const route=readFileSync(new URL("../../app/api/ai/real/caption/route.js",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../../lib/ai/runRealCaption.mjs",import.meta.url),"utf8");
test("requires operator and paid approval before auth or database",()=>{expect(route.indexOf("AI_REAL_CAPTION_ENABLED")).toBeLessThan(route.indexOf("await auth()"));expect(route).toContain("AI_REAL_SPEND_APPROVED");});
test("caption only passes an authenticated Clerk user",()=>{expect(route).toContain("ownerId:userId");expect(route).toContain("isAuthenticated");});
test("provider transport runs only after atomic quota and budget",()=>{expect(workflow.indexOf("reserveAiAction(")).toBeLessThan(workflow.indexOf("requestRealCaption(") );expect(workflow).toContain("budgetMicros:AI_BUDGET_RESERVATION_MICROS.CAPTION");});
test("provider outcome or failed durable completion is never automatically retried",()=>{expect(workflow).toContain("markAiActionUnknown");expect(workflow).not.toContain("setTimeout");});
