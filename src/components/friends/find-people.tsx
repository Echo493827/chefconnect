"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AddFriendButton } from "@/components/friends/friend-buttons";
import { fieldClass } from "@/components/auth/form-styles";

type Person = { id: string; display_name: string };

// Search people by name and send friend requests. Users are public-readable, so
// this queries directly with the browser client (debounced).
export function FindPeople({ excludeIds }: { excludeIds: string[] }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [searched, setSearched] = useState(false);
  const exclude = new Set(excludeIds);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("id, display_name")
        .ilike("display_name", `%${query}%`)
        .limit(10);
      setResults((data ?? []).filter((p) => !exclude.has(p.id)));
      setSearched(true);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div>
      <label htmlFor="find" className="mb-1.5 block text-sm font-medium text-iron">
        Find people by name
      </label>
      <input
        id="find"
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name…"
        className={fieldClass}
      />
      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded border border-line">
          {results.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm text-iron">{p.display_name}</span>
              <AddFriendButton userId={p.id} />
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && q.trim().length >= 2 && (
        <p className="mt-2 text-sm text-walnut">No one new found by that name.</p>
      )}
    </div>
  );
}
