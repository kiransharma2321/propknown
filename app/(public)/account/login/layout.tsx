import type { Metadata } from "next";

// title/description only -- robots:{index:false} is intentionally NOT repeated here, it
// inherits from the parent app/(public)/account/layout.tsx (a login form has even less reason
// to be indexed than the dashboard it gates).
export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your PropKnown account to view saved properties and alerts.",
};

export default function AccountLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
