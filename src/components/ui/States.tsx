import type { ReactNode } from "react";
import { CircleSlash, TriangleAlert } from "lucide-react";

export function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`gs-shimmer ${className}`} style={style} />;
}

/** A card-body-sized shimmer placeholder for a loading chart/table. */
export function ChartSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex min-h-[160px] flex-col justify-center gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} style={{ height: 14, width: `${90 - i * 9}%` }} />
      ))}
    </div>
  );
}

function Centered({ icon, title, hint, tone = "#94a3b8", bg = "#f1f5f9" }: { icon: ReactNode; title: string; hint?: string; tone?: string; bg?: string }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 p-4 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: bg, color: tone }}>
        {icon}
      </span>
      <div className="text-[13px] font-semibold text-slate">{title}</div>
      {hint && <div className="max-w-[300px] text-[12px] leading-snug text-grey">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title = "Not available", hint }: { title?: string; hint?: string }) {
  return <Centered icon={<CircleSlash size={20} />} title={title} hint={hint ?? "The sources didn't contain this — nothing was guessed."} />;
}

export function NotApplicable({ reason }: { reason?: string }) {
  return <Centered icon={<CircleSlash size={20} />} title="Not applicable" hint={reason ?? "This section doesn't apply to this company."} tone="#64748b" bg="#f1f5f9" />;
}

export function ErrorState({ title = "Couldn't load this", hint = "Please try again shortly." }: { title?: string; hint?: string }) {
  return <Centered icon={<TriangleAlert size={20} />} title={title} hint={hint} tone="#dc2626" bg="#fef2f2" />;
}
