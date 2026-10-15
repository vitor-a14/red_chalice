export type YouTubeRef = { kind: "video" | "playlist"; ytId: string };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Extracts a video or playlist id from the usual YouTube URL shapes. */
export function parseYouTubeUrl(input: string): YouTubeRef | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return { kind: "video", ytId: text };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  const list = url.searchParams.get("list");

  let video: string | null = null;
  if (host === "youtu.be") {
    video = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") video = url.searchParams.get("v");
    else if (first === "shorts" || first === "embed" || first === "live" || first === "v") video = second;
    else if (first === "playlist" && list) return { kind: "playlist", ytId: list };
  } else {
    return null;
  }

  if (video && VIDEO_ID.test(video)) return { kind: "video", ytId: video };
  if (list) return { kind: "playlist", ytId: list };
  return null;
}

export function thumbnailUrl(ref: YouTubeRef): string | null {
  return ref.kind === "video" ? `https://i.ytimg.com/vi/${ref.ytId}/mqdefault.jpg` : null;
}

export function watchUrl(ref: YouTubeRef): string {
  return ref.kind === "video"
    ? `https://www.youtube.com/watch?v=${ref.ytId}`
    : `https://www.youtube.com/playlist?list=${ref.ytId}`;
}

/** Best-effort title lookup. Falls back to null; the player fills it in on first play. */
export async function fetchTitle(ref: YouTubeRef): Promise<string | null> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(watchUrl(ref))}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title ?? null;
  } catch {
    return null;
  }
}

/* ---------- IFrame API loader ---------- */

let apiPromise: Promise<typeof YT> | null = null;

export function loadYouTubeApi(): Promise<typeof YT> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      apiPromise = null;
      reject(new Error("Could not load the YouTube player"));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const PLACEHOLDER_TITLE = "YouTube video";
