import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LifecyclePoint } from "@/shared/types";

export function SignalLifecycle({ data }: { data: LifecyclePoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55}/>
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--magma))" stopOpacity={0.45}/>
              <stop offset="100%" stopColor="hsl(var(--magma))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border) / 0.3)" strokeDasharray="3 3" vertical={false}/>
          <XAxis dataKey="t" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false}/>
          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} width={32}/>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover) / 0.95)",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
              fontFamily: "JetBrains Mono",
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          />
          <Area
            type="monotone"
            dataKey="historical"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#histGrad)"
            name="Historical"
          />
          <Area
            type="monotone"
            dataKey="predicted"
            stroke="hsl(var(--magma))"
            strokeWidth={2}
            strokeDasharray="6 4"
            fill="url(#predGrad)"
            name="AI Predicted"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
