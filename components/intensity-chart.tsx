"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import type { IntensityZonePoint } from "@/lib/stats/computations";

const ZONE_COLORS = {
  zone1: "hsl(140, 60%, 45%)",  // green — < 70%
  zone2: "hsl(45, 90%, 52%)",   // amber — 70–80%
  zone3: "hsl(25, 85%, 52%)",   // orange — 80–90%
  zone4: "hsl(0, 72%, 52%)",    // red — > 90%
};

const ZONE_LABELS = {
  zone1: "< 70% (GPP)",
  zone2: "70–80% (Volume)",
  zone3: "80–90% (Strength)",
  zone4: "> 90% (Peaking)",
};

interface IntensityChartProps {
  data: IntensityZonePoint[];
}

export function IntensityChart({ data }: IntensityChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No intensity data to display. Set your gym PRs in your profile and ensure the weight column is mapped.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        <ResponsiveContainer width="100%" height={300}>
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
              width={40}
              label={{ value: "Sets", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "hsl(240, 5%, 64.9%)" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240, 10%, 3.9%)",
                border: "1px solid hsl(240, 3.7%, 15.9%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(0, 0%, 98%)", marginBottom: "4px" }}
              formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, (name ? ZONE_LABELS[name as keyof typeof ZONE_LABELS] : undefined) ?? name ?? ""]}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) => ZONE_LABELS[value as keyof typeof ZONE_LABELS] ?? value}
            />
            <Bar dataKey="zone1" stackId="zones" fill={ZONE_COLORS.zone1} name="zone1" radius={[0, 0, 0, 0]} />
            <Bar dataKey="zone2" stackId="zones" fill={ZONE_COLORS.zone2} name="zone2" radius={[0, 0, 0, 0]} />
            <Bar dataKey="zone3" stackId="zones" fill={ZONE_COLORS.zone3} name="zone3" radius={[0, 0, 0, 0]} />
            <Bar dataKey="zone4" stackId="zones" fill={ZONE_COLORS.zone4} name="zone4" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
