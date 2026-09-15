"use client";

import { useState } from "react";

// Interactive 1-5 star picker. Keeps the value in a hidden input so it submits
// with the surrounding form action.
export function StarInput({ name, defaultValue = 0 }: { name: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value || ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setValue(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={`text-3xl leading-none transition-colors ${n <= shown ? "text-turmeric" : "text-line hover:text-turmeric/50"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
