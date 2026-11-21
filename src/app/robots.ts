import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/s/"], disallow: ["/app/", "/api/", "/embed/", "/onboarding", "/invite/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
