import type { Analysis, Evidence, Signal } from "./types";

export interface FundamentalPeriod {
  filedAt: string;
  sourceUrl: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  operatingCashFlow: number | null;
  capex: number | null;
  inventory: number | null;
  receivables: number | null;
  debt: number | null;
  shares: number | null;
}

const growth = (now: number | null, before: number | null) =>
  now == null || before == null || before === 0 ? null : (now - before) / Math.abs(before);
const margin = (profit: number | null, revenue: number | null) =>
  profit == null || revenue == null || revenue === 0 ? null : profit / revenue;
const pct = (n: number | null) => n == null ? "n/a" : `${(n * 100).toFixed(1)}%`;
const evidence = (metric: string, label: string, current: number | null, previous: number | null, p: FundamentalPeriod, unit: Evidence["unit"] = "currency"): Evidence =>
  ({ metric, label, current, previous, unit, sourceUrl: p.sourceUrl, filedAt: p.filedAt });

export function analyzeFundamentals(ticker: string, company: string, cik: string, periods: FundamentalPeriod[], mode: Analysis["mode"]): Analysis {
  const [current, prior, older] = periods;
  if (!current || !prior) throw new Error("At least two comparable annual periods are required.");
  const signals: Signal[] = [];
  const revGrowth = growth(current.revenue, prior.revenue);
  const priorRevGrowth = older ? growth(prior.revenue, older.revenue) : null;
  if (revGrowth != null) {
    const acceleration = priorRevGrowth == null ? null : revGrowth - priorRevGrowth;
    signals.push({ id:"revenue-acceleration", title:"Revenue trajectory", direction: acceleration == null ? (revGrowth >= 0 ? "positive":"negative") : acceleration >= 0.02 ? "positive" : acceleration <= -0.02 ? "negative":"neutral", strength: Math.min(100, Math.round(Math.abs((acceleration ?? revGrowth) * 500))), summary: priorRevGrowth == null ? `Revenue changed ${pct(revGrowth)} year over year.` : `Revenue growth moved from ${pct(priorRevGrowth)} to ${pct(revGrowth)}.`, whyItMatters:"A change in growth rate often matters more than the absolute growth number because expectations react to acceleration and deceleration.", evidence:[evidence("revenue","Revenue",current.revenue,prior.revenue,current)], counterpoint:"Acquisitions, currency effects or a cyclical rebound can make reported growth look stronger than underlying demand." });
  }
  const opMargin = margin(current.operatingIncome, current.revenue);
  const priorOpMargin = margin(prior.operatingIncome, prior.revenue);
  if (opMargin != null && priorOpMargin != null) {
    const delta = opMargin - priorOpMargin;
    signals.push({ id:"margin-inflection", title:"Operating margin inflection", direction:delta > .01?"positive":delta < -.01?"negative":"neutral", strength:Math.min(100,Math.round(Math.abs(delta)*1000)), summary:`Operating margin moved from ${pct(priorOpMargin)} to ${pct(opMargin)}.`, whyItMatters:"Margins reveal pricing power, cost discipline and operating leverage behind headline revenue.", evidence:[evidence("operatingIncome","Operating income",current.operatingIncome,prior.operatingIncome,current),evidence("revenue","Revenue",current.revenue,prior.revenue,current)], counterpoint:"Restructuring charges and stock compensation may distort a single period; inspect the filing notes." });
  }
  const fcf = current.operatingCashFlow == null || current.capex == null ? null : current.operatingCashFlow - Math.abs(current.capex);
  const priorFcf = prior.operatingCashFlow == null || prior.capex == null ? null : prior.operatingCashFlow - Math.abs(prior.capex);
  const fcfMargin = margin(fcf,current.revenue), priorFcfMargin = margin(priorFcf,prior.revenue);
  if (fcfMargin != null && priorFcfMargin != null) {
    const delta=fcfMargin-priorFcfMargin;
    signals.push({id:"fcf-conversion",title:"Free-cash-flow conversion",direction:delta>.015?"positive":delta<-.015?"negative":"neutral",strength:Math.min(100,Math.round(Math.abs(delta)*800)),summary:`Estimated FCF margin moved from ${pct(priorFcfMargin)} to ${pct(fcfMargin)}.`,whyItMatters:"Cash conversion tests whether accounting earnings are turning into cash available to the business.",evidence:[evidence("operatingCashFlow","Operating cash flow",current.operatingCashFlow,prior.operatingCashFlow,current),evidence("capex","Capital expenditure",current.capex,prior.capex,current)],counterpoint:"Working-capital timing can temporarily inflate or depress cash flow."});
  }
  const invGrowth=growth(current.inventory,prior.inventory), recGrowth=growth(current.receivables,prior.receivables);
  const divergence=Math.max(invGrowth??-99,recGrowth??-99)-(revGrowth??0);
  if ((invGrowth!=null||recGrowth!=null) && revGrowth!=null) signals.push({id:"working-capital-divergence",title:"Working-capital divergence",direction:divergence>.08?"negative":divergence<-.04?"positive":"neutral",strength:Math.min(100,Math.round(Math.abs(divergence)*400)),summary:`Inventory growth is ${pct(invGrowth)} and receivables growth is ${pct(recGrowth)} versus revenue at ${pct(revGrowth)}.`,whyItMatters:"Inventory or receivables growing materially faster than sales can precede discounting, weaker demand or collection pressure.",evidence:[evidence("inventory","Inventory",current.inventory,prior.inventory,current),evidence("receivables","Receivables",current.receivables,prior.receivables,current)],counterpoint:"Product launches, supply-chain rebuilding and customer mix can make the divergence intentional."});
  const debtGrowth=growth(current.debt,prior.debt), dilution=growth(current.shares,prior.shares);
  if (debtGrowth!=null) signals.push({id:"balance-sheet-pressure",title:"Debt pressure",direction:debtGrowth>.1?"negative":debtGrowth<-.1?"positive":"neutral",strength:Math.min(100,Math.round(Math.abs(debtGrowth)*250)),summary:`Reported debt changed ${pct(debtGrowth)}.`,whyItMatters:"Debt changes future flexibility and makes the equity thesis more sensitive to rates and cash generation.",evidence:[evidence("debt","Debt",current.debt,prior.debt,current)],counterpoint:"Higher debt may fund a high-return acquisition; lower debt may simply reflect a temporary cash drawdown."});
  if (dilution!=null) signals.push({id:"share-dilution",title:"Share-count change",direction:dilution>.02?"negative":dilution<-.02?"positive":"neutral",strength:Math.min(100,Math.round(Math.abs(dilution)*500)),summary:`Diluted share count changed ${pct(dilution)}.`,whyItMatters:"Per-share value can weaken even when company-wide results improve if dilution is persistent.",evidence:[evidence("shares","Diluted shares",current.shares,prior.shares,current,"number")],counterpoint:"Share-based compensation may be offset by repurchases, while buybacks can destroy value if shares are overpriced."});
  const scored=signals.filter(s=>s.direction!=="neutral");
  const net=scored.reduce((sum,s)=>sum+(s.direction==="positive"?s.strength:-s.strength),0);
  const regime=net>25?"improving":net< -25?"deteriorating":"mixed";
  const confidence=Math.min(95,Math.round(45+signals.length*6+Math.min(20,Math.abs(net)/10)));
  const positives=signals.filter(s=>s.direction==="positive").map(s=>s.title.toLowerCase());
  const negatives=signals.filter(s=>s.direction==="negative").map(s=>s.title.toLowerCase());
  return {ticker:ticker.toUpperCase(),company,cik,generatedAt:new Date().toISOString(),mode,regime,confidence,thesis:`The filing evidence is ${regime}. ${positives.length?`Improvement is concentrated in ${positives.join(", ")}.`:"No strong positive inflection was detected."} ${negatives.length?`Pressure appears in ${negatives.join(", ")}.`:"No strong deterioration signal was detected."}`,devilAdvocate: regime==="improving"?"The market may already expect this improvement, and one annual period does not prove durability.":regime==="deteriorating"?"The weak signals may be temporary, cyclical or caused by deliberate investment that creates future value.":"Mixed evidence can mark a transition, but it can also mean the available data is not decisive enough for a thesis.",signals,warnings:["KinkgoX detects changes in reported fundamentals; it is not investment advice or a buy/sell signal.","SEC concepts differ between issuers. Values are normalized with fallbacks and should be checked against the linked filing."]};
}
