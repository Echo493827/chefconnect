"use client";

import { useState } from "react";
import { labelClass } from "@/components/auth/form-styles";

type Attachment = { label: string; url: string };

// Repeatable label + link rows (e.g. "Recipe card" -> a link). Serialized into a
// single hidden input as JSON for the server action to parse.
export function AttachmentsInput({ name, defaultValue = [] }: { name: string; defaultValue?: Attachment[] }) {
  const [rows, setRows] = useState<Attachment[]>(defaultValue.length ? defaultValue : []);

  function update(i: number, key: keyof Attachment, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  return (
    <div>
      <span className={labelClass}>
        Attachments <span className="text-walnut/60">(links to recipes, etc. — optional)</span>
      </span>
      <input type="hidden" name={name} value={JSON.stringify(rows.filter((r) => r.label && r.url))} />
      <div className="mt-1.5 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={r.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder="Recipe card"
              maxLength={80}
              className="w-1/3 rounded border border-line bg-cream px-3 py-2 text-sm"
            />
            <input
              type="url"
              value={r.url}
              onChange={(e) => update(i, "url", e.target.value)}
              placeholder="https://…"
              className="flex-1 rounded border border-line bg-cream px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              className="px-2 text-walnut hover:text-paprika"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { label: "", url: "" }])}
          className="text-sm text-walnut underline decoration-line underline-offset-2 hover:text-iron"
        >
          + Add a link
        </button>
      </div>
    </div>
  );
}
