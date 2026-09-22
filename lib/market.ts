import type { MarketSnapshot } from "./market-types";
import { fetchTwelveMarketSnapshot } from "./twelve-data";
import { fetchYahooMarketSnapshot } from "./yahoo";

export async function fetchMarketSnapshot(ticker:string):Promise<MarketSnapshot>{
  try{return await fetchYahooMarketSnapshot(ticker)}catch(yahooError){
    try{const snapshot=await fetchTwelveMarketSnapshot(ticker);return{...snapshot,providerAttempts:["yahoo","twelve-data"],warnings:[`Yahoo unavailable: ${yahooError instanceof Error?yahooError.message:"unknown error"}`,...snapshot.warnings]}}
    catch(twelveError){throw new Error(`All market providers failed. Yahoo: ${yahooError instanceof Error?yahooError.message:"unknown error"} Twelve Data: ${twelveError instanceof Error?twelveError.message:"unknown error"}`)}
  }
}
