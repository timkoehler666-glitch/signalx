import type { MarketPoint, TechnicalSignal, TechnicalSignalComponent } from "./market-types";

const average=(values:number[])=>values.reduce((sum,value)=>sum+value,0)/values.length;
const lastAverage=(values:number[],period:number)=>values.length>=period?average(values.slice(-period)):null;

function ema(values:number[],period:number){
  if(values.length<period)return [];
  const multiplier=2/(period+1),result=[average(values.slice(0,period))];
  for(const value of values.slice(period))result.push((value-result.at(-1)!)*multiplier+result.at(-1)!);
  return result;
}

function rsi(values:number[],period=14){
  if(values.length<=period)return null;
  const changes=values.slice(1).map((value,index)=>value-values[index]),window=changes.slice(-period);
  const gains=average(window.map(value=>Math.max(value,0))),losses=average(window.map(value=>Math.max(-value,0)));
  if(losses===0)return 100;
  return 100-(100/(1+gains/losses));
}

function component(id:string,title:string,score:-1|0|1,value:string,explanation:string):TechnicalSignalComponent{
  return{id,title,score,state:score>0?"buy":score<0?"sell":"neutral",value,explanation};
}

export function calculateTechnicalSignal(chart:MarketPoint[],price:number,asOf:string|null):TechnicalSignal|null{
  if(chart.length<50)return null;
  const closes=chart.map(point=>point.close),sma20=lastAverage(closes,20)!,sma50=lastAverage(closes,50)!;
  const trendScore: -1|0|1=price>sma20&&sma20>sma50?1:price<sma20&&sma20<sma50?-1:0;
  const rsi14=rsi(closes)!,momentumScore: -1|0|1=rsi14>=55&&rsi14<75?1:rsi14<=45&&rsi14>25?-1:0;
  const ema12=ema(closes,12),ema26=ema(closes,26),aligned=Math.min(ema12.length,ema26.length);
  const macd=ema12.slice(-aligned).map((value,index)=>value-ema26.slice(-aligned)[index]),signalLine=ema(macd,9),histogram=signalLine.length?macd.at(-1)!-signalLine.at(-1)!:0;
  const accelerationScore: -1|0|1=histogram>0?1:histogram<0?-1:0;
  const volumes=chart.map(point=>point.volume).filter((value):value is number=>value!=null&&value>0),currentVolume=chart.at(-1)?.volume??null,avgVolume=lastAverage(volumes,20);
  const priceDirection=closes.at(-1)!-closes.at(-2)!;
  const volumeRatio=currentVolume&&avgVolume?currentVolume/avgVolume:null;
  const volumeScore: -1|0|1=volumeRatio!=null&&volumeRatio>=1.15?(priceDirection>0?1:priceDirection<0?-1:0):0;
  const components=[
    component("trend","Trend",trendScore,`SMA20 ${sma20.toFixed(2)} · SMA50 ${sma50.toFixed(2)}`,trendScore>0?"Price and short trend are above the long trend.":trendScore<0?"Price and short trend are below the long trend.":"The moving averages do not confirm one direction."),
    component("momentum","Momentum",momentumScore,`RSI 14: ${rsi14.toFixed(1)}`,momentumScore>0?"Momentum is positive without being extremely overheated.":momentumScore<0?"Momentum is negative without being extremely oversold.":"Momentum is neutral or already stretched."),
    component("acceleration","Acceleration",accelerationScore,`MACD impulse: ${histogram.toFixed(3)}`,accelerationScore>0?"Short-term momentum is accelerating upward.":accelerationScore<0?"Short-term momentum is accelerating downward.":"No measurable momentum acceleration."),
    component("volume","Volume confirmation",volumeScore,volumeRatio==null?"No reliable volume ratio":`${volumeRatio.toFixed(2)}× 20-day average`,volumeScore>0?"The upward move has above-average volume.":volumeScore<0?"The downward move has above-average volume.":"Volume does not confirm a strong move."),
  ];
  const raw=trendScore*35+momentumScore*25+accelerationScore*25+volumeScore*15;
  const score=Math.max(-100,Math.min(100,raw)),state=score>=45?"buy":score<=-45?"sell":"hold";
  const agreeing=components.filter(item=>item.score===(state==="buy"?1:state==="sell"?-1:0)).length;
  const confidence=Math.min(95,45+agreeing*10+Math.round(Math.abs(score)*.2));
  const recent=chart.slice(-20),support=Math.min(...recent.map(point=>point.low)),resistance=Math.max(...recent.map(point=>point.high));
  const invalidation=state==="buy"?`Signal weakens below SMA20 (${sma20.toFixed(2)}) and is invalid below 20-day support (${support.toFixed(2)}).`:state==="sell"?`Signal weakens above SMA20 (${sma20.toFixed(2)}) and is invalid above 20-day resistance (${resistance.toFixed(2)}).`:`A close above ${resistance.toFixed(2)} or below ${support.toFixed(2)} can activate a directional setup.`;
  return{state,score,confidence,asOf,horizon:"Short term · daily data",method:"KinkgoX Signal Stack v1",invalidation,components};
}
