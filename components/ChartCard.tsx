"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { DashboardEvent, EventType, PricePoint } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const EVENT_COLOR: Record<string, string> = {
  "8-K": "#3b82f6",
  guidance: "#f59e0b",
  earnings: "#22c55e",
  gap: "#ef4444",
  press: "#94a3b8"
};

interface ChartCardProps {
  prices: PricePoint[];
  events: DashboardEvent[];
  enabledEventTypes: EventType[];
}

export function ChartCard({ prices, events, enabledEventTypes }: ChartCardProps) {
  const labels = prices.map((p) => p.date);
  const closeData = prices.map((p) => p.close);

  const markerDatasets = Object.keys(EVENT_COLOR)
    .filter((type) => enabledEventTypes.includes(type as EventType))
    .map((type) => ({
    label: type,
    data: prices.map((point) => {
      const hasEvent = events.some((event) => event.type === type && event.date === point.date);
      return hasEvent ? point.close : null;
    }),
    borderColor: "transparent",
    backgroundColor: "transparent",
    pointRadius: 5,
    pointHoverRadius: 7,
    showLine: false,
    pointBackgroundColor: EVENT_COLOR[type] ?? "#e5e7eb",
    pointBorderColor: "#0b1220"
  }));

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Close",
        data: closeData,
        borderColor: "#4df3cb",
        backgroundColor: "rgba(77, 243, 203, 0.2)",
        tension: 0.24,
        borderWidth: 2,
        pointRadius: 0
      },
      ...markerDatasets
    ]
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 6,
          color: "#8ea0be"
        },
        grid: {
          color: "rgba(142, 160, 190, 0.15)"
        }
      },
      y: {
        ticks: {
          color: "#8ea0be"
        },
        grid: {
          color: "rgba(142, 160, 190, 0.15)"
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: "#f5f7fa"
        }
      }
    }
  };

  return (
    <div style={{ height: 360 }}>
      <Line data={data} options={options} />
    </div>
  );
}
