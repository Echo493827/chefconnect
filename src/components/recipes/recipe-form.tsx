"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { saveRecipe, type FormState } from "@/lib/recipes/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";

type Ingredient = { name: string; quantity: string; unit: string };

const initialState: FormState = { error: null, message: null };

const blankRow: Ingredient = { name: "", quantity: "", unit: "" };

export function RecipeForm({
  classId,
  recipeId,
  defaultName,
  defaultBaseServings = 4,
  defaultNotes,
  defaultIngredients,
}: {
  classId: string;
  recipeId?: string;
  defaultName?: string;
  defaultBaseServings?: number;
  defaultNotes?: string;
  defaultIngredients?: Ingredient[];
}) {
  const action = saveRecipe.bind(null, classId, recipeId ?? null);
  const [state, formAction] = useFormState(action, initialState);
  const [rows, setRows] = useState<Ingredient[]>(
    defaultIngredients && defaultIngredients.length ? defaultIngredients : [blankRow, blankRow, blankRow],
  );

  function update(i: number, key: keyof Ingredient, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  const serialized = JSON.stringify(
    rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), quantity: Number(r.quantity) || 0, unit: r.unit.trim() })),
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="ingredients" value={serialized} />

      <div className="grid gap-6 sm:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor="name" className={labelClass}>
            Recipe name
          </label>
          <input id="name" name="name" type="text" required maxLength={120} defaultValue={defaultName ?? ""} placeholder="Pizza dough" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="base_servings" className={labelClass}>
            Makes (servings)
          </label>
          <input
            id="base_servings"
            name="base_servings"
            type="number"
            required
            min={1}
            max={100}
            defaultValue={defaultBaseServings}
            className={fieldClass}
          />
        </div>
      </div>
      <p className="-mt-3 text-sm text-walnut">
        Enter the amounts for this many servings. We&rsquo;ll scale everything to each session&rsquo;s headcount for you.
      </p>

      <div>
        <span className={labelClass}>Ingredients</span>
        <div className="mt-1.5 space-y-2">
          <div className="hidden gap-2 text-xs text-walnut sm:grid sm:grid-cols-[5rem_5rem_1fr_2rem]">
            <span>Amount</span>
            <span>Unit</span>
            <span>Ingredient</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[4rem_4rem_1fr_2rem] gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={r.quantity}
                onChange={(e) => update(i, "quantity", e.target.value)}
                placeholder="500"
                className="rounded border border-line bg-cream px-2 py-2 text-sm"
              />
              <input
                type="text"
                value={r.unit}
                onChange={(e) => update(i, "unit", e.target.value)}
                placeholder="g"
                maxLength={30}
                className="rounded border border-line bg-cream px-2 py-2 text-sm"
              />
              <input
                type="text"
                value={r.name}
                onChange={(e) => update(i, "name", e.target.value)}
                placeholder="Flour  (leave unit blank for things like eggs)"
                maxLength={120}
                className="rounded border border-line bg-cream px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-walnut hover:text-paprika"
                aria-label="Remove ingredient"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, blankRow])}
            className="text-sm text-walnut underline decoration-line underline-offset-2 hover:text-iron"
          >
            + Add ingredient
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes <span className="text-walnut/60">(optional)</span>
        </label>
        <textarea id="notes" name="notes" rows={2} maxLength={2000} defaultValue={defaultNotes ?? ""} placeholder="Prep the night before; rest the dough 24h." className={`${fieldClass} resize-y`} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Saving…">{recipeId ? "Save recipe" : "Add recipe"}</SubmitButton>
    </form>
  );
}
