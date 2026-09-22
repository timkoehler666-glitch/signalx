import { describe, expect, it } from "vitest";
import { classifyStock } from "./industry";

describe("stock industry classification",()=>{
  it("keeps defense companies in industry rather than technology",()=>{
    expect(classifyStock("Industrials","Aerospace & Defense")).toBe("Industrie Aktien");
  });
  it("recognizes biotechnology before general healthcare",()=>{
    expect(classifyStock("Healthcare","Biotechnology")).toBe("Biotechnologie Aktien");
  });
  it("does not invent a category for uncertain profiles",()=>{
    expect(classifyStock(null,null)).toBeNull();
    expect(classifyStock("Other","Conglomerate")).toBeNull();
  });
});
