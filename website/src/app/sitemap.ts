import type { MetadataRoute } from "next";

const BASE_URL = "https://www.everything-clipboard.com";

// /account is private and deliberately not listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/features`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/support`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
