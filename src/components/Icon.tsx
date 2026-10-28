import type { CSSProperties } from "react";

// A small, zero-dependency inline-SVG icon set (Feather-ish, 24×24, stroke =
// currentColor). Tinted by passing `color`. Keeps the bundle tiny and lets every
// tab / section / KPI / action carry a crisp, colourful icon.

export type IconName =
  | "gauge"
  | "layers"
  | "users"
  | "factory"
  | "bars"
  | "rocket"
  | "mic"
  | "scale"
  | "balance"
  | "shield"
  | "shieldCheck"
  | "handshake"
  | "target"
  | "search"
  | "arrowLeft"
  | "download"
  | "refresh"
  | "external"
  | "flag"
  | "calendar"
  | "link"
  | "check"
  | "globe"
  | "building"
  | "sparkles"
  | "quote"
  | "alert"
  | "trendUp"
  | "chevronRight"
  | "play"
  | "doc"
  | "x";

const PATHS: Record<IconName, React.ReactNode> = {
  gauge: (
    <>
      <path d="M12 13a2 2 0 1 0 0-.01" />
      <path d="M12 13l4-3" />
      <path d="M4.5 18a9 9 0 1 1 15 0" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 6a3 3 0 0 1 0 6" />
      <path d="M17 14a6 6 0 0 1 4 6" />
    </>
  ),
  factory: (
    <>
      <path d="M3 21V9l6 4V9l6 4V7l6 4v10H3Z" />
      <path d="M7 21v-4M12 21v-4M17 21v-4" />
    </>
  ),
  bars: (
    <>
      <path d="M4 20h16" />
      <rect x="5" y="11" width="3.2" height="7" rx="1" />
      <rect x="10.4" y="7" width="3.2" height="11" rx="1" />
      <rect x="15.8" y="13" width="3.2" height="5" rx="1" />
    </>
  ),
  rocket: (
    <>
      <path d="M5 15c-1.5 1-2 4-2 4s3-.5 4-2a2.1 2.1 0 0 0-2-2Z" />
      <path d="M8.5 14.5 6 12s.5-5 5-8c2.5-1.5 6-1 6-1s.5 3.5-1 6c-3 4.5-8 5-8 5Z" />
      <circle cx="14" cy="8" r="1.3" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M7 20h10" />
      <path d="M5 8h14l-3 5a3 3 0 0 1-6 0L5 8Z" />
      <path d="M12 4 5 8M12 4l7 4" />
    </>
  ),
  balance: (
    <>
      <path d="M12 3v18M4 7h16" />
      <path d="M4 7l-2 5a2.5 2.5 0 0 0 5 0L5 7M20 7l-2 5a2.5 2.5 0 0 0 5 0l-2-5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
      <path d="m9 11 2 2 4-4" />
    </>
  ),
  handshake: (
    <>
      <path d="m3 12 3-3 5 4 2-2 5 4 3-3" />
      <path d="m11 13 2 2M13 11l2 2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.3" />
      <path d="M21 4v5h-5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 3 2 3H5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7L11 7" />
      <path d="M14 10a4 4 0 0 0-5.7 0L6 12.3a4 4 0 0 0 5.7 5.7L13 17" />
    </>
  ),
  check: <path d="m5 12 4 4 10-10" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" />
    </>
  ),
  quote: (
    <>
      <path d="M8 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-2a2 2 0 0 1 2-2V9a2 2 0 0 0-1-2Z" />
      <path d="M19 7h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-2a2 2 0 0 1 2-2V9a2 2 0 0 0-1-2Z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  trendUp: (
    <>
      <path d="m4 16 5-5 3 3 7-7" />
      <path d="M16 7h4v4" />
    </>
  ),
  chevronRight: <path d="m9 6 6 6-6 6" />,
  play: <path d="M7 4v16l13-8L7 4Z" />,
  doc: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Icon({
  name,
  size = 18,
  color = "currentColor",
  strokeWidth = 2,
  style,
  className,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, display: "block", ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}

/** A rounded, tinted icon chip (icon on a soft accent background). */
export function IconChip({
  name,
  color,
  bg,
  size = 30,
  icon = 17,
  radius = 9,
  style,
}: {
  name: IconName;
  color: string;
  bg: string;
  size?: number;
  icon?: number;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      <Icon name={name} size={icon} color={color} />
    </span>
  );
}
