"use client";

import { useState } from "react";

type Ingredient = { name: string; quantity: number; unit: string | null };
type Recipe = { id: string; name: string; base_servings: number; ingredients: Ingredient[] };

// Trim to at most 2 decimals and drop trailing zeros: 900.00 -> "900", 585.5 -> "585.5".
function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

function amountLabel(qty: number, unit: string | null, name: string): string {
  return unit ? `${fmt(qty)} ${unit} ${name}` : `${fmt(qty)} ${name}`;
}

export function PrepSheet({ recipes, defaultHeadcount }: { recipes: Recipe[]; defaultHeadcount: number }) {
  const [headcount, setHeadcount] = useState(Math.max(1, defaultHeadcount));

  // Aggregate a shopping list across all recipes by (name, unit).
  const totals = new Map<string, { name: string; unit: string | null; qty: number }>();
  for (const recipe of recipes) {
    const factor = headcount / recipe.base_servings;
    for (const ing of recipe.ingredients) {
      const key = `${ing.name.toLowerCase().trim()}|${ing.unit ?? ""}`;
      const scaled = ing.quantity * factor;
      const existing = totals.get(key);
      if (existing) existing.qty += scaled;
      else totals.set(key, { name: ing.name, unit: ing.unit, qty: scaled });
    }
  }
  const shopping = Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded border border-line bg-cream/60 p-4">
        <label htmlFor="headcount" className="text-sm font-medium text-iron">
          Cooking for
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHeadcount((n) => Math.max(1, n - 1))}
            className="h-9 w-9 rounded border border-line bg-cream text-lg leading-none hover:border-walnut"
            aria-label="One fewer"
          >
            −
          </button>
          <input
            id="headcount"
            type="number"
            min={1}
            max={500}
            value={headcount}
            onChange={(e) => setHeadcount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            className="w-16 rounded border border-line bg-cream px-2 py-1.5 text-center text-sm"
          />
          <button
            type="button"
            onClick={() => setHeadcount((n) => Math.min(500, n + 1))}
            className="h-9 w-9 rounded border border-line bg-cream text-lg leading-none hover:border-walnut"
            aria-label="One more"
          >
            +
          </button>
        </div>
        <span className="text-sm text-walnut">
          {headcount === 1 ? "person" : "people"}
          {defaultHeadcount > 0 && ` · ${defaultHeadcount} booked so far`}
        </span>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Shopping list</h2>
        <p className="mt-1 text-sm text-walnut">Everything you&rsquo;ll need, totalled across all recipes.</p>
        <ul className="mt-3 columns-1 gap-8 sm:columns-2">
          {shopping.map((item) => (
            <li key={`${item.name}|${item.unit ?? ""}`} className="mb-2 break-inside-avoid text-iron">
              {amountLabel(item.qty, item.unit, item.name)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">By recipe</h2>
        <div className="mt-3 space-y-6">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="rounded border border-line bg-cream/40 p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl">{recipe.name}</h3>
                <span className="text-sm text-walnut">
                  base makes {recipe.base_servings} · ×{fmt(headcount / recipe.base_servings)}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-iron">
                    {amountLabel((ing.quantity * headcount) / recipe.base_servings, ing.unit, ing.name)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
