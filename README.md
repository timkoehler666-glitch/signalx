# KinkgoX

**See the change before the market sees the story.**

KinkgoX reads standardized SEC company facts and turns changes in fundamentals into auditable signals. It is deliberately not a black-box buy/sell predictor. Each signal includes evidence, a source link, why it matters, and a devil's-advocate interpretation.

## Alpha v0.1

- Live US ticker lookup through the SEC company list
- Annual 10-K normalization with issuer-tag fallbacks
- Revenue acceleration and margin-inflection detection
- Free-cash-flow conversion, working-capital divergence, debt and dilution checks
- KinkgoX Pulse, Company DNA, Thesis Engine, Hidden Signals and Evidence Ledger UI
- Confidence and change regime without investment recommendations
- Instant demo mode and deterministic analysis tests

## Run locally

```bash
cp .env.example .env.local
# Set SEC_USER_AGENT to your application name and real contact email.
# Set TWELVE_DATA_API_KEY for the server-side market-data fallback.
npm install
npm run dev
```

Open <http://localhost:3000>. Use `DEMO` for the built-in dataset or enter a US ticker such as `MSFT`.

## Verify

```bash
npm test
npm run build
```

## Data policy

Live data comes from the public SEC EDGAR APIs. Production deployments must use a descriptive `SEC_USER_AGENT`, cache responses, stay within SEC fair-access guidance, and retain source attribution.

Market quotes, one-year daily charts, valuation statistics and dividends are available through the server-only `/api/market?ticker=...` endpoint backed by Twelve Data. The API key is read only from `TWELVE_DATA_API_KEY` and is never returned to the browser.

## Product direction

The Alpha proves the core loop: **ticker → normalize → detect change → explain → source**. Planned SaaS layers are authentication, watchlists, filing-change alerts, persistent thesis history, expectations/price context, and billing (Free, Pro €9.90/month or €99/year, Pro+ €19.90/month or €199/year).

## Disclaimer

KinkgoX is an educational research product. It does not provide investment advice, price targets, or buy/sell recommendations.
