/**
 * Best-effort YouTube course metadata reader.
 *
 * Only public metadata is read (title, channel, duration, chapters, captions).
 * No video or audio content is downloaded or redistributed.
 * Every field is optional: when YouTube does not expose it we say so instead of
 * pretending the course was analysed.
 */

export type YoutubeChapter = { title: string; start_seconds: number };

export type YoutubeCourse = {
  video_id: string;
  playlist_id: string | null;
  url: string;
  title: string;
  author: string;
  duration_seconds: number;
  description: string;
  thumbnail: string;
  chapters: YoutubeChapter[];
  transcript: string;
  transcript_available: boolean;
  chapters_available: boolean;
  playlist_items: { title: string; video_id: string; duration_seconds: number }[];
  notes: string[];
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function parseYoutubeUrl(raw: string): { videoId: string | null; playlistId: string | null } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    const bare = raw.trim();
    return { videoId: /^[\w-]{11}$/.test(bare) ? bare : null, playlistId: null };
  }
  const host = url.hostname.replace(/^www\./, "");
  let videoId: string | null = null;
  if (host === "youtu.be") videoId = url.pathname.slice(1).split("/")[0] ?? null;
  else if (host.endsWith("youtube.com")) {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    else if (url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] ?? null;
    else if (url.pathname.startsWith("/live/")) videoId = url.pathname.split("/")[2] ?? null;
    else if (url.pathname.startsWith("/shorts/")) videoId = url.pathname.split("/")[2] ?? null;
  }
  const playlistId = url.searchParams.get("list");
  return { videoId: videoId && /^[\w-]{11}$/.test(videoId) ? videoId : null, playlistId };
}

