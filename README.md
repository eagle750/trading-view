# TradeScreener

Multi-strategy screener and charting web app for **Indian equities (NSE/BSE)** with an architecture that can extend to **NASDAQ/US** via `src/config/market.config.ts`.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS v4
- TanStack Table, TradingView Lightweight Charts, Zustand, Zod
- Radix primitives + `class-variance-authority` (shadcn-style UI patterns)

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Optional — the demo runs **fully offline** with seeded data.

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Reserved: wire `/api/strategy/parse` and `/api/overlay/parse` to a real LLM instead of deterministic mocks |

Copy from `.env.example` when you add integrations.

## Data sources

- **Current build:** mock/seed data (`src/lib/seed/`) and deterministic generators for OHLC. No external API keys required.
- **Production:** replace handlers in `src/app/api/**` with Screener.in / Tickertape / Trendlyne (or brokers) behind your backend. Respect their terms of use and rate limits.
- **Caching:** in-memory TTL in `src/lib/cache.ts` (quotes-style 30s, OHLC-style 5min). For production, add Redis and optional **BullMQ** for scrape/ingestion queues.

## Routes

| Path | Description |
|------|-------------|
| `/` | Screener Builder (filters, strategy upload, signals / compare mode) |
| `/indices` | Market indices (opens from header in a **new tab** via `target="_blank"`) |
| `/compare-strategies` | How-to for compare mode |
| `/symbol/[ticker]` | Symbol detail + chart workspace (opens from signal rows in a **new tab**) |

## Compare mode

1. Upload two or more strategy files.
2. Turn on **Use for signals** for at least two cards.
3. Click **Run**. You get split panes, overlap colours, intersection panel, Venn-style counts, sync scroll, and BUY/SELL conflict counts.

## Adding NASDAQ

Edit `src/config/market.config.ts`: set `US.enabled` to `true`, point `screenerProvider` at your US data adapter, and map tickers in API routes.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
