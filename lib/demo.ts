import { analyzeFundamentals, type FundamentalPeriod } from "./engine";

const periods: FundamentalPeriod[] = [
  {filedAt:"2025-10-31",sourceUrl:"https://www.sec.gov/edgar/search/",revenue:420e9,grossProfit:197e9,operatingIncome:133e9,operatingCashFlow:145e9,capex:12e9,inventory:7.3e9,receivables:34e9,debt:98e9,shares:15.0e9},
  {filedAt:"2024-11-01",sourceUrl:"https://www.sec.gov/edgar/search/",revenue:383e9,grossProfit:180e9,operatingIncome:119e9,operatingCashFlow:118e9,capex:9.4e9,inventory:6.3e9,receivables:33e9,debt:106e9,shares:15.3e9},
  {filedAt:"2023-11-03",sourceUrl:"https://www.sec.gov/edgar/search/",revenue:365e9,grossProfit:170e9,operatingIncome:114e9,operatingCashFlow:111e9,capex:10.9e9,inventory:6.3e9,receivables:30e9,debt:111e9,shares:15.6e9},
];

export const demoAnalysis = () => analyzeFundamentals("AAPL","Apple Inc.","0000320193",periods,"demo");
