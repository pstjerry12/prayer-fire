// Extracts the video ID from common YouTube URL shapes (watch, youtu.be,
// shorts, live, embed) so a plain pasted link can drive a thumbnail
// (https://img.youtube.com/vi/<id>/hqdefault.jpg) without the YouTube API.
export function extractYouTubeVideoId(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return u.pathname.slice(1).split('/')[0] || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return v;
      const match = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
      if (match) return match[2];
    }
  } catch {
    return null;
  }
  return null;
}
