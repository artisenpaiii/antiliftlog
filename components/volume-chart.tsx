"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(263, 70%, 58%)",  // primary violet
  "hsl(190, 80%, 55%)",  // cyan
  "hsl(340, 75%, 55%)",  // pink
  "hsl(45, 90%, 55%)",   // amber
  "hsl(140, 60%, 50%)",  // green
  "hsl(25, 85%, 55%)",   // orange
  "hsl(210, 75%, 60%)",  // blue
  "hsl(300, 60%, 55%)",  // purple
  "hsl(170, 65%, 45%)",  // teal
  "hsl(0, 70%, 55%)",    // red
];

interface WeekDataPoint {
  label: string;
  [exerciseName: string]: number | string;
}

interface VolumeChartProps {
  data: WeekDataPoint[];
  exercises: string[];
}

export function VolumeChart({ data, exercises }: VolumeChartProps) {
  if (data.length === 0 || exercises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No volume data to display.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "hsl(240, 5%, 64.9%)" }}
              axisLine={{ stroke: "hsl(240, 3.7%, 15.9%)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(240, 5%, 64.9%)" }}
              axisLine={{ stroke: "hsl(240, 3.7%, 15.9%)" }}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240, 10%, 3.9%)",
                border: "1px solid hsl(240, 3.7%, 15.9%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(0, 0%, 98%)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
            />
            {exercises.map((exercise, index) => (
              <Line
                key={exercise}
                type="monotone"
                dataKey={exercise}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
