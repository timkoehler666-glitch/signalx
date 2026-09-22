import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketSnapshot } from "./market-types";

vi.mock("./yahoo", () => ({ fetchYahooMarketSnapshot: vi.fn() }));
vi.mock("./twelve-data", () => ({ fetchTwelveMarketSnapshot: vi.fn() }));

import { fetchMarketSnapshot } from "./market";
import { fetchTwelveMarketSnapshot } from "./twelve-data";
import { fetchYahooMarketSnapshot } from "./yahoo";

const snapshot=(provider:MarketSnapshot["provider"]):MarketSnapshot=>({
  provider,providerAttempts:[provider],providerChecks:[],symbol:"MSFT",name:"Microsoft",exchange:"NASDAQ",currency:"USD",price:500,change:2,changePercent:.4,asOf:"2026-09-22T12:00:00Z",trailingPe:30,forwardPe:28,dividendYieldPercent:.7,nextDividendDate:"2026-11-10",chart:[{date:"2026-09-21",open:498,high:501,low:497,close:500,volume:100}],warnings:[],
});

describe("market provider fallback",()=>{
  beforeEach(()=>vi.clearAllMocks());

  it("uses Yahoo without calling Twelve Data when Yahoo is healthy",async()=>{
    vi.mocked(fetchYahooMarketSnapshot).mockResolvedValue(snapshot("yahoo"));
    const result=await fetchMarketSnapshot("MSFT");
    expect(result.provider).toBe("yahoo");
    expect(result.providerChecks[0]).toMatchObject({provider:"yahoo",status:"active"});
    expect(fetchTwelveMarketSnapshot).not.toHaveBeenCalled();
  });

  it("switches the complete snapshot to Twelve Data and exposes the fallback",async()=>{
    vi.mocked(fetchYahooMarketSnapshot).mockRejectedValue(new Error("timeout"));
    vi.mocked(fetchTwelveMarketSnapshot).mockResolvedValue(snapshot("twelve-data"));
    const result=await fetchMarketSnapshot("MSFT");
    expect(result.provider).toBe("twelve-data");
    expect(result.providerAttempts).toEqual(["yahoo","twelve-data"]);
    expect(result.providerChecks.map(check=>check.status)).toEqual(["failed","active"]);
    expect(result.warnings[0]).toContain("Yahoo unavailable: timeout");
  });
});
