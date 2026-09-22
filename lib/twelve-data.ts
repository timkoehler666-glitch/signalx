import { z } from "zod";
import type { MarketSnapshot } from "./market-types";
import { classifyStock } from "./industry";

const API_BASE = "https://api.twelvedata.com";

const ErrorSchema = z.object({
  status: z.literal("error"),
  code: z.number().optional(),
  message: z.string(),
});

const QuoteSchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  exchange: z.string().optional(),
  currency: z.string().optional(),
  datetime: z.string().optional(),
  timestamp: z.coerce.number().optional(),
  close: z.coerce.number(),
  change: z.coerce.number().optional(),
  percent_change: z.coerce.number().optional(),
});

const TimeSeriesSchema = z.object({
  meta: z.object({
    symbol: z.string(),
    interval: z.string(),
    currency: z.string().optional(),
    exchange: z.string().optional(),
  }),
  values: z.array(z.object({
    datetime: z.string(),
    open: z.coerce.number(),
    high: z.coerce.number(),
    low: z.coerce.number(),
    close: z.coerce.number(),
    volume: z.coerce.number().nullable().optional(),
  })),
});

const DividendsSchema = z.object({
  dividends: z.array(z.object({
    ex_date: z.string(),
    amount: z.coerce.number(),
  })).default([]),
});

const StatisticsSchema = z.object({
  statistics: z.object({
    valuations_metrics: z.object({
      trailing_pe: z.coerce.number().nullable().optional(),
      forward_pe: z.coerce.number().nullable().optional(),
    }).optional(),
    stock_statistics: z.object({
      shares_outstanding: z.coerce.number().nullable().optional(),
    }).optional(),
  }).optional(),
});

const ProfileSchema = z.object({sector:z.string().nullable().optional(),industry:z.string().nullable().optional()});

function apiKey() {
  const key = process.env.TWELVE_DATA_API_KEY?.trim();
  if (!key) throw new Error("Twelve Data is not configured.");
  return key;
}

async function request(path: string, params: Record<string, string>) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { Authorization: `apikey ${apiKey()}`, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  const payload: unknown = await response.json().catch(() => null);
  const providerError = ErrorSchema.safeParse(payload);
  if (!response.ok || providerError.success) {
    const message = providerError.success ? providerError.data.message : `HTTP ${response.status}`;
    throw new Error(`Twelve Data request failed: ${message}`);
  }
  return payload;
}

function cleanTicker(ticker: string) {
  const clean = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9./:-]{0,24}$/.test(clean)) throw new Error("Enter a valid ticker symbol.");
  return clean;
}

function annualDividend(dividends: Array<{ ex_date: string; amount: number }>) {
  if (!dividends.length) return 0;
  const newest = dividends.reduce((latest, item) => item.ex_date > latest ? item.ex_date : latest, dividends[0].ex_date);
  const from = new Date(`${newest}T00:00:00Z`);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  return dividends.filter(item => item.ex_date > from.toISOString().slice(0, 10) && item.ex_date <= newest)
    .reduce((sum, item) => sum + item.amount, 0);
}

export async function fetchTwelveMarketSnapshot(ticker: string): Promise<MarketSnapshot> {
  const symbol = cleanTicker(ticker);
  const warnings: string[] = [];
  const [quoteResult, chartResult, dividendResult, statsResult, profileResult] = await Promise.allSettled([
    request("/quote", { symbol }),
    request("/time_series", { symbol, interval: "1day", outputsize: "252", order: "ASC" }),
    request("/dividends", { symbol, range: "1y" }),
    request("/statistics", { symbol }),
    request("/profile", { symbol }),
  ]);

  if (quoteResult.status === "rejected") throw quoteResult.reason;
  const quote = QuoteSchema.parse(quoteResult.value);

  const chart = chartResult.status === "fulfilled"
    ? TimeSeriesSchema.parse(chartResult.value).values.map(value => ({
      date: value.datetime,
      open: value.open,
      high: value.high,
      low: value.low,
      close: value.close,
      volume: value.volume ?? null,
    }))
    : [];
  if (chartResult.status === "rejected") warnings.push("Chart data is temporarily unavailable from Twelve Data.");

  const dividends = dividendResult.status === "fulfilled"
    ? DividendsSchema.parse(dividendResult.value).dividends
    : [];
  if (dividendResult.status === "rejected") warnings.push("Dividend data is unavailable on the current Twelve Data plan or temporarily unavailable.");

  const statistics = statsResult.status === "fulfilled"
    ? StatisticsSchema.parse(statsResult.value).statistics
    : undefined;
  if (statsResult.status === "rejected") warnings.push("P/E data is unavailable on the current Twelve Data plan or temporarily unavailable.");

  const annual = annualDividend(dividends);
  const today = new Date().toISOString().slice(0, 10);
  const nextDividend = dividends.filter(item => item.ex_date >= today).sort((a, b) => a.ex_date.localeCompare(b.ex_date))[0];
  const profile=profileResult.status==="fulfilled"?ProfileSchema.parse(profileResult.value):null;
  if(profileResult.status==="rejected")warnings.push("Industry profile is unavailable on the current Twelve Data plan or temporarily unavailable.");
  const sector=profile?.sector??null,industry=profile?.industry??null;

  return {
    provider: "twelve-data",
    providerAttempts: ["twelve-data"],
    providerChecks: [],
    symbol: quote.symbol,
    name: quote.name ?? null,
    sector,
    industry,
    stockCategory: classifyStock(sector,industry),
    technicalSignal: null,
    exchange: quote.exchange ?? null,
    currency: quote.currency ?? null,
    price: quote.close,
    change: quote.change ?? null,
    changePercent: quote.percent_change ?? null,
    asOf: quote.datetime ?? (quote.timestamp ? new Date(quote.timestamp * 1000).toISOString() : null),
    trailingPe: statistics?.valuations_metrics?.trailing_pe ?? null,
    forwardPe: statistics?.valuations_metrics?.forward_pe ?? null,
    dividendYieldPercent: quote.close > 0 && annual > 0 ? annual / quote.close * 100 : null,
    nextDividendDate: nextDividend?.ex_date ?? null,
    chart,
    warnings,
  };
}
