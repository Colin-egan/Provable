"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type StudyPoint = {
  name: string;
  createdAt: Date;
  ittEstimate: number;
  ittCiLower: number;
  ittCiUpper: number;
};

type Props = { studies: StudyPoint[] };

type TooltipPayload = {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
};

type ChartDatum = {
  date: number;
  name: string;
  estimate: number;
  ciLower: number;
  ciWidth: number;
};

function CustomTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow">
      <p className="font-medium">{d.name}</p>
      <p className="text-muted-foreground">
        ITT:{" "}
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
        }).format(d.estimate)}
      </p>
    </div>
  );
}

export function TrendChart({ studies }: Props) {
  if (studies.length < 2) return null;

  const sorted = [...studies].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const data: ChartDatum[] = sorted.map((s) => ({
    date: s.createdAt.getTime(),
    name: s.name,
    estimate: s.ittEstimate,
    ciLower: s.ittCiLower,
    ciWidth: s.ittCiUpper - s.ittCiLower,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          tickFormatter={(v: number) =>
            new Date(v).toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            })
          }
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          tick={{ fontSize: 11 }}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* CI band: stack ciLower (invisible base) + ciWidth (visible fill) */}
        <Area
          dataKey="ciLower"
          stroke="none"
          fill="transparent"
          stackId="ci"
          isAnimationActive={false}
        />
        <Area
          dataKey="ciWidth"
          stroke="none"
          fill="hsl(var(--primary))"
          fillOpacity={0.12}
          stackId="ci"
          isAnimationActive={false}
        />
        <Line
          dataKey="estimate"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4, fill: "hsl(var(--primary))" }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
