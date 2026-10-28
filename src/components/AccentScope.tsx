"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Accent } from "@/lib/theme";

const DEFAULT: Accent = { main: "#2563eb", soft: "#eff6ff", line: "#dbeafe" };

const AccentContext = createContext<Accent>(DEFAULT);

/** Wrap a tab (or a section) so every WidgetCard / SubHeading inside picks up
 *  the same vivid accent without threading the colour through each one. */
export function AccentScope({ accent, children }: { accent: Accent; children: ReactNode }) {
  return <AccentContext.Provider value={accent}>{children}</AccentContext.Provider>;
}

export function useAccent(): Accent {
  return useContext(AccentContext);
}
