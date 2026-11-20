"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import { money } from "@/lib/format";

// Vertical bars, largest first, one value per label (expense categories, salespeople).
// One hue per chart; paired charts use validated slots 1 and 2 so they read as different measures.
const COLORS = { blue: "#2a78d6", orange: "#eb6834" } as const;
const MAX_CHARS = 10;

type Row = { name: string; value: number };

const fmt = (kind: "money" | "percent", v: number) =>
  kind === "money" ? money(v) : `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
const axisFmt = (kind: "money" | "percent", v: number) =>
  kind === "money" ? `$${Math.round(v / 1000)}k` : `${Math.round(v * 100)}%`;

// Wrap a label into short lines; hyphenate any single word longer than a line.
function wrapLabel(text: string) {
  const lines: string[] = [];
  let line = "";
  for (let word of text.split(" ")) {
    while (word.length > MAX_CHARS) {
      if (line) {
        lines.push(line);
        line = "";
      }
      const cut = Math.ceil(word.length / 2);
      lines.push(word.slice(0, cut) + "-");
      word = word.slice(cut);
    }
    if (line && (line + " " + word).length > MAX_CHARS) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Value written bottom-to-top inside the bar; bars too short for the text get it just above instead.
function VerticalLabel({ x, y, width, height, text }: { x: number; y: number; width: number; height: number; text: string }) {
  const needed = text.length * 6.6 + 12; // ~px of 11px text plus padding
  const cx = x + width / 2;
  const inside = height >= needed;
  const ty = inside ? y + height - 6 : y - 6;
  return (
    <text
      x={cx}
      y={ty}
      transform={`rotate(-90 ${cx} ${ty})`}
      textAnchor="start"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={inside ? 600 : 400}
      fill={inside ? "#ffffff" : "#3f3f46"}
    >
      {text}
    </text>
  );
}

function WrappedTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const lines = wrapLabel(payload?.value ?? "");
  return (
    <text
      x={x}
      y={(y ?? 0) + 12}
      textAnchor="middle"
      fontSize={11}
      fill="#52525b"
    >
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i ? 13 : 0}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

export function RankedBarChart({
  data,
  kind,
  label,
  color,
}: {
  data: Row[];
  kind: "money" | "percent";
  label: string;
  color: keyof typeof COLORS;
}) {
  const rows = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  if (rows.length === 0)
    return <p className="text-sm text-zinc-500">Nothing to show yet.</p>;
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 20, right: 8, left: 0, bottom: 8 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e4e4e7"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            interval={0}
            height={54}
            tick={<WrappedTick />}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickFormatter={(v) => axisFmt(kind, Number(v))}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ fill: "#f4f4f5" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e4e4e7",
              fontSize: 12,
            }}
            formatter={(v) => [fmt(kind, Number(v)), label]}
          />
          <Bar dataKey="value" fill={COLORS[color]} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="value"
              content={(p) => (
                <VerticalLabel
                  x={Number(p.x)}
                  y={Number(p.y)}
                  width={Number(p.width)}
                  height={Number(p.height)}
                  text={fmt(kind, Number(p.value))}
                />
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
