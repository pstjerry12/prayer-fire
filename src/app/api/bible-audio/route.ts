import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { audioConfigured, chapterAudioFor, mayUsePremiumVoices } from "@/lib/bibleAudioServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generating a chapter can take a while (the voice service reads it out); the app asks again if it answers "preparing".
export const maxDuration = 60;

// One chapter in a premium voice, for Partner and Leader subscribers only.
//   /api/bible-audio?voice=deep_male&translation=kjv&book=John&chapter=3
// Answers { status: "ready", url } (a link valid for an hour), { status: "preparing", retryAfterSeconds },
// { status: "busy", message } (the daily limit on new chapters) or { status: "error", message }.
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request).catch(() => null);
    if (!userId) return NextResponse.json({ status: "error", message: "Sign in to use premium voices." }, { status: 401 });
    if (!(await mayUsePremiumVoices(userId))) return NextResponse.json({ status: "error", message: "Premium Bible voices are part of Prayer Fire Partner." }, { status: 403 });
    if (!audioConfigured()) return NextResponse.json({ status: "error", message: "Premium voices are not switched on yet." }, { status: 503 });
    const q = new URL(request.url).searchParams;
    let result;
    try {
      result = await chapterAudioFor(new URL(request.url).origin, {
        voice: (q.get("voice") ?? "").slice(0, 40),
        translation: (q.get("translation") ?? "").slice(0, 10),
        book: (q.get("book") ?? "").slice(0, 10),
        chapter: Number(q.get("chapter")),
      });
    } catch (err) {
      // chapterKey() refuses anything odd (bad_voice, bad_book ...): that is the caller's mistake, not a server failure.
      if (err instanceof Error && /^bad_/.test(err.message)) return NextResponse.json({ status: "error", message: "That chapter was not recognised." }, { status: 400 });
      throw err;
    }
    return NextResponse.json(result, { status: result.status === "busy" ? 429 : 200 });
  } catch (err) {
    console.error("bible-audio error", err);
    return NextResponse.json({ status: "error", message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
