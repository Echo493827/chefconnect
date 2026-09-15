import Image from "next/image";

type Recap = {
  title: string;
  body: string | null;
  photo_urls: string[];
  attachments: { label: string; url: string }[];
};

// Shared recap display used on the attendee's view.
export function RecapView({ recap }: { recap: Recap }) {
  return (
    <article>
      <h1 className="font-display text-4xl tracking-tight">{recap.title}</h1>

      {recap.photo_urls.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {recap.photo_urls.map((u) => (
            <div key={u} className="relative aspect-square overflow-hidden rounded border border-line">
              <Image src={u} alt="" fill sizes="(max-width: 640px) 50vw, 20rem" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {recap.body && <div className="mt-6 max-w-prose whitespace-pre-line leading-relaxed text-iron">{recap.body}</div>}

      {recap.attachments.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl">Recipes & links</h2>
          <ul className="mt-3 space-y-2">
            {recap.attachments.map((a) => (
              <li key={a.url}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-olive-deep underline decoration-line underline-offset-2 hover:decoration-walnut"
                >
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
