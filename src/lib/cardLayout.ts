/** Text layout for the branded share picture. Pure (no browser imports), so it is unit tested. */

export type Measure = (text: string) => number;

/** Splits `text` into lines no wider than `maxWidth` (a word longer than a line is cut). Pure, so it can be tested. */
export function wrapLines(measure: Measure, text: string, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let w of words) {
    while (measure(w) > maxWidth && w.length > 1) {
      // A single word wider than the line: cut it where it fits.
      let cut = w.length - 1;
      while (cut > 1 && measure(w.slice(0, cut)) > maxWidth) cut--;
      if (line) { lines.push(line); line = ''; }
      lines.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const next = line ? `${line} ${w}` : w;
    if (measure(next) <= maxWidth || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

/** The biggest font size (stepping down by 4px) at which the wrapped text fits in `maxHeight`. */
export function fitFontSize(
  measureAt: (size: number) => Measure,
  text: string,
  maxWidth: number,
  maxHeight: number,
  { max = 84, min = 30, lineHeight = 1.32 }: { max?: number; min?: number; lineHeight?: number } = {}
): { size: number; lines: string[] } {
  for (let size = max; size >= min; size -= 4) {
    const lines = wrapLines(measureAt(size), text, maxWidth);
    if (lines.length * size * lineHeight <= maxHeight) return { size, lines };
  }
  // Very long text: take what fits at the smallest size and end with an ellipsis.
  const lines = wrapLines(measureAt(min), text, maxWidth);
  const fit = Math.max(1, Math.floor(maxHeight / (min * lineHeight)));
  const cut = lines.slice(0, fit);
  if (lines.length > fit) cut[cut.length - 1] = `${cut[cut.length - 1].replace(/[\s,;:.]+$/, '')}…`;
  return { size: min, lines: cut };
}
