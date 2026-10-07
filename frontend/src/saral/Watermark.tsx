'use client';
/**
 * Watermark.tsx — Kanak's "KP" orbit mark in the footer (his rule since 2026-09-22:
 * every project he builds carries it).
 *
 * The logo file is NOT in the repo yet: drop logo-mark.svg into frontend/public/.
 * Until then the <img> fails quietly (onError hides it) and the text mark shows,
 * so nothing looks broken. alt="" because the visible name next to it already
 * says who built it — screen readers would otherwise read it twice.
 * FLOWS NEXT: rendered by AppShell and the sign-in page.
 */
import { useEffect, useRef, useState } from 'react';

export function Watermark() {
  const [logoOk, setLogoOk] = useState(true);
  const img = useRef<HTMLImageElement>(null);
  // If the image already failed BEFORE React attached onError (fast 404 during hydration),
  // onError never fires — so also check once after mount (bug seen in the browser test).
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setLogoOk(false);
  }, []);
  return (
    <footer className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-ink-soft">
      {logoOk && (
        // eslint-disable-next-line @next/next/no-img-element -- tiny local SVG, no optimisation needed
        <img ref={img} src="/logo-mark.svg" alt="" width={24} height={24} onError={() => setLogoOk(false)} />
      )}
      {!logoOk && (
        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full border-2 border-current text-xs font-bold">
          KP
        </span>
      )}
      <span>Kanak Prabhakar</span>
    </footer>
  );
}
