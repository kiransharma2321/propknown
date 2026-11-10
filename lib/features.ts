// Feature flags for the MASTER UPGRADE items. Every flag is OFF unless its environment variable
// is exactly "true" (set it in Vercel -> Settings -> Environment Variables, then redeploy).
// While a flag is off, its pages/buttons are hidden and its API routes answer 404, so nothing
// half-finished reaches visitors. NEXT_PUBLIC_ so client components can read them too.
//
// Security and accuracy fixes are never behind a flag.

export const FEATURES = {
  /** M2: My PropKnown -- email-code login, saved searches, price watchlist, saved reports. */
  accountV2: process.env.NEXT_PUBLIC_FEATURE_ACCOUNT_V2 === "true",
  /** M3: compare 2-4 areas / projects / owner listings side by side (/compare). */
  compare: process.env.NEXT_PUBLIC_FEATURE_COMPARE === "true",
  /** M4: Investment Score (published method) + ROI/CAGR/yield calculator (/investment-score). */
  investmentScore: process.env.NEXT_PUBLIC_FEATURE_INVESTMENT_SCORE === "true",
} as const;

export type FeatureKey = keyof typeof FEATURES;
