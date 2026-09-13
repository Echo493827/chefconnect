import type { Database } from "@/lib/database.types";

type ChefType = Database["public"]["Enums"]["chef_type"];
type SkillLevel = Database["public"]["Enums"]["skill_level"];

// Human labels for the enums, shared by the forms and the public pages so the
// same wording appears everywhere.
export const CHEF_TYPE_LABELS: Record<ChefType, string> = {
  home: "Home chef",
  restaurant: "Restaurant chef",
  youtube: "YouTube / online creator",
  celebrity: "Celebrity chef",
  cooking_school: "Cooking school",
  other: "Other",
};

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All levels",
};

export const CHEF_TYPE_OPTIONS = Object.entries(CHEF_TYPE_LABELS) as [ChefType, string][];
export const SKILL_LEVEL_OPTIONS = Object.entries(SKILL_LEVEL_LABELS) as [SkillLevel, string][];
