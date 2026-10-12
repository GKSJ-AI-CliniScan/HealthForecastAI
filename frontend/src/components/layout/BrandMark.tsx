/**
 * The product mark: a miniature of the band scale (three zones and a marker),
 * the same device the app uses to show a model score.
 */
export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={`h-7 w-7 shrink-0 ${className}`}
    >
      <rect x="0" y="0" width="28" height="28" rx="7" className="fill-brand" />
      <rect x="5" y="16" width="7.2" height="5" rx="1.5" className="fill-zone-low-fill" />
      <rect x="12.2" y="16" width="5.4" height="5" className="fill-zone-medium-fill" />
      <rect x="17.6" y="16" width="5.4" height="5" rx="1.5" className="fill-zone-high-fill" />
      <rect x="14.2" y="7" width="2.6" height="15" rx="1.3" className="fill-on-brand" />
    </svg>
  );
}
