"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Toggle whether the current user has a class saved to their wishlist.
export async function toggleSave(classId: string, currentlySaved: boolean): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (currentlySaved) {
    await supabase.from("saved_classes").delete().eq("user_id", user.id).eq("class_id", classId);
  } else {
    await supabase.from("saved_classes").insert({ user_id: user.id, class_id: classId });
  }
  revalidatePath("/saved");
  revalidatePath("/", "layout");
}
