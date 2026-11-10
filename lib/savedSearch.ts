// M2 saved searches: only re-openable paths on our own search pages may be saved.
export const SEARCH_PAGES = ["/buy", "/ai-intelligence", "/price-check", "/area-prices", "/compare"];
export const SEARCH_KINDS = ["listings", "area", "project"];

export function validSearchPath(path: unknown): path is string {
  if (typeof path !== "string" || path.length > 500 || !path.startsWith("/") || path.startsWith("//") || /[\s<>"\\]/.test(path)) return false;
  const base = path.split(/[?#]/)[0];
  return SEARCH_PAGES.some((a) => base === a || base.startsWith(`${a}/`));
}
