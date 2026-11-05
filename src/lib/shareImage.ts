'use client';

import { copyText } from './clipboard';
import { shareMessage, type ShareResult } from './shareVerse';
import { fitFontSize } from './cardLayout';

export { wrapLines, fitFontSize } from './cardLayout';

/**
 * One-tap branded picture of a verse (or a prayer): evergreen card, the words in large serif type, the reference and
 * the Prayer Fire name. Drawn on a canvas on the phone, so nothing is uploaded. In the Android app the picture is
 * handed to the native share sheet (WhatsApp, Instagram, Messages...); in a browser the Web Share sheet is used when it
 * can take files, otherwise the picture is saved.
 */

export const CARD_W = 1080;
export const CARD_H = 1350;

const SERIF = 'Georgia, "Times New Roman", serif';

/** Draws the card on a canvas of CARD_W x CARD_H. `body` is the verse or prayer text, `reference` e.g. "John 3:16 (KJV)". */
export function drawCard(ctx: CanvasRenderingContext2D, body: string, reference: string, caption = ''): void {
  const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  g.addColorStop(0, '#065f46');
  g.addColorStop(1, '#052e22');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Soft glow behind the words.
  const glow = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.42, 40, CARD_W / 2, CARD_H * 0.42, CARD_W * 0.8);
  glow.addColorStop(0, 'rgba(232,176,74,0.22)');
  glow.addColorStop(1, 'rgba(232,176,74,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Thin inner border.
  ctx.strokeStyle = 'rgba(240,233,218,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, CARD_W - 88, CARD_H - 88);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Flame mark.
  ctx.save();
  ctx.translate(CARD_W / 2, 150);
  ctx.fillStyle = '#E8B04A';
  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.bezierCurveTo(34, -22, 52, 6, 42, 38);
  ctx.bezierCurveTo(34, 62, -34, 62, -42, 38);
  ctx.bezierCurveTo(-52, 6, -22, -8, -16, -34);
  ctx.bezierCurveTo(-6, -22, 4, -30, 0, -62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F0E9DA';
  ctx.beginPath();
  ctx.ellipse(0, 36, 17, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The words, shrunk to fit.
  const maxW = CARD_W - 200;
  const top = 270;
  const bottom = CARD_H - 330;
  const { size, lines } = fitFontSize(
    (s) => (t) => { ctx.font = `italic ${s}px ${SERIF}`; return ctx.measureText(t).width; },
    `“${body.trim()}”`,
    maxW,
    bottom - top
  );
  ctx.font = `italic ${size}px ${SERIF}`;
  ctx.fillStyle = '#F0E9DA';
  const lh = size * 1.32;
  const blockH = lines.length * lh;
  let y = top + Math.max(0, (bottom - top - blockH) / 2) + size;
  for (const l of lines) { ctx.fillText(l, CARD_W / 2, y); y += lh; }

  // Reference.
  ctx.font = `bold 46px ${SERIF}`;
  ctx.fillStyle = '#E8B04A';
  ctx.fillText(reference, CARD_W / 2, CARD_H - 250);

  if (caption) {
    ctx.font = `34px ${SERIF}`;
    ctx.fillStyle = 'rgba(240,233,218,0.8)';
    ctx.fillText(caption, CARD_W / 2, CARD_H - 192);
  }

  // Brand footer.
  ctx.font = `bold 40px ${SERIF}`;
  ctx.fillStyle = '#F0E9DA';
  ctx.fillText('Prayer Fire', CARD_W / 2, CARD_H - 112);
  ctx.font = `30px ${SERIF}`;
  ctx.fillStyle = 'rgba(240,233,218,0.75)';
  ctx.fillText('prayer-fire.vercel.app', CARD_W / 2, CARD_H - 70);
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Makes the picture. Returns null if the browser cannot draw it. */
export async function renderCard(body: string, reference: string, caption = ''): Promise<Blob | null> {
  try {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    drawCard(ctx, body, reference, caption);
    return await canvasBlob(canvas);
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('read failed'));
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.readAsDataURL(blob);
  });
}

/** Opens the share sheet with the picture. `verseLine` is the plain-text version sent along with it. */
export async function shareImageCard(body: string, reference: string, verseLine: string, caption = ''): Promise<ShareResult | 'saved'> {
  const blob = await renderCard(body, reference, caption);
  if (!blob) return 'failed';
  const text = shareMessage(verseLine);

  // 1) The Android app: write the picture to the cache and give its address to the native share sheet.
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const name = `prayer-fire-${Date.now()}.png`;
      const written = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
      await Share.share({ title: 'Prayer Fire', text, files: [written.uri], dialogTitle: 'Share this verse' });
      return 'shared';
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/cancel|abort/i.test(message)) return 'cancelled';
    // fall through to the browser ways
  }

  // 2) A browser whose share sheet can take files.
  try {
    const file = new File([blob], 'prayer-fire-verse.png', { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text });
      return 'shared';
    }
  } catch (e) {
    const message = e instanceof Error ? `${e.name} ${e.message}` : String(e);
    if (/cancel|abort/i.test(message)) return 'cancelled';
  }

  // 3) Save the picture so it can be sent from the gallery.
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prayer-fire-verse.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'saved';
  } catch {
    return (await copyText(text)) ? 'copied' : 'failed';
  }
}

/** The address that opens WhatsApp with the message ready to send (works on phones and WhatsApp Web). */
export function whatsAppUrl(verseLine: string): string {
  return `https://wa.me/?text=${encodeURIComponent(shareMessage(verseLine))}`;
}

/** Opens WhatsApp with the verse and link already typed. */
export function shareToWhatsApp(verseLine: string): void {
  try {
    window.open(whatsAppUrl(verseLine), '_blank', 'noopener');
  } catch {
    /* nothing to do: pop-up blocked */
  }
}
