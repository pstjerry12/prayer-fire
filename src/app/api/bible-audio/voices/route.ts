import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { audioConfigured, loadVoiceSettings, mayUsePremiumVoices } from "@/lib/bibleAudioServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Which premium Bible voices exist and whether this person may use them. `available` is false until the owner has added the
// ElevenLabs and Supabase keys, so the app simply does not offer premium voices until then.
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request).catch(() => null);
    const settings = await loadVoiceSettings();
    const voices = settings.voices.filter((v) => v.enabled).map((v) => ({ id: v.id, label: v.label, description: v.description }));
    return NextResponse.json({
      available: audioConfigured() && voices.length > 0,
      eligible: userId ? await mayUsePremiumVoices(userId) : false,
      voices,
    });
  } catch (err) {
    console.error("bible-audio voices error", err);
    return NextResponse.json({ available: false, eligible: false, voices: [] });
  }
}
