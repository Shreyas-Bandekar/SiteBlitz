"use client";

function Frame({
  title,
  screenshot,
  alt,
  mobile = false,
}: {
  title: string;
  screenshot?: string;
  alt: string;
  mobile?: boolean;
}) {
  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">{title}</h3>
      <div className={`mx-auto ${mobile ? "max-w-[280px]" : "max-w-full"}`}>
        <div className={`rounded-2xl border-2 border-slate-300/50 bg-slate-900 p-2 shadow-2xl ${mobile ? "rounded-[2rem]" : ""}`}>
          {screenshot ? (
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt={alt}
              className={`w-full rounded-xl object-cover ${mobile ? "max-h-[500px]" : "max-h-[420px]"}`}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/30 text-center text-sm text-slate-300">
              Screenshot unavailable
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ScreenshotGallery({
  url,
  screenshots,
}: {
  url: string;
  screenshots?: { desktop?: string; mobile?: string };
}) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Frame title="Desktop Preview" screenshot={screenshots?.desktop} alt={`Desktop preview of ${url}`} />
      <Frame title="Mobile Preview" screenshot={screenshots?.mobile} alt={`Mobile preview of ${url}`} mobile />
    </section>
  );
}
