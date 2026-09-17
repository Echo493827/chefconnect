// The canonical public URL, used for absolute links in metadata, sitemap, and
// share cards. Set NEXT_PUBLIC_SITE_URL to your real domain in production.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://chefconnect.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "ChefConnect";
export const SITE_DESCRIPTION =
  "Find and book cooking classes taught by the people who cook — home chefs, restaurant chefs, creators, and cooking schools. Near you, or anywhere you're headed.";
