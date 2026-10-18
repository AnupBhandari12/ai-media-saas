import{describe,expect,test}from"bun:test";
import{getToolById,getToolsByCategory,TOOL_STATUS}from"../../lib/tools/registry.js";
describe("Phase20 utility catalog",()=>{
 test("six local utility tools searchable and marked available after final gate",()=>{
  const ids=["UTL-01","UTL-03","UTL-04","UTL-05","UTL-06","UTL-08"];
  expect(getToolsByCategory("UTILITY")).toHaveLength(6);
  for(const id of ids){const t=getToolById(id);expect(t?.status).toBe(TOOL_STATUS.AVAILABLE);expect(t.route.startsWith("/tools/utility/")).toBe(true);}
 });
 test("planned later utilities not silently enabled",()=>{expect(getToolById("UTL-02")).toBeUndefined();expect(getToolById("UTL-07")).toBeUndefined();});
});
