import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // keep private and personal areas out of search results
      disallow: ["/account", "/host", "/admin", "/bookings", "/book", "/review", "/recaps", "/notifications", "/messages", "/friends", "/saved", "/login", "/signup", "/forgot-password"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
