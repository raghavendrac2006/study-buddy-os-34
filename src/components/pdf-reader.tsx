import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<any>;
  destroy: () => Promise<void>;
};

export type PdfReaderProps = {
  url: string;
  initialPage?: number;
  bookmarks?: number[];
  onPageChange?: (page: number) => void;
  onToggleBookmark?: (page: number) => void;
  onSelectText?: (text: string) => void;
};

export function PdfReader({
  url,
  initialPage = 1,
  bookmarks = [],
  onPageChange,
  onToggleBookmark,
  onSelectText,
}: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PdfDoc | null>(null);
  const renderTask = useRef<{ cancel: () => void } | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [zoom, setZoom] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [pageText, setPageText] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const doc = (await pdfjs.getDocument({ url }).promise) as unknown as PdfDoc;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open this PDF.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      void docRef.current?.destroy();
      docRef.current = null;
    };
  }, [url]);

  const render = useCallback(async () => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    try {
      const p = await doc.getPage(Math.min(Math.max(1, page), doc.numPages));
      const viewport = p.getViewport({ scale: zoom });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      renderTask.current?.cancel();
      const task = p.render({ canvasContext: ctx, viewport, canvas });
      renderTask.current = task;
      await task.promise;
      const content = await p.getTextContent();
      setPageText(
        content.items
          .map((i: { str?: string }) => i.str ?? "")
          .join(" ")
          .replace(/\s+/g, " "),
      );
    } catch {
      /* cancelled renders are expected */
    }
  }, [page, zoom]);

  useEffect(() => {
    void render();
  }, [render, numPages]);

  useEffect(() => {
    onPageChange?.(page);
  }, [page, onPageChange]);

  const go = (n: number) => setPage((p) => Math.min(Math.max(1, n), numPages || 1));

  const runSearch = async () => {
    const doc = docRef.current;
    if (!doc || !query.trim()) return;
    setSearching(true);
    try {
      const needle = query.trim().toLowerCase();
      for (let i = 0; i < doc.numPages; i++) {
        const n = ((page - 1 + i + 1) % doc.numPages) + 1; // start after current page
        const p = await doc.getPage(n);
        const content = await p.getTextContent();
        const text = content.items
          .map((it: { str?: string }) => it.str ?? "")
          .join(" ")
          .toLowerCase();
        if (text.includes(needle)) {
          go(n);
          toast.success(`Found on page ${n}`);
          return;
        }
      }
      toast.info("No match found in this document.");
    } finally {
      setSearching(false);
    }
  };

  const fullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const captureSelection = () => {
    const text = window.getSelection?.()?.toString().trim();
    if (text && text.length > 3) onSelectText?.(text);
    else if (pageText) onSelectText?.(pageText.slice(0, 4000));
  };

  if (error) {
    return (
      <div className="surface p-6 text-sm text-muted-foreground">
        {error} You can still use notes, recall and assessments for this topic.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="surface flex flex-col gap-3 bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous page" onClick={() => go(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Input
            aria-label="Page number"
            className="h-8 w-16"
            value={page}
            onChange={(e) => go(Number(e.target.value) || 1)}
          />
          / {numPages || "…"}
        </div>
        <Button variant="outline" size="icon" aria-label="Next page" onClick={() => go(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}>
            <Minus className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>
            <Plus className="size-4" />
          </Button>
          <Button
            variant={bookmarks.includes(page) ? "default" : "ghost"}
            size="icon"
            aria-label="Bookmark page"
            onClick={() => onToggleBookmark?.(page)}
          >
            <Bookmark className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Fullscreen" onClick={fullscreen}>
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-48 flex-1 items-center gap-2">
          <Input
            placeholder="Search in document"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runSearch()}
            className="h-8"
          />
          <Button size="sm" variant="outline" onClick={() => void runSearch()} disabled={searching}>
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </div>
        {onSelectText && (
          <Button size="sm" variant="outline" onClick={captureSelection}>
            Use selection with AI
          </Button>
        )}
        {bookmarks.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {bookmarks.slice(0, 8).map((b) => (
              <Badge
                key={b}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => go(b)}
              >
                p{b}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-[70dvh] overflow-auto rounded-lg border border-border bg-muted/30 p-2">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Opening document…
          </div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto block" />
        )}
      </div>
    </div>
  );
}
