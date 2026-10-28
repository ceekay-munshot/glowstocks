import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** The one tab-level opener: icon + title + subtitle on the left, controls on the right. */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  accent = "#4f46e5",
  right,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  accent?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[16px] font-bold leading-tight text-ink">
          {Icon && (
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${accent}16`, color: accent }}>
              <Icon size={16} strokeWidth={2.3} />
            </span>
          )}
          <span>{title}</span>
        </h2>
        {subtitle && <p className="mt-1 max-w-3xl text-[12.5px] leading-snug text-grey">{subtitle}</p>}
      </div>
      {right && <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">{right}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  pad = true,
  accent,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  /** optional thin top accent bar */
  accent?: string;
}) {
  return (
    <section className={`relative min-w-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-card ${pad ? "p-4 sm:p-5" : ""} ${className}`}>
      {accent && <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}00)` }} />}
      {children}
    </section>
  );
}

export function CardHeader({
  icon: Icon,
  title,
  subtitle,
  right,
  accent = "#4f46e5",
}: {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {Icon && (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${accent}16`, color: accent }}>
            <Icon size={17} strokeWidth={2.2} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-bold leading-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] leading-snug text-grey">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Badge({ children, color = "#64748b", soft = true, className = "" }: { children: ReactNode; color?: string; soft?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${className}`}
      style={soft ? { background: `${color}1c`, color } : { background: color, color: "#fff" }}
    >
      {children}
    </span>
  );
}

export function Pill({ children, color = "#334155", className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium ${className}`} style={{ borderColor: `${color}33`, color }}>
      {children}
    </span>
  );
}

/** A compact inline stat — used SPARINGLY (not a KPI wall). */
export function MiniStat({ label, value, sub, color = "#4f46e5" }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-2.5 shadow-card">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-grey">{label}</div>
      <div className="tnum mt-0.5 text-[19px] font-extrabold leading-none" style={{ color }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11.5px] leading-snug text-grey">{sub}</div>}
    </div>
  );
}
