"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from "recharts";
import type { E1RMDataPoint } from "@/lib/stats/e1rm-computations";
import type { LiftType } from "@/lib/stats/types";

const LIFT_COLORS: Record<LiftType, string> = {
  squat: "hsl(263, 70%, 58%)",
  bench: "hsl(190, 80%, 55%)",
  deadlift: "hsl(340, 75%, 55%)",
};

interface UserPRRefs {
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
}

interface E1RMChartProps {
  data: E1RMDataPoint[];
  activeLiftTypes: LiftType[];
  userPRs: UserPRRefs;
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
  payload: E1RMDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function E1RMTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as E1RMDataPoint | undefined;
  if (!point) return null;

  const lifts: LiftType[] = ["squat", "bench", "deadlift"];

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md" style={{ minWidth: 180 }}>
      <p className="font-medium text-foreground mb-2">{label}</p>
      {lifts.map((lift) => {
        const e1rm = point[lift];
        const details = point[`${lift}Details` as keyof E1RMDataPoint] as { weight: number; reps: number; rpe: number } | null;
        if (!e1rm || !details) return null;
        return (
          <div key={lift} className="mb-1" style={{ color: LIFT_COLORS[lift] }}>
            <span className="capitalize font-medium">{lift}</span>
            <span className="text-foreground">: {Math.round(e1rm)} kg e1RM</span>
            <span className="text-muted-foreground ml-1">
              ({details.weight}kg × {details.reps} @ RPE {details.rpe})
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function E1RMChart({ data, activeLiftTypes, userPRs }: E1RMChartProps) {
  if (data.length === 0 || activeLiftTypes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No e1RM data to display. Ensure your RPE and weight columns are mapped and contain values.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 10 }}>
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
              width={55}
              unit=" kg"
            />
            <Tooltip content={<E1RMTooltip />} cursor={{ stroke: "hsl(240, 3.7%, 15.9%)", strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />

            {/* PR reference lines */}
            {activeLiftTypes.map((lift) => {
              const pr = userPRs[lift];
              if (!pr) return null;
              return (
                <ReferenceLine
                  key={`pr-${lift}`}
                  y={pr}
                  stroke={LIFT_COLORS[lift]}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
              );
            })}

            {/* Actual e1RM dots per session */}
            {activeLiftTypes.map((lift) => (
              <Line
                key={`${lift}-raw`}
                type="monotone"
                dataKey={lift}
                name={lift.charAt(0).toUpperCase() + lift.slice(1)}
                stroke={LIFT_COLORS[lift]}
                strokeWidth={0}
                dot={{ r: 3, fill: LIFT_COLORS[lift], strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                legendType="none"
              />
            ))}

            {/* Smoothed moving-average lines */}
            {activeLiftTypes.map((lift) => (
              <Line
                key={`${lift}-smooth`}
                type="monotone"
                dataKey={`${lift}Smoothed`}
                name={`${lift.charAt(0).toUpperCase() + lift.slice(1)} (avg)`}
                stroke={LIFT_COLORS[lift]}
                strokeWidth={2}
                dot={false}
                activeDot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
