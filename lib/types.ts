export type EventType = "8-K" | "guidance" | "gap" | "earnings" | "press";

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DashboardEvent {
  date: string;
  type: EventType;
  title: string;
  url?: string;
  details?: string;
}

export interface StockConfig {
  ticker: string;
  name: string;
  investorRelationsUrl: string;
  secEntityName: string;
  earningsDates: string[];
  manualEvents?: DashboardEvent[];
  gapThresholdPct?: number;
}
