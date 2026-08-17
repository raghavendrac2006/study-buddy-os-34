import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PdfReader } from "@/components/pdf-reader";
import { YoutubeCourse } from "@/components/workspace/youtube-course";
import { supabase } from "@/integrations/supabase/client";
import type { Material, Topic } from "@/lib/adaptive-db";
import { useUpdateMaterial } from "@/lib/adaptive-db";

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
    return <YoutubeCourse material={material} topic={topic} onSelectText={onSelectText} />;
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