function jsonAfter(html: string, marker: string): unknown | null {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf("{", at);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function toSeconds(stamp: string): number {
  const parts = stamp.split(":").map((p) => Number(p) || 0);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function chaptersFromDescription(description: string): YoutubeChapter[] {
  const out: YoutubeChapter[] = [];
  for (const line of description.split(/\r?\n/)) {
    const m = line.match(/(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:|)\]]*\s*(.+)$/);
    if (!m) continue;
    const title = (m[2] ?? "").trim();
    if (!title || title.length > 160) continue;
    out.push({ title, start_seconds: toSeconds(m[1]!) });
  }
  // A real chapter list starts at (or near) zero and is monotonic.
  const sorted = out.sort((a, b) => a.start_seconds - b.start_seconds);
  return sorted.length >= 3 && sorted[0]!.start_seconds <= 60 ? sorted : [];
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function chaptersFromInitialData(data: unknown): YoutubeChapter[] {
  const out: YoutubeChapter[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const n = node as Json;
    const item = obj(n["macroMarkersListItemRenderer"]);
    if (Object.keys(item).length) {
      const title =
        str(obj(item["title"])["simpleText"]) ||
        arr(obj(item["title"])["runs"])
          .map((r) => str(obj(r)["text"]))
          .join("");
      const onTap = obj(obj(item["onTap"])["watchEndpoint"]);
      const start = Number(onTap["startTimeSeconds"] ?? NaN);
      if (title && Number.isFinite(start)) out.push({ title, start_seconds: start });
    }
    for (const v of Object.values(n)) walk(v);
  };
  walk(data);
  const seen = new Set<number>();
  return out
    .filter((c) => (seen.has(c.start_seconds) ? false : (seen.add(c.start_seconds), true)))
    .sort((a, b) => a.start_seconds - b.start_seconds);
}

function playlistItems(data: unknown) {
  const out: { title: string; video_id: string; duration_seconds: number }[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const n = node as Json;
    const r = obj(n["playlistVideoRenderer"]);
    if (Object.keys(r).length) {
      const title =
        str(obj(r["title"])["simpleText"]) ||
        arr(obj(r["title"])["runs"])
          .map((x) => str(obj(x)["text"]))
          .join("");
      const videoId = str(r["videoId"]);
      const seconds = Number(r["lengthSeconds"] ?? 0) || 0;
      if (videoId && title) out.push({ title, video_id: videoId, duration_seconds: seconds || 0 });
    }
    for (const v of Object.values(n)) walk(v);
  };
  walk(data);
  const seen = new Set<string>();
  return out.filter((i) => (seen.has(i.video_id) ? false : (seen.add(i.video_id), true)));
}

async function fetchTranscript(playerResponse: unknown): Promise<string> {
  const tracks = arr(
    obj(obj(obj(playerResponse)["captions"])["playerCaptionsTracklistRenderer"])["captionTracks"],
  );
  if (!tracks.length) return "";
  const pick =
    tracks.find((t) => str(obj(t)["languageCode"]).startsWith("en")) ?? tracks[0];
  const base = str(obj(pick)["baseUrl"]);
  if (!base) return "";
  try {
    const res = await fetch(`${base}&fmt=json3`, { headers: { "User-Agent": UA } });
    if (!res.ok) return "";
    const json = (await res.json()) as Json;
    const events = arr(json["events"]);
    return events
      .map((e) =>
        arr(obj(e)["segs"])
          .map((s) => str(obj(s)["utf8"]))
          .join(""),
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

export async function readYoutubeCourse(rawUrl: string): Promise<YoutubeCourse> {
  const { videoId, playlistId } = parseYoutubeUrl(rawUrl);
  if (!videoId && !playlistId) {
    throw new Error("That doesn't look like a YouTube video or playlist link.");
  }
  const notes: string[] = [];
  const watchUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}${playlistId ? `&list=${playlistId}` : ""}`
    : `https://www.youtube.com/playlist?list=${playlistId}`;

  let title = "";
  let author = "";
  let duration = 0;
  let description = "";
  let chapters: YoutubeChapter[] = [];
  let transcript = "";
  let items: YoutubeCourse["playlist_items"] = [];

  // 1. oEmbed — the most reliable public source for title + channel.
  if (videoId) {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
        { headers: { "User-Agent": UA } },
      );
      if (res.ok) {
        const j = (await res.json()) as Json;
        title = str(j["title"]);
        author = str(j["author_name"]);
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Watch/playlist page — duration, description, chapters, captions, playlist items.
  try {
    const res = await fetch(watchUrl, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+cb; SOCS=CAI",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const player = jsonAfter(html, "ytInitialPlayerResponse");
      const details = obj(obj(player)["videoDetails"]);
      title = title || str(details["title"]);
      author = author || str(details["author"]);
      duration = Number(str(details["lengthSeconds"])) || 0;
      description = str(details["shortDescription"]);

      const initial = jsonAfter(html, "ytInitialData");
      chapters = chaptersFromInitialData(initial);
      if (!chapters.length) chapters = chaptersFromDescription(description);
      if (playlistId) items = playlistItems(initial);

      transcript = await fetchTranscript(player);
    } else {
      notes.push("YouTube did not return the course page, so only basic details are available.");
    }
  } catch {
    notes.push("Could not reach YouTube for the full course page.");
  }

  if (!title) throw new Error("Could not read anything about that link from YouTube.");
  if (!chapters.length) notes.push("No chapters or timestamps were published for this course.");
  if (!transcript) notes.push("No transcript/captions are available for this course.");
  if (!duration && items.length) {
    duration = items.reduce((a, i) => a + i.duration_seconds, 0);
  }
  if (!duration) notes.push("YouTube did not expose the total duration.");

  return {
    video_id: videoId ?? "",
    playlist_id: playlistId,
    url: watchUrl,
    title,
    author,
    duration_seconds: duration,
    description: description.slice(0, 8000),
    thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "",
    chapters,
    transcript: transcript.slice(0, 200_000),
    transcript_available: transcript.length > 200,
    chapters_available: chapters.length > 0,
    playlist_items: items,
    notes,
  };
}
