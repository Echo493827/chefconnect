import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { createAnonClient } from "@/lib/anon-supabase";

export const revalidate = 3600; // refresh hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/trending`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const supabase = createAnonClient();
  if (!supabase) return staticRoutes;

  // Public, non-suspended chefs and their published classes (RLS enforces this).
  const [{ data: chefs }, { data: classes }] = await Promise.all([
    supabase.from("chef_profiles").select("slug, updated_at").limit(5000),
    supabase.from("classes").select("slug, updated_at, chef_profiles(slug)").eq("status", "published").limit(5000),
  ]);

  const chefRoutes: MetadataRoute.Sitemap = (chefs ?? []).map((c) => ({
    url: `${SITE_URL}/chefs/${c.slug}`,
    lastModified: c.updated_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const classRoutes: MetadataRoute.Sitemap = (classes ?? [])
    .map((c) => {
      const chef = Array.isArray(c.chef_profiles) ? c.chef_profiles[0] : c.chef_profiles;
      if (!chef?.slug) return null;
      return {
        url: `${SITE_URL}/chefs/${chef.slug}/${c.slug}`,
        lastModified: c.updated_at ?? undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return [...staticRoutes, ...chefRoutes, ...classRoutes];
}
