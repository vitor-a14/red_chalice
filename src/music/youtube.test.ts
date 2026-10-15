import { describe, expect, it } from "vitest";
import { parseYouTubeUrl } from "./youtube";

describe("parseYouTubeUrl", () => {
  const v = (ytId: string) => ({ kind: "video", ytId });
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", v("dQw4w9WgXcQ")],
    ["youtube.com/watch?v=dQw4w9WgXcQ&t=42s", v("dQw4w9WgXcQ")],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", v("dQw4w9WgXcQ")],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", v("dQw4w9WgXcQ")],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ", v("dQw4w9WgXcQ")],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", v("dQw4w9WgXcQ")],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", v("dQw4w9WgXcQ")],
    ["dQw4w9WgXcQ", v("dQw4w9WgXcQ")],
    ["https://www.youtube.com/playlist?list=PLabc123", { kind: "playlist", ytId: "PLabc123" }],
    // A video inside a playlist plays that video.
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123", v("dQw4w9WgXcQ")],
  ])("%s", (url, expected) => {
    expect(parseYouTubeUrl(url)).toEqual(expected);
  });

  it("rejects other sites and junk", () => {
    expect(parseYouTubeUrl("https://vimeo.com/123")).toBeNull();
    expect(parseYouTubeUrl("hello world")).toBeNull();
    expect(parseYouTubeUrl("https://youtube.com/watch?v=short")).toBeNull();
  });
});
