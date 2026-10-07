'use client';
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
    <></>
  );
}
