import type { Metadata } from "next";

// A personalized dashboard (favorites, saved alerts) with no content that's the same for two
// different visitors -- nothing here is genuinely indexable. Previously had no metadata export
// at all, which meant it silently inherited the homepage's title/description verbatim (a
// found-during-audit bug: search engines would have seen this login-gated dashboard page
// advertising itself with the exact same title/description as the actual homepage). noindex is
// the correct fix, not a better description -- there's no "true" canonical content to describe.
export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your saved properties, alerts, and account settings on PropKnown.",
  robots: { index: false, follow: true },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
