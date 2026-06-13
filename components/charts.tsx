"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const C = {
  primary: "#34d399",
  danger: "#f87171",
  warning: "#fbbf24",
  info: "#60a5fa",
  violet: "#a78bfa",
  grid: "#243040",
  axis: "#5d6b7e",
};

const PIE_COLORS = [
  C.primary,
  C.info,
  C.violet,
  C.warning,
  C.danger,
  "#22d3ee",
  "#f472b6",
  "#a3e635",
  "#fb923c",
  "#818cf8",
];

function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}
function rupees(n: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
}

const tooltipStyle = {
  background: "#121821",
  border: "1px solid #243040",
  borderRadius: 10,
  fontSize: 12,
  color: "#e6edf3",
};

export function NetWorthChart({
  data,
}: {
  data: { month: string; net: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.primary} stopOpacity={0.4} />
            <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="month" stroke={C.axis} fontSize={12} tickLine={false} />
        <YAxis
          stroke={C.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={compact}
          width={48}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any) => [rupees(v), "Net worth"]}
        />
        <Area
          type="monotone"
          dataKey="net"
          stroke={C.primary}
          strokeWidth={2.5}
          fill="url(#nw)"
          dot={{ r: 3, fill: C.primary }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseChart({
  data,
}: {
  data: { month: string; income: number; expense: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="month" stroke={C.axis} fontSize={12} tickLine={false} />
        <YAxis
          stroke={C.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={compact}
          width={48}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => rupees(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill={C.primary} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill={C.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (data.length === 0)
    return <Empty label="No expenses recorded this month yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => rupees(v)} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          layout="vertical"
          align="right"
          verticalAlign="middle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DebtBar({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <Empty label="No debts. Nicely done." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={C.grid} horizontal={false} />
        <XAxis
          type="number"
          stroke={C.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={compact}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke={C.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "#ffffff08" }}
          formatter={(v: any) => rupees(v)}
        />
        <Bar dataKey="value" fill={C.danger} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function InvestmentBar({
  data,
}: {
  data: { name: string; invested: number; value: number }[];
}) {
  if (data.length === 0)
    return <Empty label="No investments tracked yet." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 56)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={C.grid} horizontal={false} />
        <XAxis
          type="number"
          stroke={C.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={compact}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke={C.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => rupees(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="invested" name="Invested" fill={C.info} radius={[0, 4, 4, 0]} />
        <Bar dataKey="value" name="Value" fill={C.primary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted">
      {label}
    </div>
  );
}
