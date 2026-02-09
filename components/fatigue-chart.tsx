"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const LIFT_COLORS: Record<string, string> = {
  squat: "hsl(263, 70%, 58%)",   // violet
  bench: "hsl(190, 80%, 55%)",   // cyan
  deadlift: "hsl(340, 75%, 55%)", // pink
};

export interface FatigueDataPoint {
  label: string;
  total: number;
  squat: number;
  bench: number;
  deadlift: number;
  sleepQuality: number | null;
  sleepTime: number | null;
  sleepAdjusted: boolean;
}

interface FatigueChartProps {
  data: FatigueDataPoint[];
  liftTypes: string[];
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
  payload: FatigueDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function FatigueTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload as FatigueDataPoint | undefined;
  if (!point) return null;

  return (
    <div
      className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md"
      style={{ minWidth: 140 }}
    >
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground mb-1">
        Total: <span className="text-foreground font-medium">{Math.round(point.total)}</span>
        {point.sleepAdjusted && (
          <span className="text-muted-foreground ml-1">(sleep adj.)</span>
        )}
      </p>
      {payload.map((entry) => (
        entry.value > 0 && (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {Math.round(entry.value)}
          </p>
        )
      ))}
      {point.sleepTime !== null && (
        <p className="text-muted-foreground mt-1">
          Sleep: {point.sleepTime}h
          {point.sleepQuality !== null && ` / ${point.sleepQuality}%`}
        </p>
      )}
    </div>
  );
}

export function FatigueChart({ data, liftTypes }: FatigueChartProps) {
  if (data.length === 0 || liftTypes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No fatigue data to display. Ensure your RPE column is mapped and contains values.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 10 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(240, 5%, 64.9%)" }}
              axisLine={{ stroke: "hsl(240, 3.7%, 15.9%)" }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(240, 5%, 64.9%)" }}
              axisLine={{ stroke: "hsl(240, 3.7%, 15.9%)" }}
              tickLine={false}
              width={60}
            />
            <Tooltip
              content={<FatigueTooltip />}
              cursor={{ fill: "hsl(240, 3.7%, 15.9%)", opacity: 0.3 }}
            />
            {liftTypes.map((liftType) => (
              <Bar
                key={liftType}
                dataKey={liftType}
                stackId="fatigue"
                fill={LIFT_COLORS[liftType] ?? "hsl(240, 5%, 64.9%)"}
                name={liftType.charAt(0).toUpperCase() + liftType.slice(1)}
                radius={liftType === liftTypes[liftTypes.length - 1] ? [2, 2, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
