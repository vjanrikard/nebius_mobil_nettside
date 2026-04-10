# Nebius Mobile Dashboard

Mobile-friendly stock event dashboard focused on Nebius (NBIS), with support for adding more tickers via config.

## Features

- 12-month price chart
- SEC filings from sec.gov (8-K events)
- Press releases from investors.nebius.com
- Earnings date markers
- Guidance event tagging based on filing/headline keywords
- Gap-day detection from daily OHLC price series
- Multi-ticker support via a single config file
- Event-type filters (8-K, guidance, earnings, gap, press)

## Configure Tickers

Edit [config/tickers.json](config/tickers.json) and add items:

```json
{
  "ticker": "MSFT",
  "name": "Microsoft",
  "investorRelationsUrl": "https://www.microsoft.com/en-us/Investor",
  "secEntityName": "Microsoft",
  "earningsDates": ["2026-01-28"],
  "gapThresholdPct": 5,
  "manualEvents": []
}
```

## Run Locally

Prerequisite: install Node.js 20+ (includes npm).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>

## Deployment

### Vercel (recommended)

1. Push to GitHub.
2. Import the repository in Vercel.
3. Deploy with defaults.

Or via CLI:

```bash
npm i -g vercel
vercel
vercel --prod
```

## Notes

- SEC requests include a User-Agent; replace the placeholder contact with your own in `lib/marketData.ts`.
- If an investor relations RSS feed is unavailable, the app falls back to HTML scraping of press releases.
