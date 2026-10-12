/**
 * The HealthForecast AI mark, "Forecast H": two stems form an H, and its
 * crossbar is a rising trend line that runs on past the right stem to a solid
 * point - health, read forward.
 *
 * Built on a 24-unit grid with 3-unit strokes and no hairlines, so it holds up
 * at favicon size. Colours come from the brand tokens, so the plate and glyph
 * swap correctly in the dark theme. Decorative: it always sits beside the name.
 * app/icon.svg is the same drawing with fixed colours, for the browser tab.
 */
export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={`h-8 w-8 shrink-0 ${className}`}
    >
      <rect width="24" height="24" rx="6.5" className="fill-brand" />
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-on-brand"
      >
        <path d="M6.5 6.5v11M16.5 6.5v11" strokeWidth="3" />
        <path d="M6.5 15.2 19.2 8.6" strokeWidth="2.6" />
      </g>
      <circle cx="19.4" cy="8.5" r="2.15" className="fill-on-brand" />
    </svg>
  );
}
