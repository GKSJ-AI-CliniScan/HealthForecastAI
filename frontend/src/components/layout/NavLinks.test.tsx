import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import NavLinks, { isActive } from './NavLinks';

const pathname = vi.hoisted(() => ({ current: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

const GROUPS = [
  {
    label: 'Records',
    links: [
      { href: '/dashboard', label: 'Overview' },
      { href: '/dashboard/patients', label: 'Patients' },
    ],
  },
  { label: 'Insights', links: [{ href: '/dashboard/analytics', label: 'Analytics' }] },
  { label: 'Empty', links: [] },
];

describe('isActive', () => {
  it('matches Overview only on the dashboard root', () => {
    expect(isActive('/dashboard', '/dashboard')).toBe(true);
    expect(isActive('/dashboard/patients', '/dashboard')).toBe(false);
  });

  it('matches a section and the pages beneath it, but not a look-alike prefix', () => {
    expect(isActive('/dashboard/patients', '/dashboard/patients')).toBe(true);
    expect(isActive('/dashboard/patients/12', '/dashboard/patients')).toBe(true);
    expect(isActive('/dashboard/analytics/risk', '/dashboard/analytics')).toBe(true);
    expect(isActive('/dashboard/patientsx', '/dashboard/patients')).toBe(false);
  });
});

describe('NavLinks', () => {
  it('renders exactly the links it is given, grouped, and skips empty groups', () => {
    render(<NavLinks groups={GROUPS} label="Main navigation" />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Overview',
      'Patients',
      'Analytics',
    ]);
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });

  it('marks the current section with aria-current', () => {
    pathname.current = '/dashboard/patients/12';
    render(<NavLinks groups={GROUPS} label="Main navigation" />);
    expect(screen.getByRole('link', { name: 'Patients' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('closes the surrounding mobile menu after navigation', () => {
    pathname.current = '/dashboard';
    const { container } = render(
      <details open>
        <summary>Menu</summary>
        <NavLinks groups={GROUPS} label="Main navigation" />
      </details>,
    );
    expect(container.querySelector('details')?.open).toBe(false);
  });
});
