import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PdfReader } from "@/components/pdf-reader";
import { supabase } from "@/integrations/supabase/client";
import type { Material, Topic } from "@/lib/adaptive-db";
import { useUpdateMaterial } from "@/lib/adaptive-db";

function hhmmss(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return [h, m, s].map((n, i) => (i === 0 && !h ? null : String(n).padStart(2, "0"))).filter(Boolean).join(":") ||
    `0:${String(s).padStart(2, "0")}`;
}

export function SourcePanel({
  material,
  topic,
  onSelectText,
}: {
  material: Material | null | undefined;
  topic: Topic | null | undefined;
  onSelectText: (text: string) => void;
}) {
  const updateMaterial = useUpdateMaterial();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const isPdf = material?.source_type === "file" && /pdf/i.test(material?.mime_type ?? "");
  const isYoutube = material?.source_type === "youtube";

  useEffect(() => {
    let cancelled = false;
    if (!isPdf || !material?.storage_path) return;
    (async () => {
      const { data, error } = await supabase.storage
        .from("materials")
        .createSignedUrl(material.storage_path!, 3600);
      if (cancelled) return;
      if (error) setUrlError(error.message);
      else setSignedUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPdf, material?.storage_path]);

  if (!material) {
    return (
      <p className="surface p-6 text-sm text-muted-foreground">
        This topic isn't linked to a learning source yet.
      </p>
    );
  }

  if (isYoutube) {
    const start = topic?.start_seconds ?? material.last_position_seconds ?? 0;
    const chapters = ((material.metadata as { chapters?: { title: string; start_seconds: number }[] } | null)
      ?.chapters ?? []) as { title: string; start_seconds: number }[];
    const videoId = (material.metadata as { video_id?: string } | null)?.video_id ?? "";
    return (
      <div className="space-y-3">
        <div className="surface overflow-hidden p-0">
          <div className="aspect-video w-full">
            <iframe
              key={`${videoId}-${start}`}
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?start=${Math.floor(start)}`}
              title={material.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{material.author || "YouTube"}</Badge>
          {material.duration_seconds > 0 && (
            <Badge variant="secondary">{Math.round(material.duration_seconds / 60)} min total</Badge>
          )}
          {topic?.start_seconds != null && (
            <Badge>Starts at {hhmmss(topic.start_seconds)}</Badge>
          )}
        </div>
        {chapters.length > 0 && (
          <div className="surface p-4">
            <p className="text-sm font-medium">Chapters</p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {chapters.map((c) => (
                <li key={c.start_seconds}>
                  <button
                    className="text-left text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      updateMaterial.mutate({ id: material.id, last_position_seconds: c.start_seconds })
                    }
                  >
                    {hhmmss(c.start_seconds)} · {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {material.extracted_text && (
          <div className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Transcript</p>
              <Button size="sm" variant="outline" onClick={() => onSelectText(material.extracted_text!.slice(0, 6000))}>
                Use with AI
              </Button>
            </div>
            <p className="mt-2 max-h-48 overflow-auto text-xs leading-relaxed text-muted-foreground">
              {material.extracted_text.slice(0, 6000)}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isPdf) {
    if (urlError || (!material.storage_path && !signedUrl)) {
      return (
        <TextFallback material={material} topic={topic} onSelectText={onSelectText} note="The original PDF isn't available, showing the extracted text instead." />
      );
    }
    if (!signedUrl) return <p className="surface p-6 text-sm text-muted-foreground">Opening document…</p>;
    const bookmarks = Array.isArray(material.bookmarks) ? (material.bookmarks as number[]) : [];
    return (
      <PdfReader
        url={signedUrl}
        initialPage={topic?.source_page ?? material.last_page ?? 1}
        bookmarks={bookmarks}
        onPageChange={(p) => {
          if (p !== material.last_page) updateMaterial.mutate({ id: material.id, last_page: p });
        }}
        onToggleBookmark={(p) =>
          updateMaterial.mutate({
            id: material.id,
            bookmarks: bookmarks.includes(p) ? bookmarks.filter((b) => b !== p) : [...bookmarks, p].sort((a, b) => a - b),
          })
        }
        onSelectText={onSelectText}
      />
    );
  }

  return <TextFallback material={material} topic={topic} onSelectText={onSelectText} />;
}

function TextFallback({
  material,
  topic,
  onSelectText,
  note,
}: {
  material: Material;
  topic: Topic | null | undefined;
  onSelectText: (text: string) => void;
  note?: string;
}) {
  const text = material.extracted_text ?? "";
  const [query, setQuery] = useState("");
  const filtered = query
    ? text
        .split(/\n+/)
        .filter((l) => l.toLowerCase().includes(query.toLowerCase()))
        .join("\n")
    : text;
  return (
    <div className="surface space-y-3 p-4">
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Search this source"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const sel = window.getSelection?.()?.toString().trim();
            onSelectText(sel && sel.length > 3 ? sel : (topic?.title ? `${topic.title}\n\n` : "") + filtered.slice(0, 6000));
          }}
        >
          Use with AI
        </Button>
      </div>
      <pre className="max-h-[60dvh] overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
        {filtered.slice(0, 60_000) || "No readable text stored for this source."}
      </pre>
    </div>
  );
}
