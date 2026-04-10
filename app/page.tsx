"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import styles from "./page.module.css";
import type { DashboardEvent, EventType, PricePoint, StockConfig } from "@/lib/types";

interface DashboardResponse {
  ticker: string;
  company: string;
  prices: PricePoint[];
  events: DashboardEvent[];
}

export default function Page() {
  const [tickers, setTickers] = useState<StockConfig[]>([]);
  const [selectedTicker, setSelectedTicker] = useState("NBIS");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabledEventTypes, setEnabledEventTypes] = useState<EventType[]>([
    "8-K",
    "guidance",
    "gap",
    "earnings",
    "press"
  ]);

  useEffect(() => {
    fetch("/api/tickers")
      .then((res) => res.json())
      .then((data) => {
        setTickers(data.tickers ?? []);
      })
      .catch(() => {
        setError("Unable to load ticker config.");
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/dashboard?ticker=${selectedTicker}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((data: DashboardResponse) => setDashboard(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedTicker]);

  const recentEvents = useMemo(() => {
    return dashboard?.events
      .filter((event) => enabledEventTypes.includes(event.type))
      .slice(0, 10) ?? [];
  }, [dashboard, enabledEventTypes]);

  const availableEventTypes = useMemo(() => {
    const found = new Set<EventType>(dashboard?.events.map((event) => event.type) ?? []);
    return ["8-K", "guidance", "gap", "earnings", "press"].filter((type) => found.has(type as EventType)) as EventType[];
  }, [dashboard]);

  function toggleEventType(type: EventType) {
    setEnabledEventTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Event-Driven Equity Tracker</p>
        <h1 className={styles.title}>Nebius Market Radar</h1>
        <p className={styles.subtitle}>
          12-month chart with SEC 8-K filings, guidance signals, press releases, earnings dates,
          and automatic gap-day markers.
        </p>
      </section>

      <section className={styles.controls}>
        <label className={styles.label}>
          Ticker
          <select
            className={styles.select}
            value={selectedTicker}
            onChange={(event) => setSelectedTicker(event.target.value)}
          >
            {tickers.map((item) => (
              <option key={item.ticker} value={item.ticker}>
                {item.ticker} - {item.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className={styles.labelText}>Event filters</p>
          <div className={styles.filterWrap}>
            {availableEventTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={enabledEventTypes.includes(type) ? styles.filterButtonOn : styles.filterButton}
                onClick={() => toggleEventType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading && <p>Loading dashboard...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && dashboard && (
        <section className={styles.cards}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{dashboard.company} ({dashboard.ticker})</h2>
            <ChartCard
              prices={dashboard.prices}
              events={dashboard.events}
              enabledEventTypes={enabledEventTypes}
            />
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Latest Events</h2>
            {recentEvents.length === 0 ? (
              <p className={styles.empty}>No events in the current time range.</p>
            ) : (
              <ul className={styles.list}>
                {recentEvents.map((event, index) => (
                  <li key={`${event.date}-${event.type}-${index}`} className={styles.listItem}>
                    <div className={styles.row}>
                      <span className={styles.typeBadge}>{event.type}</span>
                      <span>{event.title}</span>
                    </div>
                    <p className={styles.date}>{event.date}</p>
                    {event.details ? <p className={styles.small}>{event.details}</p> : null}
                    {event.url ? (
                      <a href={event.url} target="_blank" rel="noreferrer" className={styles.small}>
                        Open source
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

      <p className={styles.footer}>
        Add more tickers in config/tickers.json and redeploy.
      </p>
    </main>
  );
}
