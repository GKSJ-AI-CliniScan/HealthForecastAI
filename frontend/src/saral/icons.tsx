/**
 * icons.tsx — one professional line icon per page (lucide-react, tree-shaken: only these ship).
 * v1 used emoji; they render differently on every phone and looked informal.
 * Icons are always decorative (aria-hidden) — the visible text label carries the meaning.
 * FLOWS NEXT: AppShell (sidebar) and the Home quick-action tiles.
 */
import {
  Activity,
  Accessibility,
  BarChart3,
  Bot,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Stethoscope,
  TrendingUp,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { PageId } from '@/lib/nav';

export const PAGE_ICON: Record<PageId, LucideIcon> = {
  home: LayoutDashboard,
  patients: Users,
  risk: HeartPulse,
  forecast: TrendingUp,
  treatment: Pill,
  care: Stethoscope,
  analytics: BarChart3,
  research: FlaskConical,
  models: Bot,
  users: UserCog,
  help: Accessibility,
};

/** Brand mark used in the sidebar and on the sign-in page. */
export const BrandIcon = Activity;
