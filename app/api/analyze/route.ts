import { NextRequest, NextResponse } from "next/server";
import { analyzeFundamentals } from "@/lib/engine";
import { demoAnalysis } from "@/lib/demo";
import { fetchAnalysisInput } from "@/lib/sec";

export const runtime="nodejs";
export async function GET(req:NextRequest){
  try{
    const ticker=req.nextUrl.searchParams.get("ticker")||"";
    if(ticker.toUpperCase()==="DEMO")return NextResponse.json(demoAnalysis());
    const input=await fetchAnalysisInput(ticker);
    return NextResponse.json(analyzeFundamentals(input.ticker,input.company,input.cik,input.periods,"live"));
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Analysis failed."},{status:400})}
}
