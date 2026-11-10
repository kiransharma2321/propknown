import type { ProjectResult } from "./index";

export type { ProjectResult };

// How many independent websites a price comes from (two pages on one portal count once) --
// the number shown to visitors, consistent with the confidence rule. Pure, so client
// components can import it without pulling in the database layer.
export function sourceSiteCount(price: Pick<NonNullable<ProjectResult["price"]>, "sources">): number {
  return new Set(price.sources.map((s) => s.host)).size;
}

export function medianOf(xs: number[]): number {
  const v = [...xs].sort((a, b) => a - b);
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
}
