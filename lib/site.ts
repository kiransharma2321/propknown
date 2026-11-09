// Canonical public origin for links inside emails, sitemaps and webhooks. Override with
// NEXT_PUBLIC_SITE_URL on preview deployments; production uses the www domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.propknown.com").replace(/\/+$/, "");
