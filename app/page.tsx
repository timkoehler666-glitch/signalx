"use client";

import { FormEvent, useState } from "react";
import type { Analysis, Evidence, Signal } from "@/lib/types";

type TabId="overview"|"thesis"|"signals"|"sources";
interface ProviderCheck{provider:"yahoo"|"twelve-data";status:"active"|"standby"|"not-configured"|"failed";message:string|null}
interface TechnicalSignalComponent{id:string;title:string;state:"buy"|"sell"|"neutral";score:-1|0|1;value:string;explanation:string}
interface TechnicalSignal{state:"buy"|"sell"|"hold";score:number;confidence:number;asOf:string|null;horizon:string;method:string;invalidation:string;components:TechnicalSignalComponent[]}
interface MarketSnapshot{
  provider:"yahoo"|"twelve-data";providerAttempts:Array<"yahoo"|"twelve-data">;providerChecks:ProviderCheck[];
  symbol:string;name:string|null;sector:string|null;industry:string|null;stockCategory:string|null;exchange:string|null;currency:string|null;
  price:number;change:number|null;changePercent:number|null;asOf:string|null;trailingPe:number|null;forwardPe:number|null;
  dividendYieldPercent:number|null;nextDividendDate:string|null;
  technicalSignal:TechnicalSignal|null;
  chart:Array<{date:string;open:number;high:number;low:number;close:number;volume:number|null}>;warnings:string[];
}

const money=(n:number|null)=>n==null?"—":new Intl.NumberFormat("en-US",{notation:"compact",style:"currency",currency:"USD",maximumFractionDigits:1}).format(n);
const number=(n:number|null)=>n==null?"—":new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(n);
const decimal=(n:number|null,digits=2)=>n==null?"—":new Intl.NumberFormat("en-US",{maximumFractionDigits:digits}).format(n);
const date=(value:string|null)=>value?new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value.length===10?`${value}T00:00:00Z`:value)):"—";
const marketMoney=(n:number,currency:string|null)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:currency||"USD",maximumFractionDigits:2}).format(n);

function EvidenceRow({e}:{e:Evidence}){return <a className="evidence" href={e.sourceUrl} target="_blank" rel="noreferrer"><span><b>{e.label}</b><small>SEC filing · {e.filedAt}</small></span><span>{e.unit==="number"?number(e.previous):money(e.previous)} → <b>{e.unit==="number"?number(e.current):money(e.current)}</b></span></a>}
function SignalCard({signal}:{signal:Signal}){return <article className={`signal ${signal.direction}`}><div className="signalTop"><span className="direction">{signal.direction}</span><span className="strength">Evidence {signal.strength}/100</span></div><h3>{signal.title}</h3><p className="summary">{signal.summary}</p><p>{signal.whyItMatters}</p><div className="evidenceList">{signal.evidence.map((e,i)=><EvidenceRow key={`${e.metric}-${i}`} e={e}/>)}</div><details><summary>Devil’s advocate</summary><p>{signal.counterpoint}</p></details></article>}

function MarketChart({points}:{points:MarketSnapshot["chart"]}){
  if(points.length<2)return <div className="chartEmpty">Chart currently unavailable</div>;
  const width=900,height=260,pad=12,closes=points.map(p=>p.close),min=Math.min(...closes),max=Math.max(...closes),range=max-min||1;
  const path=points.map((p,i)=>`${i?"L":"M"}${pad+i/(points.length-1)*(width-pad*2)},${pad+(max-p.close)/range*(height-pad*2)}`).join(" "),positive=closes.at(-1)!>=closes[0];
  return <div className="marketChart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="One-year daily closing-price chart" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={positive?"#bcff52":"#ff6b6b"} stopOpacity=".28"/><stop offset="1" stopColor={positive?"#bcff52":"#ff6b6b"} stopOpacity="0"/></linearGradient></defs><path d={`${path} L${width-pad},${height-pad} L${pad},${height-pad} Z`} fill="url(#chartFill)"/><path d={path} fill="none" stroke={positive?"#bcff52":"#ff6b6b"} strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div><span>{date(points[0].date)}</span><b>1 year · daily close</b><span>{date(points.at(-1)!.date)}</span></div></div>;
}

const providerName=(provider:ProviderCheck["provider"])=>provider==="yahoo"?"Yahoo Finance":"Twelve Data";
const providerStatusLabel:Record<ProviderCheck["status"],string>={active:"Active",standby:"Fallback ready","not-configured":"Not configured",failed:"Failed"};
function ProviderStatus({checks}:{checks:ProviderCheck[]}){if(!checks.length)return null;return <div className="providerStatus" aria-label="Market data provider status">{checks.map(check=><div className={`providerCheck ${check.status}`} key={check.provider} title={check.message||undefined}><span/><b>{providerName(check.provider)}</b><small>{providerStatusLabel[check.status]}</small></div>)}</div>}

