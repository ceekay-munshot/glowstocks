// The provenance spine. Collects every source (harvested filing or web hit),
// assigns stable ids (S1, S2, …) that citations reference, and — after a section
// is extracted — walks the returned JSON to register any cited url and stamp each
// cited datum with its matching source_id. This is what guarantees the Sources
// panel captures everything the report cites.

import type { SourceRef, SourceType } from "@/lib/types/report";
import type { HarvestedDoc } from "./harvest";
import type { FcHit } from "./firecrawl";

function kindToType(kind: HarvestedDoc["kind"]): SourceType {
  if (kind === "presentation") return "investor_presentation";
  return kind as SourceType;
}

export class SourceCollector {
  private items: SourceRef[] = [];
  private byUrl = new Map<string, string>();
  private seq = 0;

  add(ref: Omit<SourceRef, "id"> & { id?: string }): SourceRef {
    if (ref.url && this.byUrl.has(ref.url)) {
      const id = this.byUrl.get(ref.url)!;
      return this.items.find((i) => i.id === id)!;
    }
    const id = ref.id ?? `S${++this.seq}`;
    const item: SourceRef = {
      id,
      title: ref.title || ref.url || id,
      type: ref.type,
      date: ref.date ?? null,
      locator: ref.locator ?? null,
      url: ref.url ?? null,
    };
    this.items.push(item);
    if (item.url) this.byUrl.set(item.url, id);
    return item;
  }

  addDoc(d: HarvestedDoc): SourceRef {
    return this.add({ title: d.name, type: kindToType(d.kind), date: d.date ?? null, url: d.url ?? null });
  }

  addHit(h: FcHit, type: SourceType = "web"): SourceRef {
    return this.add({ title: h.title || h.url, type, date: null, url: h.url });
  }

  /** A numbered menu of the known sources, for the model's citation instructions. */
  menu(): string {
    if (!this.items.length) return "(none harvested yet)";
    return this.items
      .map((s) => `${s.id}: ${s.title}${s.url ? ` <${s.url}>` : ""}`)
      .join("\n");
  }

  list(): SourceRef[] {
    return this.items;
  }

  seenUrls(): string[] {
    return [...this.byUrl.keys()];
  }

  private inferType(source?: string, url?: string | null): SourceType {
    const s = `${source ?? ""} ${url ?? ""}`.toLowerCase();
    if (/annual report|\bar\b|annual-report/.test(s)) return "annual_report";
    if (/concall|transcript|earnings call/.test(s)) return "concall";
    if (/presentation|investor ppt|\bppt\b/.test(s)) return "investor_presentation";
    if (/screener/.test(s)) return "screener";
    if (/bse|nse|exchange|filing|announcement/.test(s)) return "exchange_filing";
    if (/news|standard|mint|economic times|reuters|bloomberg/.test(s)) return "news";
    if (url) return "web";
    return "other";
  }

  /**
   * Recursively walk an extracted section, register any cited url as a source, and
   * stamp each cited datum with its source_id. A "cited datum" is any object with
   * a boolean `available` field (the Cited shape).
   */
  attach(node: unknown): void {
    if (Array.isArray(node)) {
      for (const n of node) this.attach(n);
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    if (typeof obj.available === "boolean" && "value" in obj) {
      const url = (obj.url as string | null | undefined) ?? null;
      const source = obj.source as string | undefined;
      if (obj.available && (url || source)) {
        const ref = this.add({
          title: source || (url ?? ""),
          type: this.inferType(source, url),
          date: (obj.date as string | null | undefined) ?? null,
          locator: (obj.locator as string | null | undefined) ?? null,
          url,
        });
        obj.source_id = ref.id;
      }
      return; // a cited leaf has no nested citations
    }

    // ThesisPoint: { text, source?, url? }
    if (typeof obj.text === "string" && ("url" in obj || "source" in obj)) {
      const url = (obj.url as string | null | undefined) ?? null;
      const source = obj.source as string | undefined;
      if (url || source) {
        const ref = this.add({
          title: source || (url ?? ""),
          type: this.inferType(source, url),
          date: null,
          url,
        });
        obj.source_id = ref.id;
      }
    }

    for (const v of Object.values(obj)) this.attach(v);
  }
}
