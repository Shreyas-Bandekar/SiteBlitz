"use client";

export default function SERPPreviewCard({
  preview,
}: {
  preview?: { title: string; description: string; url: string };
}) {
  const data = preview ?? {
    title: "Homepage",
    description: "Add a title and meta description to improve your search snippet appearance.",
    url: "https://example.com",
  };
  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5">
      <h2 className="mb-3 text-xl font-bold text-white">SERP Preview</h2>
      <div className="rounded-xl border border-white/20 bg-white/5 p-4">
        <p className="truncate text-xs text-emerald-200">{data.url}</p>
        <p className="mt-1 text-lg text-blue-300">{data.title}</p>
        <p className="mt-1 text-sm text-slate-200">{data.description}</p>
      </div>
    </article>
  );
}
