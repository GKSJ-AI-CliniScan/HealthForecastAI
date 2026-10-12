import type { ReactNode } from 'react';

/**
 * Navigation icons: outline pictograms on a 24-unit grid with one 1.6 stroke,
 * so every icon has the same weight. Each sits beside a text label, so they
 * are hidden from assistive tech.
 */
function Icon({ children, className = 'h-[18px] w-[18px]' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const OverviewIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 11.2 12 4.5l8 6.7" />
    <path d="M6 9.8V19a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V9.8" />
    <path d="M10 19.5v-5h4v5" />
  </Icon>
);

export const PatientsIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <path d="M15.5 5.6a3 3 0 0 1 0 5.8" />
    <path d="M17.2 14.2c1.9.5 3 2.1 3.3 4.8" />
  </Icon>
);

export const UsersIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="10" cy="8.5" r="3.2" />
    <path d="M4 19c.6-3.2 2.9-5 6-5 1.1 0 2.1.2 3 .7" />
    <path d="M17.5 13.5 20 14.6v2.2c0 1.6-1 2.8-2.5 3.4-1.5-.6-2.5-1.8-2.5-3.4v-2.2z" />
  </Icon>
);

export const AnalyticsIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 4.5v15h16" />
    <path d="M8 16v-4M12 16V8M16 16v-6.5" />
  </Icon>
);

export const TreatmentIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="3.6" y="8.6" width="16.8" height="6.8" rx="3.4" transform="rotate(-38 12 12)" />
    <path d="m10.1 9.6 4.3 4.9" />
  </Icon>
);

export const ResearchIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M9.5 4h5" />
    <path d="M10.5 4v5.2L5.6 17.4A1.8 1.8 0 0 0 7.2 20h9.6a1.8 1.8 0 0 0 1.6-2.6L13.5 9.2V4" />
    <path d="M7.8 14.5h8.4" />
  </Icon>
);

export const ReportsIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" />
    <path d="M14 3.5V8h4M9.8 12.5h4.4M9.8 16h4.4" />
  </Icon>
);

export const MenuIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const SignOutIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14" />
    <path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" />
  </Icon>
);

const BY_HREF: Record<string, (props: IconProps) => ReactNode> = {
  '/dashboard': OverviewIcon,
  '/dashboard/patients': PatientsIcon,
  '/dashboard/users': UsersIcon,
  '/dashboard/analytics': AnalyticsIcon,
  '/dashboard/treatment': TreatmentIcon,
  '/dashboard/research': ResearchIcon,
  '/dashboard/reports': ReportsIcon,
};

/** The icon for a navigation destination; nothing for an unknown one. */
export function NavIcon({ href, className }: { href: string } & IconProps) {
  const Glyph = BY_HREF[href];
  return Glyph ? <Glyph className={className} /> : null;
}
