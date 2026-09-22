import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTwelveMarketSnapshot } from "./twelve-data";

describe("Twelve Data adapter", () => {
  beforeEach(() => { process.env.TWELVE_DATA_API_KEY = "test-key"; });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.TWELVE_DATA_API_KEY; });

  it("normalizes quote, chart, valuation and dividend data", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      const body = path === "/quote"
        ? { symbol:"AAPL", name:"Apple", exchange:"NASDAQ", currency:"USD", close:"200", change:"2", percent_change:"1" }
        : path === "/time_series"
          ? { meta:{ symbol:"AAPL", interval:"1day" }, values:[{ datetime:"2026-09-21", open:"198", high:"201", low:"197", close:"200", volume:"1000" }] }
          : path === "/dividends"
            ? { dividends:[{ ex_date:"2026-08-10", amount:"0.25" },{ ex_date:"2026-05-10", amount:"0.25" },{ ex_date:"2026-02-10", amount:"0.25" },{ ex_date:"2025-11-10", amount:"0.25" }] }
            : path === "/profile"
              ? { sector:"Technology", industry:"Consumer Electronics" }
              : { statistics:{ valuations_metrics:{ trailing_pe:"25", forward_pe:"22" } } };
      return new Response(JSON.stringify(body), { status: 200 });
    });

    const result = await fetchTwelveMarketSnapshot("aapl");
    expect(result.price).toBe(200);
    expect(result.trailingPe).toBe(25);
    expect(result.dividendYieldPercent).toBeCloseTo(0.5);
    expect(result.chart[0].close).toBe(200);
    expect(result.stockCategory).toBe("Technologie & Telekom Aktien");
  });

  it("keeps the quote usable when optional endpoints fail", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (new URL(String(input)).pathname === "/quote") {
        return new Response(JSON.stringify({ symbol:"MSFT", close:"500" }), { status: 200 });
      }
      return new Response(JSON.stringify({ status:"error", code:403, message:"plan restriction" }), { status: 403 });
    });

    const result = await fetchTwelveMarketSnapshot("MSFT");
    expect(result.price).toBe(500);
    expect(result.chart).toEqual([]);
    expect(result.warnings).toHaveLength(4);
  });
});
