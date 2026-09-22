import { NextRequest, NextResponse } from "next/server";
import { fetchTwelveMarketSnapshot } from "@/lib/twelve-data";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ticker = req.nextUrl.searchParams.get("ticker") ?? "";
    const data = await fetchTwelveMarketSnapshot(ticker);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Market data request failed." },
      { status: 502 },
    );
  }
}
