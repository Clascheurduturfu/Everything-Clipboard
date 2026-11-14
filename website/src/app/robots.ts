import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/api/", "/success"],
    },
    sitemap: "https://www.everything-clipboard.com/sitemap.xml",
  };
}
