import { describe, expect, it } from "vitest";
import { calculateTechnicalSignal } from "./technical-signals";

const series=(direction:1|-1)=>Array.from({length:80},(_,index)=>{
  const close=direction===1?100+index:200-index;
  return{date:`2026-01-${String(index+1).padStart(2,"0")}`,open:close-0.5*direction,high:close+1,low:close-1,close,volume:index===79?1600:1000};
});

describe("KinkgoX technical signal stack",()=>{
  it("detects a confirmed upward setup",()=>{
    const signal=calculateTechnicalSignal(series(1),179,"2026-09-22T12:00:00Z");
    expect(signal?.state).toBe("buy");
    expect(signal?.score).toBeGreaterThanOrEqual(45);
    expect(signal?.components).toHaveLength(4);
  });
  it("detects a confirmed downward setup",()=>{
    const signal=calculateTechnicalSignal(series(-1),121,"2026-09-22T12:00:00Z");
    expect(signal?.state).toBe("sell");
    expect(signal?.score).toBeLessThanOrEqual(-45);
  });
  it("requires enough history",()=>expect(calculateTechnicalSignal(series(1).slice(0,20),119,null)).toBeNull());
});
