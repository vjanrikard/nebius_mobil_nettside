import tickerConfig from "@/config/tickers.json";
import type { StockConfig } from "./types";

export const STOCKS: StockConfig[] = tickerConfig as StockConfig[];

export function getStockConfig(ticker: string): StockConfig | undefined {
  return STOCKS.find((item) => item.ticker.toUpperCase() === ticker.toUpperCase());
}
