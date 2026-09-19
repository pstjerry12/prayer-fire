import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { inArray } from 'drizzle-orm';

const KEYS = [
  'social_youtube', 'social_facebook', 'social_instagram', 'social_whatsapp',
  'daily_youtube_url', 'daily_youtube_title', 'daily_youtube_subtitle',
] as const;

// GET — public, unauthenticated: only exposes these specific keys, never the full
// appSettings table (which also holds Flutterwave secret keys etc).
export async function GET() {
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, [...KEYS]));
  const links: Record<string, string> = {};
  for (const row of rows) links[row.key] = row.value;
  return NextResponse.json({
    youtube: links.social_youtube || '',
    facebook: links.social_facebook || '',
    instagram: links.social_instagram || '',
    whatsapp: links.social_whatsapp || '',
    dailyYoutubeUrl: links.daily_youtube_url || '',
    dailyYoutubeTitle: links.daily_youtube_title || '',
    dailyYoutubeSubtitle: links.daily_youtube_subtitle || '',
  });
}
