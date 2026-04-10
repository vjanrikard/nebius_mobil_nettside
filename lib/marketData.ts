import * as cheerio from "cheerio";
import Parser from "rss-parser";
import type { DashboardEvent, PricePoint, StockConfig } from "./types";

const parser = new Parser();

function ensureIsoDate(dateValue: string | Date): string {
  const date = new Date(dateValue);
  return date.toISOString().slice(0, 10);
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export async function fetchPriceSeries(ticker: string): Promise<PricePoint[]> {
  const now = new Date();
  const start = new Date(now);
  start.setFullYear(now.getFullYear() - 1);

  const query = new URLSearchParams({
    period1: String(toUnixSeconds(start)),
    period2: String(toUnixSeconds(now)),
    interval: "1d",
    events: "history",
    includeAdjustedClose: "true"
  });

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?${query.toString()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load chart data for ${ticker}`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps: number[] = result?.timestamp ?? [];

  if (!quote || !timestamps.length) {
    return [];
  }

  const points: PricePoint[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i] ?? 0;

    if ([open, high, low, close].some((v) => v == null)) {
      continue;
    }

    points.push({
      date: ensureIsoDate(new Date(timestamps[i] * 1000)),
      open,
      high,
      low,
      close,
      volume
    });
  }

  return points;
}

async function findCikByTicker(ticker: string): Promise<string | null> {
  const response = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: {
      "User-Agent": "NebiusDashboard/1.0 admin@example.com",
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const record = Object.values(data).find(
    (item: unknown) =>
      typeof item === "object" &&
      item !== null &&
      "ticker" in item &&
      String((item as { ticker: string }).ticker).toUpperCase() === ticker.toUpperCase()
  ) as { cik_str: number } | undefined;

  if (!record?.cik_str) {
    return null;
  }

  return String(record.cik_str).padStart(10, "0");
}

export async function fetchSecEvents(config: StockConfig): Promise<DashboardEvent[]> {
  const cik = await findCikByTicker(config.ticker);
  if (!cik) {
    return [];
  }

  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "NebiusDashboard/1.0 admin@example.com",
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const recent = data?.filings?.recent;
  const forms: string[] = recent?.form ?? [];
  const filingDates: string[] = recent?.filingDate ?? [];
  const accessionNumbers: string[] = recent?.accessionNumber ?? [];
  const primaryDocuments: string[] = recent?.primaryDocument ?? [];

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  const events: DashboardEvent[] = [];

  for (let i = 0; i < forms.length; i += 1) {
    const form = forms[i];
    const date = filingDates[i];
    if (!date) {
      continue;
    }

    if (new Date(date) < startDate) {
      continue;
    }

    if (form !== "8-K") {
      continue;
    }

    const accession = accessionNumbers[i]?.replaceAll("-", "");
    const primaryDoc = primaryDocuments[i];
    const filingUrl = accession && primaryDoc
      ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/${primaryDoc}`
      : undefined;

    events.push({
      date,
      type: "8-K",
      title: "8-K filing",
      url: filingUrl
    });
  }

  return events;
}

function toAbsoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

export async function fetchPressReleases(config: StockConfig): Promise<DashboardEvent[]> {
  const rssCandidates = [
    `${config.investorRelationsUrl}/news-events/press-releases/rss`,
    `${config.investorRelationsUrl}/news-events/press-releases/default.aspx?output=1`,
    `${config.investorRelationsUrl}/rss`
  ];

  for (const candidate of rssCandidates) {
    try {
      const feed = await parser.parseURL(candidate);
      const events = (feed.items ?? [])
        .filter((item) => item.pubDate)
        .map((item) => ({
          date: ensureIsoDate(item.pubDate ?? new Date()),
          type: "press" as const,
          title: item.title ?? "Press release",
          url: item.link
        }));

      if (events.length > 0) {
        return events;
      }
    } catch {
      // Try next source.
    }
  }

  try {
    const page = await fetch(`${config.investorRelationsUrl}/news-events/press-releases`, {
      cache: "no-store"
    });

    if (!page.ok) {
      return [];
    }

    const html = await page.text();
    const $ = cheerio.load(html);
    const links = $("a")
      .map((_i, el) => ({
        text: $(el).text().trim(),
        href: $(el).attr("href") ?? ""
      }))
      .get()
      .filter((item) => /press|release|news/i.test(item.text) && item.href);

    return links.slice(0, 12).map((item, index) => ({
      date: ensureIsoDate(new Date(Date.now() - index * 24 * 60 * 60 * 1000)),
      type: "press",
      title: item.text || "Press release",
      url: toAbsoluteUrl(config.investorRelationsUrl, item.href)
    }));
  } catch {
    return [];
  }
}

const GUIDANCE_KEYWORDS = ["guidance", "outlook", "raises", "lowers", "forecast"];

export function deriveGuidanceEvents(events: DashboardEvent[]): DashboardEvent[] {
  return events
    .filter((event) => GUIDANCE_KEYWORDS.some((keyword) => event.title.toLowerCase().includes(keyword)))
    .map((event) => ({
      ...event,
      type: "guidance",
      title: `Guidance signal: ${event.title}`
    }));
}

export function deriveGapEvents(prices: PricePoint[], thresholdPct = 6): DashboardEvent[] {
  const events: DashboardEvent[] = [];

  for (let i = 1; i < prices.length; i += 1) {
    const current = prices[i];
    const previous = prices[i - 1];
    const gapPct = ((current.open - previous.close) / previous.close) * 100;

    if (Math.abs(gapPct) >= thresholdPct) {
      events.push({
        date: current.date,
        type: "gap",
        title: `${gapPct > 0 ? "Gap up" : "Gap down"} ${gapPct.toFixed(1)}%`,
        details: `Open ${current.open.toFixed(2)} vs prior close ${previous.close.toFixed(2)}`
      });
    }
  }

  return events;
}

export function deriveEarningsEvents(config: StockConfig): DashboardEvent[] {
  return config.earningsDates.map((date) => ({
    date,
    type: "earnings",
    title: "Earnings date"
  }));
}

export function sortEvents(events: DashboardEvent[]): DashboardEvent[] {
  return [...events].sort((a, b) => (a.date < b.date ? 1 : -1));
}
