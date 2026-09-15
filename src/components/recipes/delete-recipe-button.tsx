"use client";

import { useTransition } from "react";
import { deleteRecipe } from "@/lib/recipes/actions";

export function DeleteRecipeButton({ classId, recipeId }: { classId: string; recipeId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this recipe?")) return;
        startTransition(() => void deleteRecipe(classId, recipeId));
      }}
      className="text-sm text-walnut transition-colors hover:text-paprika disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
