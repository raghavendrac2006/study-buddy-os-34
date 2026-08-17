import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Material, Topic } from "@/lib/adaptive-db";
import { useUpdateMaterial } from "@/lib/adaptive-db";

export function hhmmss(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const parts = h ? [h, m, s] : [m, s];
  return parts.map((n, i) => (i === 0 ? String(n) : String(n).padStart(2, "0"))).join(":");
}

type Chapter = { title: string; start_seconds: number };

/** Minimal YouTube IFrame API loader (single shared promise). */
let apiPromise: Promise<void> | null = null;
function loadYoutubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as { YT?: { Player?: unknown }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise<void>((resolve) => {
      w.onYouTubeIframeAPIReady = () => resolve();
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}

export function YoutubeCourse({
  material,
  topic,
  onSelectText,
}: {
  material: Material;
  topic: Topic | null | undefined;
  onSelectText: (text: string) => void;
}) {
  const updateMaterial = useUpdateMaterial();
  const holderRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<{ getCurrentTime?: () => number; destroy?: () => void } | null>(null);
  const savedRef = useRef({ watched: material.watched_seconds ?? 0, position: 0 });

  const duration = material.duration_seconds ?? 0;
  const meta = (material.metadata ?? {}) as {
    chapters?: Chapter[];
    video_id?: string;
    notes?: string[];
  };
  const chapters = meta.chapters ?? [];
  const videoId = meta.video_id ?? "";
  const start = Math.floor(topic?.start_seconds ?? material.last_position_seconds ?? 0);

  const [position, setPosition] = useState(start);
  const [watched, setWatched] = useState(material.watched_seconds ?? 0);

  // Player + progress tracking. Watched time only ever grows.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let last = start;

    void loadYoutubeApi().then(() => {
      if (cancelled || !holderRef.current) return;
      const YT = (window as unknown as { YT: { Player: new (el: Element, o: unknown) => unknown } }).YT;
      playerRef.current = new YT.Player(holderRef.current, {
        videoId,
        playerVars: { start, rel: 0, modestbranding: 1 },
        host: "https://www.youtube-nocookie.com",
      }) as { getCurrentTime?: () => number; destroy?: () => void };

      timer = setInterval(() => {
        const t = playerRef.current?.getCurrentTime?.();
        if (typeof t !== "number" || Number.isNaN(t)) return;
        const delta = t - last;
        last = t;
        setPosition(Math.floor(t));
        // count only forward, real-time playback (ignore seeks)
        if (delta > 0 && delta < 4) setWatched((w) => Math.min(duration || w + delta, w + delta));
      }, 2000);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, start, duration]);

  // Persist progress at most every ~30s of change, and on unmount.
  useEffect(() => {
    const persist = () => {
      const w = Math.round(watched);
      const p = Math.round(position);
      if (w - savedRef.current.watched < 30 && Math.abs(p - savedRef.current.position) < 30) return;
      savedRef.current = { watched: w, position: p };
      updateMaterial.mutate({ id: material.id, watched_seconds: w, last_position_seconds: p });
    };
    const timer = setInterval(persist, 15_000);
    return () => {
      clearInterval(timer);
      persist();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched, position, material.id]);

  const watchPct = duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : 0;
  const remaining = Math.max(0, duration - watched);
  const currentChapter = [...chapters].reverse().find((c) => c.start_seconds <= position);

  const seek = (seconds: number) => {
    const p = playerRef.current as unknown as { seekTo?: (s: number, allow: boolean) => void } | null;
    p?.seekTo?.(seconds, true);
    setPosition(seconds);
  };

  return (
    <div className="space-y-3">
      <div className="surface overflow-hidden p-0">
        <div className="aspect-video w-full">
          <div ref={holderRef} className="h-full w-full" />
        </div>
      </div>

      <div className="surface space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Course watched · {Math.round(watched / 60)} of {Math.round(duration / 60)} min
          </span>
          <span>{Math.round(remaining / 60)} min left</span>
        </div>
        <Progress value={watchPct} />
        <p className="text-xs text-muted-foreground">
          {watchPct}% watched — watching progress is tracked separately from topic mastery.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary">{material.author || "YouTube"}</Badge>
          {currentChapter && <Badge>Now: {currentChapter.title}</Badge>}
          {topic?.start_seconds != null && (
            <Badge variant="secondary">Topic starts at {hhmmss(topic.start_seconds)}</Badge>
          )}
          <Button size="sm" variant="outline" asChild>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(position)}s`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5" /> Open on YouTube
            </a>
          </Button>
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="surface p-4">
          <p className="text-sm font-medium">Chapters</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {chapters.map((c) => (
              <li key={c.start_seconds}>
                <button
                  className="text-left text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => seek(c.start_seconds)}
                >
                  {hhmmss(c.start_seconds)} · {c.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {material.extracted_text ? (
        <div className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Transcript</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectText(material.extracted_text!.slice(0, 6000))}
            >
              Use with AI
            </Button>
          </div>
          <p className="mt-2 max-h-48 overflow-auto text-xs leading-relaxed text-muted-foreground">
            {material.extracted_text.slice(0, 6000)}
          </p>
        </div>
      ) : (
        <p className="surface p-4 text-xs text-muted-foreground">
          No transcript could be retrieved for this course, so AI context is limited to the title,
          chapters and your own notes.
        </p>
      )}
    </div>
  );
}
