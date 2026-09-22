export type MarketProvider = "yahoo" | "twelve-data";

export interface MarketPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface MarketSnapshot {
  provider: MarketProvider;
  providerAttempts: MarketProvider[];
  symbol: string;
  name: string | null;
  exchange: string | null;
  currency: string | null;
  price: number;
  change: number | null;
  changePercent: number | null;
  asOf: string | null;
  trailingPe: number | null;
  forwardPe: number | null;
  dividendYieldPercent: number | null;
  nextDividendDate: string | null;
  chart: MarketPoint[];
  warnings: string[];
}
