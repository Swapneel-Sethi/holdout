import type { Severity, ColumnKind } from "@/lib/audit/types";

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "bg-red",
  high: "bg-amber",
  medium: "bg-blue",
  low: "bg-faint",
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  critical: "text-red",
  high: "text-amber",
  medium: "text-blue",
  low: "text-faint",
};

export function SeverityDot({ severity, pulse = false }: { severity: Severity; pulse?: boolean }) {
  return (
    <span
      className={`inline-block size-[7px] shrink-0 rounded-full ${SEVERITY_COLOR[severity]}`}
      style={pulse ? { animation: "pulse-dot 2s ease-in-out infinite" } : undefined}
      aria-hidden="true"
    />
  );
}

export function KindBadge({ kind }: { kind: ColumnKind }) {
  const map: Record<ColumnKind, string> = {
    numeric: "text-blue",
    datetime: "text-green",
    categorical: "text-amber",
    boolean: "text-muted",
    text: "text-faint",
  };
  return <span className={`mono text-[10px] uppercase tracking-wider ${map[kind]}`}>{kind}</span>;
}

export function MetricBar({
  value,
  tone = "blue",
  height = 6,
}: {
  value: number;
  tone?: "blue" | "red" | "green" | "amber";
  height?: number;
}) {
  const colors = {
    blue: "#57c1ff",
    red: "#ff6161",
    green: "#59d499",
    amber: "#f3b562",
  };
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="score-track w-full" style={{ height }} aria-hidden="true">
      <div className="score-fill" style={{ width: `${pct}%`, background: colors[tone] }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "blue" | "red" | "green" | "amber";
}) {
  const tones = {
    ink: "text-ink",
    blue: "text-blue",
    red: "text-red",
    green: "text-green",
    amber: "text-amber",
  };
  return (
    <div>
      <p className="label">{label}</p>
      <p className={`mono mt-1.5 text-[20px] leading-none tracking-tight ${tones[tone]}`}>{value}</p>
      {sub ? <p className="mt-1.5 text-[11px] leading-snug text-faint">{sub}</p> : null}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-line ${className}`} />;
}