function MarketPanel({market,loading,error}:{market:MarketSnapshot|null;loading:boolean;error:string}){
  if(loading)return <section className="marketPanel marketLoading">Loading live market data…</section>;
  if(!market)return <section className="marketPanel marketUnavailable"><b>Market data unavailable</b><span>{error||"No market snapshot was returned."}</span></section>;
  const positive=(market.change??0)>=0,source=market.provider==="yahoo"?"Yahoo Finance":"Twelve Data";
  return <section className="marketPanel">
    <div className="industryBanner"><span>Branche</span><strong>{market.stockCategory||market.sector||"Nicht sicher zugeordnet"}</strong>{market.industry&&<small>{market.industry}</small>}</div>
    <header><div><p className="eyebrow">PRICE · VALUATION · DIVIDEND</p><div className="priceLine"><h2>{marketMoney(market.price,market.currency)}</h2><span className={positive?"up":"down"}>{market.change==null?"—":`${positive?"+":""}${decimal(market.change)} (${positive?"+":""}${decimal(market.changePercent)}%)`}</span></div><small>{market.exchange||"Exchange unavailable"} · {market.currency||"Currency unavailable"}</small></div><div className="freshness"><b>{source}</b><span>Updated {date(market.asOf)}</span><small>Maximum cache: 5 minutes</small>{market.providerAttempts.length>1&&<em>Fallback active</em>}</div></header>
    <ProviderStatus checks={market.providerChecks}/>
    <div className="marketMetrics"><article><small>Current P/E</small><strong>{decimal(market.trailingPe)}</strong><span>Trailing P/E</span></article><article><small>Dividend yield</small><strong>{market.dividendYieldPercent==null?"—":`${decimal(market.dividendYieldPercent)}%`}</strong><span>Last 12 months</span></article><article><small>Next dividend date</small><strong>{date(market.nextDividendDate)}</strong><span>Ex-date when payout date is unavailable</span></article></div>
    <MarketChart points={market.chart}/>{market.warnings.map(w=><p className="marketWarning" key={w}>⚠ {w}</p>)}
  </section>;
}

const technicalStateLabel={buy:"Kaufsignal",sell:"Verkaufssignal",hold:"Abwarten"} as const;
const componentStateLabel={buy:"Positiv",sell:"Negativ",neutral:"Neutral"} as const;
function TechnicalSignalPanel({market,loading}:{market:MarketSnapshot|null;loading:boolean}){
  if(loading)return <section className="technicalSignal loadingSignal">Live-Signal wird berechnet…</section>;
  const signal=market?.technicalSignal;
  if(!signal)return <section className="technicalSignal unavailableSignal"><b>Noch kein belastbares Live-Signal</b><span>Für den Signal Stack werden mindestens 50 vollständige Handelstage benötigt.</span></section>;
  return <section className={`technicalSignal ${signal.state}`}>
    <header><div><p className="eyebrow">KINKGOX SIGNAL STACK · LIVE SNAPSHOT</p><div className="signalVerdict"><strong>{technicalStateLabel[signal.state]}</strong><span>{signal.score>0?"+":""}{signal.score}/100</span></div><small>{signal.horizon} · Stand {date(signal.asOf)} · max. 5 Minuten Cache</small></div><div className="signalConfidence"><span>Übereinstimmung</span><b>{signal.confidence}%</b><small>{signal.method}</small></div></header>
    <div className="signalMeter" aria-label={`Signalstärke ${signal.score} von 100`}><span style={{left:`${(signal.score+100)/2}%`}}/></div>
    <div className="technicalComponents">{signal.components.map(item=><article className={item.state} key={item.id}><div><span className="componentDot"/><small>{componentStateLabel[item.state]}</small></div><h3>{item.title}</h3><b>{item.value}</b><p>{item.explanation}</p></article>)}</div>
    <div className="signalInvalidation"><div><span>Signal-Kippunkt</span><strong>{signal.invalidation}</strong></div><p>Technisches Research-Signal, keine persönliche Kauf- oder Verkaufsempfehlung. Fundamentaldaten, Bewertung, Risiko und Anlagehorizont separat prüfen.</p></div>
  </section>;
}

