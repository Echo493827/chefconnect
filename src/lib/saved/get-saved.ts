import "server-only";
import { createClient } from "@/lib/supabase/server";

// Returns the set of class ids (from the given list) the current user has saved.
// Empty set for signed-out users, so callers can pass results straight through.
export async function savedClassIds(classIds: string[]): Promise<Set<string>> {
  if (classIds.length === 0) return new Set();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await supabase
    .from("saved_classes")
    .select("class_id")
    .eq("user_id", user.id)
    .in("class_id", classIds);
  return new Set((data ?? []).map((r) => r.class_id));
}

export async function isClassSaved(classId: string): Promise<boolean> {
  return (await savedClassIds([classId])).has(classId);
}

export async function isSignedIn(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
