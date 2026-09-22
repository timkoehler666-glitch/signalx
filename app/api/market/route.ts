import { NextRequest, NextResponse } from "next/server";
import { fetchMarketSnapshot } from "@/lib/market";
import { MarketProvidersUnavailableError } from "@/lib/market";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ticker = req.nextUrl.searchParams.get("ticker") ?? "";
    const data = await fetchMarketSnapshot(ticker);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Market data request failed.",
        providerChecks: error instanceof MarketProvidersUnavailableError ? error.providerChecks : [],
      },
      { status: 502 },
    );
  }
}
