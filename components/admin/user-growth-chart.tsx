"use client";

import { useState } from "react";
import { TrendingUp, Users } from "lucide-react";

import type { UserGrowth } from "@/lib/admin/user-growth";
import { formatNumber } from "@/lib/utils";

const LEFT = 40;
const RIGHT = 630;
const TOP = 26;
const BOTTOM = 174;

function axisMaximum(value: number): number {
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export function UserGrowthChart({ growth }: { growth: UserGrowth }) {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const data = growth[period];
  const maximum = axisMaximum(growth.total);
  const points = data.values.map((value, index) => ({
    x: LEFT + (index * (RIGHT - LEFT)) / (data.values.length - 1),
    y: BOTTOM - (value / maximum) * (BOTTOM - TOP),
    label: data.labels[index],
    value,
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${RIGHT} ${BOTTOM} L ${LEFT} ${BOTTOM} Z`;

  return (
    <section aria-labelledby="user-growth-title" className="space-y-4">
      <div>
        <h2 id="user-growth-title" className="text-lg font-semibold tracking-tight">Pertumbuhan pengguna</h2>
        <p className="mt-1 text-sm text-muted-foreground">Mahasiswa yang pernah masuk Karsa, terakumulasi dari waktu ke waktu.</p>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-border/80 bg-card/75 p-5 shadow-soft backdrop-blur-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-primary" aria-hidden />
              Total pengguna kumulatif
            </div>
            <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
              {formatNumber(growth.total)} <span className="text-base font-medium tracking-normal text-muted-foreground">mahasiswa</span>
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              +{formatNumber(data.gained)} pengguna dibanding {period === "weekly" ? "minggu" : "bulan"} sebelumnya
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-border/80 bg-background/75 p-1" role="group" aria-label="Periode grafik">
            {(["weekly", "monthly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => setPeriod(option)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[.97] ${period === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {option === "weekly" ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox="0 0 660 214"
            className="h-auto min-w-[540px] w-full"
            role="img"
            aria-label={`Grafik ${period === "weekly" ? "mingguan" : "bulanan"}: total mahasiswa naik hingga ${formatNumber(growth.total)}. Penambahan periode ini ${formatNumber(data.gained)} mahasiswa.`}
          >
            <defs>
              <linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".18" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((step) => {
              const y = BOTTOM - (step / 4) * (BOTTOM - TOP);
              return (
                <g key={step}>
                  <line x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="3 5" />
                  <text x={LEFT - 11} y={y + 3} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="10">
                    {formatNumber(Math.round((step / 4) * maximum))}
                  </text>
                </g>
              );
            })}
            <path d={area} fill="url(#growth-fill)" />
            <path d={line} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point, index) => {
              const last = index === points.length - 1;
              return (
                <g key={`${period}-${index}`}>
                  {last && growth.total > 0 ? <circle cx={point.x} cy={point.y} r="7" fill="hsl(var(--primary))" className="growth-endpoint-pulse" /> : null}
                  <circle cx={point.x} cy={point.y} r={last ? 5.5 : 3.5} fill={last ? "hsl(var(--primary))" : "hsl(var(--card))"} stroke="hsl(var(--primary))" strokeWidth="2">
                    <title>{point.label}: {formatNumber(point.value)} mahasiswa</title>
                  </circle>
                  <text x={point.x} y="204" textAnchor={index === 0 ? "start" : last ? "end" : "middle"} fill="hsl(var(--muted-foreground))" fontSize="10">
                    {point.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
