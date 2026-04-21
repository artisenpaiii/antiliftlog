import type { Tables } from "@/lib/db";
import type { StatsSettings } from "@/lib/types/database";
import type { ProgramHierarchy, ParsedLiftRecord } from "./types";
import { LiftParser } from "./lift-parser";
import { loadProgramHierarchy } from "./load-hierarchy";

export class StatsEngine {
  private parser = new LiftParser();
  private hierarchy: ProgramHierarchy | null = null;
  private settings: StatsSettings | null = null;
  private records: ParsedLiftRecord[] | null = null;

  /** Phase 1: Fetch hierarchy + settings from DB */
  async load(
    tables: Tables,
    programId: string,
  ): Promise<{ columnLabels: string[]; settings: StatsSettings | null }> {
    const result = await loadProgramHierarchy(tables, programId);
    this.hierarchy = result.hierarchy;
    this.settings = result.settings;
    return { columnLabels: result.columnLabels, settings: result.settings };
  }

  /** Phase 2: Parse hierarchy into records (call after load) */
  parse(): ParsedLiftRecord[] {
    if (!this.hierarchy || !this.settings) return [];
    this.records = this.parser.parseHierarchy(this.hierarchy, this.settings);
    return this.records;
  }

  /** Get all unique tags found in records (computed on demand) */
  getAllTags(): string[] {
    if (!this.records) return [];
    const tags = new Set<string>();
    for (const rec of this.records) {
      tags.add(rec.classification.mainTag);
      for (const vt of rec.classification.variantTags) {
        tags.add(vt);
      }
    }
    return Array.from(tags);
  }

  /** Filter records by selected tags */
  filterByTags(tags: string[]): ParsedLiftRecord[] {
    if (!this.records) return [];
    const tagSet = new Set(tags);
    return this.records.filter((rec) => {
      if (tagSet.has(rec.classification.mainTag)) return true;
      for (const vt of rec.classification.variantTags) {
        if (tagSet.has(vt)) return true;
      }
      return false;
    });
  }

  getHierarchy(): ProgramHierarchy | null {
    return this.hierarchy;
  }

  getSettings(): StatsSettings | null {
    return this.settings;
  }
}
