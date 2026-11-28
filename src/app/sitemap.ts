import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import meta from "../../data/meta.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = (meta as { lastRun?: string }).lastRun;
  return [
    { url: `${SITE.url}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
