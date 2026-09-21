export type Direction = "positive" | "negative" | "neutral";

export interface Evidence {
  metric: string;
  label: string;
  current: number | null;
  previous: number | null;
  unit: "currency" | "percent" | "number";
  sourceUrl: string;
  filedAt: string;
}

export interface Signal {
  id: string;
  title: string;
  direction: Direction;
  strength: number;
  summary: string;
  whyItMatters: string;
  evidence: Evidence[];
  counterpoint: string;
}

export interface Analysis {
  ticker: string;
  company: string;
  cik: string;
  generatedAt: string;
  mode: "live" | "demo";
  regime: "improving" | "mixed" | "deteriorating";
  confidence: number;
  pulse: number;
  dataCoverage: number;
  positiveSignals: number;
  negativeSignals: number;
  neutralSignals: number;
  topSignal: string | null;
  thesis: string;
  devilAdvocate: string;
  signals: Signal[];
  warnings: string[];
}