function downloadReport(data:Analysis){const payload={product:"KinkgoX",disclaimer:"Educational research only — not investment advice.",...data},blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`kingkox-${data.ticker.toLowerCase()}-${data.generatedAt.slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)}
const tabs:Array<{id:TabId;label:string}>=[{id:"overview",label:"Überblick"},{id:"thesis",label:"These"},{id:"signals",label:"Signale"},{id:"sources",label:"Quellen"}];

export default function Home(){
  const[ticker,setTicker]=useState(""),[data,setData]=useState<Analysis|null>(null),[market,setMarket]=useState<MarketSnapshot|null>(null);
  const[marketError,setMarketError]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false),[marketLoading,setMarketLoading]=useState(false),[activeTab,setActiveTab]=useState<TabId>("overview");
  async function analyze(symbol:string){
    setLoading(true);setError("");setMarket(null);setMarketError("");setActiveTab("overview");const demo=symbol.toUpperCase()==="DEMO";setMarketLoading(!demo);
    try{const analysisRequest=fetch(`/api/analyze?ticker=${encodeURIComponent(symbol)}`),marketRequest=demo?null:fetch(`/api/market?ticker=${encodeURIComponent(symbol)}`).then(async r=>{const json=await r.json();if(!r.ok)throw new Error(json.error||"Market data request failed");return json as MarketSnapshot});const r=await analysisRequest,json=await r.json();if(!r.ok)throw new Error(json.error||"Analysis failed");setData(json);if(marketRequest)marketRequest.then(setMarket).catch(e=>setMarketError(e instanceof Error?e.message:"Market data request failed")).finally(()=>setMarketLoading(false))}catch(e){setError(e instanceof Error?e.message:"Analysis failed");setMarketLoading(false)}finally{setLoading(false)}
  }
  function submit(e:FormEvent){e.preventDefault();void analyze(ticker)}
  return <main>
    <nav><div className="brand"><span>Kinkgo</span><span className="mark">X</span></div><span className="tag">Evidence before opinion.</span></nav>
    <section className="hero"><p className="eyebrow">FUNDAMENTAL CHANGE INTELLIGENCE</p><h1>See the change.<br/><em>Before the market sees the story.</em></h1><p className="lead">KinkgoX turns SEC filings into an explainable chain from <b>Reality → Expectations → Price</b>. No black-box buy signal. Every claim links to evidence.</p><form onSubmit={submit}><input aria-label="Ticker" value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} placeholder="Enter US ticker — e.g. MSFT" maxLength={10}/><button disabled={loading||!ticker.trim()}>{loading?"Reading filings…":"Analyze change"}</button></form><button className="demo" onClick={()=>void analyze("DEMO")} disabled={loading}>or open the instant demo</button>{error&&<p className="error" role="alert">{error}</p>}</section>
    {data&&<section className="dashboard" aria-live="polite">
      <header className="company"><div><p className="eyebrow">KINKGOX COMPANY DNA</p><h2>{data.company} <span>{data.ticker}</span></h2><p>CIK {data.cik} · {data.mode==="live"?"Live SEC data":"Illustrative demo data"}</p></div><div className="reportActions"><button onClick={()=>downloadReport(data)}>Export evidence</button><div className={`regime ${data.regime}`}><small>KinkgoX Pulse</small><b>{data.regime}</b><span>{data.confidence}% thesis confidence</span></div></div></header>
      <div className="analysisTabs" role="tablist" aria-label="Aktienanalyse Bereiche">{tabs.map(tab=><button key={tab.id} role="tab" aria-selected={activeTab===tab.id} className={activeTab===tab.id?"active":""} onClick={()=>setActiveTab(tab.id)}><span>{tab.label}</span>{tab.id==="signals"&&<small>{data.signals.length}</small>}</button>)}</div>
      <div className="tabPanel" role="tabpanel">
        {activeTab==="overview"&&<><>{data.mode==="live"&&<MarketPanel market={market} loading={marketLoading} error={marketError}/>}</><div className="pulseGrid"><article><small>Pulse</small><strong>{data.pulse>0?"+":""}{data.pulse}</strong><div className="pulseTrack"><span style={{width:`${Math.abs(data.pulse)}%`,marginLeft:data.pulse<0?`${100-Math.abs(data.pulse)}%`:"0"}}/></div></article><article><small>Signal mix</small><strong>{data.positiveSignals} / {data.negativeSignals}</strong><span>positive / negative</span></article><article><small>Data coverage</small><strong>{data.dataCoverage}%</strong><span>comparable SEC fields</span></article><article><small>Strongest change</small><strong className="topSignal">{data.topSignal??"No decisive signal"}</strong><span>highest evidence strength</span></article></div></>}
        {activeTab==="thesis"&&<div className="thesisGrid"><article><p className="eyebrow">THESIS ENGINE</p><h3>Current evidence map</h3><p>{data.thesis}</p></article><article className="devil"><p className="eyebrow">DEVIL’S ADVOCATE</p><h3>How this could be wrong</h3><p>{data.devilAdvocate}</p></article></div>}
        {activeTab==="signals"&&<><TechnicalSignalPanel market={market} loading={marketLoading}/><div className="sectionTitle fundamentalSignalsTitle"><div><p className="eyebrow">FUNDAMENTALE SIGNALE</p><h2>Changes behind the headline</h2></div><span>{data.signals.length} checks</span></div><div className="signals">{data.signals.map(s=><SignalCard key={s.id} signal={s}/>)}</div></>}
        {activeTab==="sources"&&<article className="ledger"><p className="eyebrow">EVIDENCE LEDGER</p><h2>Audit the thesis</h2><p>Every metric retains its filing date and source link. The model exposes its counterarguments instead of hiding uncertainty.</p>{data.warnings.map(w=><p className="warning" key={w}>⚠ {w}</p>)}</article>}
      </div>
    </section>}
    <footer>KinkgoX Alpha · Fundamental Change Intelligence · Educational research only</footer>
  </main>;
}
