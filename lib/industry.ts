export const STOCK_CATEGORIES = [
  "Agrar Aktien",
  "Alternative Energien Aktien",
  "Biotechnologie Aktien",
  "Edelmetalle Aktien",
  "Energie Aktien",
  "Finanzwerte Aktien",
  "Gesundheit Aktien",
  "Immobilien/REITs Aktien",
  "Industrie Aktien",
  "Infrastruktur Aktien",
  "Konsumgüter Aktien",
  "Medien Aktien",
  "Nahrungsmittelhersteller Aktien",
  "Ökologie / Umwelttechnologie Aktien",
  "Rohstoff Aktien",
  "Technologie & Telekom Aktien",
  "Versorger Aktien",
  "Wasser Aktien",
] as const;

export type StockCategory = typeof STOCK_CATEGORIES[number];

const includesAny=(value:string,terms:string[])=>terms.some(term=>value.includes(term));

export function classifyStock(sector:string|null,industry:string|null):StockCategory|null {
  const value=`${sector??""} ${industry??""}`.toLowerCase();
  if(!value.trim())return null;
  if(includesAny(value,["biotech","biotechnology"]))return "Biotechnologie Aktien";
  if(includesAny(value,["solar","renewable","alternative energy"]))return "Alternative Energien Aktien";
  if(includesAny(value,["water utilit","water treatment","water infrastructure"]))return "Wasser Aktien";
  if(includesAny(value,["environmental","pollution","waste management","recycling"]))return "Ökologie / Umwelttechnologie Aktien";
  if(includesAny(value,["gold","silver","precious metal"]))return "Edelmetalle Aktien";
  if(includesAny(value,["farm","agricultur","fertilizer","seed"]))return "Agrar Aktien";
  if(includesAny(value,["food","beverage","packaged foods","confection"]))return "Nahrungsmittelhersteller Aktien";
  if(includesAny(value,["real estate","reit"]))return "Immobilien/REITs Aktien";
  if(includesAny(value,["bank","insurance","financial","asset management","capital markets"]))return "Finanzwerte Aktien";
  if(includesAny(value,["healthcare","health care","medical","pharmaceutical","drug manufacturer"]))return "Gesundheit Aktien";
  if(includesAny(value,["technology","telecom","communication services","software","semiconductor","computer","internet content"]))return "Technologie & Telekom Aktien";
  if(includesAny(value,["media","broadcast","entertainment","publishing"]))return "Medien Aktien";
  if(includesAny(value,["utility","utilities","electricity","natural gas distribution"]))return "Versorger Aktien";
  if(includesAny(value,["oil","gas","energy","coal"]))return "Energie Aktien";
  if(includesAny(value,["infrastructure","railroad","airport","toll road"]))return "Infrastruktur Aktien";
  if(includesAny(value,["consumer","retail","apparel","household","auto manufacturer"]))return "Konsumgüter Aktien";
  if(includesAny(value,["mining","steel","copper","aluminum","chemicals","basic materials"]))return "Rohstoff Aktien";
  if(includesAny(value,["industrial","aerospace","defense","machinery","manufacturing","construction"]))return "Industrie Aktien";
  return null;
}
