import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/crm/", "/api/", "/_next/"],
      },
    ],
    sitemap: "https://www.propknown.com/sitemap.xml",
    host: "https://www.propknown.com",
  };
}
