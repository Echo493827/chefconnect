"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "class-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function extensionFor(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop()! : "";
  return (fromName || file.type.split("/")[1] || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function uploadOne(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Single cover image. Writes the resulting public URL into a hidden input so it
// submits with the form; shows a preview and a remove button.
export function CoverImageUpload({
  name,
  userId,
  defaultUrl,
  label = "Cover photo",
}: {
  name: string;
  userId: string;
  defaultUrl?: string;
  label?: string;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > MAX_BYTES) return setError("Please choose an image under 5 MB.");
    setBusy(true);
    try {
      setUrl(await uploadOne(file, userId));
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-iron">{label}</span>
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className="relative aspect-[3/2] w-full max-w-md overflow-hidden rounded border border-line">
          <Image src={url} alt="" fill sizes="(max-width: 640px) 100vw, 28rem" className="object-cover" />
          <button
            type="button"
            onClick={() => setUrl("")}
            className="absolute right-2 top-2 rounded bg-iron/80 px-2 py-1 text-xs font-medium text-cream hover:bg-iron"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex aspect-[3/2] w-full max-w-md cursor-pointer flex-col items-center justify-center rounded border border-dashed border-line bg-cream/60 text-center hover:border-walnut">
          <span className="text-sm text-walnut">{busy ? "Uploading…" : "Click to upload an image"}</span>
          <span className="mt-1 text-xs text-walnut/70">JPG or PNG, up to 5 MB</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </label>
      )}
      {error && <p className="mt-1.5 text-sm text-paprika">{error}</p>}
    </div>
  );
}

// Multiple gallery images. Emits one hidden input per URL (all sharing `name`),
// which the server action reads with getAll().
export function GalleryUpload({
  name,
  userId,
  defaultUrls = [],
  max = 8,
}: {
  name: string;
  userId: string;
  defaultUrls?: string[];
  max?: number;
}) {
  const [urls, setUrls] = useState<string[]>(defaultUrls);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const room = max - urls.length;
    const picked = Array.from(files).slice(0, room);
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of picked) {
        if (!file.type.startsWith("image/") || file.size > MAX_BYTES) continue;
        uploaded.push(await uploadOne(file, userId));
      }
      setUrls((prev) => [...prev, ...uploaded]);
    } catch {
      setError("One or more uploads failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-iron">
        Gallery <span className="font-normal text-walnut/60">(up to {max})</span>
      </span>
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}
      <div className="flex flex-wrap gap-3">
        {urls.map((u) => (
          <div key={u} className="relative h-24 w-32 overflow-hidden rounded border border-line">
            <Image src={u} alt="" fill sizes="8rem" className="object-cover" />
            <button
              type="button"
              onClick={() => setUrls((prev) => prev.filter((x) => x !== u))}
              className="absolute right-1 top-1 rounded bg-iron/80 px-1.5 py-0.5 text-[10px] font-medium text-cream hover:bg-iron"
            >
              ✕
            </button>
          </div>
        ))}
        {urls.length < max && (
          <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-line bg-cream/60 text-center hover:border-walnut">
            <span className="text-xs text-walnut">{busy ? "Uploading…" : "+ Add"}</span>
            <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => onPick(e.target.files)} />
          </label>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-paprika">{error}</p>}
    </div>
  );
}
