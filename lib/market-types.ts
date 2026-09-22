export type MarketProvider = "yahoo" | "twelve-data";
export type MarketProviderStatus = "active" | "standby" | "not-configured" | "failed";

export interface MarketProviderCheck {
  provider: MarketProvider;
  status: MarketProviderStatus;
  message: string | null;
}

export interface MarketPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface TechnicalSignalComponent {
  id: string;
  title: string;
  state: "buy" | "sell" | "neutral";
  score: -1 | 0 | 1;
  value: string;
  explanation: string;
}

export interface TechnicalSignal {
  state: "buy" | "sell" | "hold";
  score: number;
  confidence: number;
  asOf: string | null;
  horizon: string;
  method: string;
  invalidation: string;
  components: TechnicalSignalComponent[];
}

export interface MarketSnapshot {
  provider: MarketProvider;
  providerAttempts: MarketProvider[];
  providerChecks: MarketProviderCheck[];
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  stockCategory: string | null;
  technicalSignal: TechnicalSignal | null;
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
