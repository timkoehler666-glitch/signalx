import type { MarketProviderCheck, MarketSnapshot } from "./market-types";
import { fetchTwelveMarketSnapshot } from "./twelve-data";
import { fetchYahooMarketSnapshot } from "./yahoo";

const message=(error:unknown)=>error instanceof Error?error.message:"Unknown provider error.";

export class MarketProvidersUnavailableError extends Error {
  constructor(public readonly providerChecks:MarketProviderCheck[]){
    super("All market data providers are currently unavailable.");
    this.name="MarketProvidersUnavailableError";
  }
}

export async function fetchMarketSnapshot(ticker:string):Promise<MarketSnapshot>{
  try{
    const snapshot=await fetchYahooMarketSnapshot(ticker);
    return {...snapshot,providerChecks:[
      {provider:"yahoo",status:"active",message:null},
      {provider:"twelve-data",status:process.env.TWELVE_DATA_API_KEY?"standby":"not-configured",message:process.env.TWELVE_DATA_API_KEY?"Ready if Yahoo fails.":"TWELVE_DATA_API_KEY is missing."},
    ]};
  }catch(yahooError){
    const yahooMessage=message(yahooError);
    try{
      const snapshot=await fetchTwelveMarketSnapshot(ticker);
      return {...snapshot,providerAttempts:["yahoo","twelve-data"],providerChecks:[
        {provider:"yahoo",status:"failed",message:yahooMessage},
        {provider:"twelve-data",status:"active",message:"Serving the complete fallback snapshot."},
      ],warnings:[`Yahoo unavailable: ${yahooMessage}`,...snapshot.warnings]};
    }catch(twelveError){
      throw new MarketProvidersUnavailableError([
        {provider:"yahoo",status:"failed",message:yahooMessage},
        {provider:"twelve-data",status:process.env.TWELVE_DATA_API_KEY?"failed":"not-configured",message:message(twelveError)},
      ]);
    }
  }
}
