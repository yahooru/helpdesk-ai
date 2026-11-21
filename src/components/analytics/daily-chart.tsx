"use client";
import { useState } from "react";
import type { DayPoint } from "@/lib/analytics";

/**
 * Stacked daily columns: AI-resolved, handed off, and still with the assistant (neutral remainder).
 * Colors are shades of the brand palette validated for CVD separation; a legend, hover tooltip and
 * a table view carry identity and values so nothing relies on color alone.
 */
const SERIES = [
  { key: "aiResolved", label: "Resolved by AI", color: "#2747C8" },
  { key: "handedOff", label: "Handed to the team", color: "#C4860F" },
  { key: "open", label: "Still with the assistant", color: "#A7AFBD" },
] as const;

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function shortDay(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function DailyChart({ series }: { series: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const width = 760;
  const height = 220;
  const pad = { top: 12, right: 8, bottom: 26, left: 32 };
  const max = niceMax(Math.max(1, ...series.map((s) => s.total)));
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const band = plotW / series.length;
  const barW = Math.min(24, Math.max(4, band * 0.62));
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(series.length / 8);
  const hovered = hover != null ? series[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-sm" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5 text-muted">
              <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setTable((t) => !t)} className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
          {table ? "Show chart" : "Show table"}
        </button>
      </div>
      {table ? (
        <div className="scrollbar-thin max-h-72 overflow-auto rounded-[var(--radius-control)] border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-wash text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="type-figures">
              {[...series].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="px-3 py-1.5">{shortDay(d.day)}</td>
                  <td className="px-3 py-1.5 text-right">{d.aiResolved}</td>
                  <td className="px-3 py-1.5 text-right">{d.handedOff}</td>
                  <td className="px-3 py-1.5 text-right">{d.open}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Conversations per day by outcome">
            {ticks.map((t) => {
              const y = pad.top + plotH - (t / max) * plotH;
              return (
                <g key={t}>
                  <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} />
                  <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize={11} fill="var(--faint)" className="type-figures">
                    {Math.round(t)}
                  </text>
                </g>
              );
            })}
            {series.map((d, i) => {
              const x = pad.left + i * band + (band - barW) / 2;
              let y = pad.top + plotH;
              const segs = SERIES.map((s) => ({ ...s, value: d[s.key] })).filter((s) => s.value > 0);
              return (
                <g key={d.day}>
                  {segs.map((s, si) => {
                    const h = (s.value / max) * plotH;
                    const gap = si < segs.length - 1 ? 0 : 0;
                    y -= h;
                    const top = si === segs.length - 1;
                    const segH = Math.max(0, h - (si > 0 ? 2 : 0) - gap);
                    return top ? (
                      <path
                        key={s.key}
                        d={`M${x},${y + segH} v${-Math.max(0, segH - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${Math.max(0, segH - 4)} z`}
                        fill={s.color}
                        opacity={hover == null || hover === i ? 1 : 0.45}
                      />
                    ) : (
                      <rect key={s.key} x={x} y={y} width={barW} height={segH} fill={s.color} opacity={hover == null || hover === i ? 1 : 0.45} />
                    );
                  })}
                  {i % labelEvery === 0 ? (
                    <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--faint)">
                      {shortDay(d.day)}
                    </text>
                  ) : null}
                  <rect
                    x={pad.left + i * band}
                    y={pad.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    tabIndex={0}
                    aria-label={`${shortDay(d.day)}: ${d.total} conversations, ${d.aiResolved} resolved by AI, ${d.handedOff} handed to the team`}
                  />
                </g>
              );
            })}
          </svg>
          {hovered ? (
            <div
              className="pointer-events-none absolute top-0 z-10 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 py-2 text-xs shadow-md"
              style={{ left: `${Math.min(80, ((hover! + 0.5) / series.length) * 100)}%` }}
            >
              <p className="mb-1 font-semibold">{shortDay(hovered.day)}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="type-figures flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-[2px]" style={{ background: s.color }} aria-hidden />
                  {s.label}: <span className="font-semibold text-ink">{hovered[s.key]}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
