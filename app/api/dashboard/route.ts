import { NextRequest, NextResponse } from "next/server";
import { getStockConfig } from "@/lib/config";
import {
  deriveEarningsEvents,
  deriveGapEvents,
  deriveGuidanceEvents,
  fetchPressReleases,
  fetchPriceSeries,
  fetchSecEvents,
  sortEvents
} from "@/lib/marketData";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker") ?? "NBIS";
  const config = getStockConfig(ticker);

  if (!config) {
    return NextResponse.json({ error: `Unknown ticker: ${ticker}` }, { status: 404 });
  }

  try {
    const [prices, secEvents, pressEvents] = await Promise.all([
      fetchPriceSeries(config.ticker),
      fetchSecEvents(config),
      fetchPressReleases(config)
    ]);

    const guidanceEvents = deriveGuidanceEvents([...secEvents, ...pressEvents]);
    const gapEvents = deriveGapEvents(prices, config.gapThresholdPct ?? 6);
    const earningsEvents = deriveEarningsEvents(config);

    const allEvents = sortEvents([
      ...(config.manualEvents ?? []),
      ...secEvents,
      ...pressEvents,
      ...guidanceEvents,
      ...gapEvents,
      ...earningsEvents
    ]);

    return NextResponse.json({
      ticker: config.ticker,
      company: config.name,
      prices,
      events: allEvents,
      sources: {
        sec: "https://www.sec.gov",
        investorRelations: config.investorRelationsUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
