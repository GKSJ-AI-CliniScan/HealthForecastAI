import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pageState, sessionMock } from '@/test-utils/pageMocks';
import { sessionUser } from '@/test-utils/permissions';
import type { Role } from '@/types';

import DashboardLayout from './layout';

vi.mock('@/lib/session', () => sessionMock);
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard',
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    pageState.user = sessionUser('doctor');
  });

  it.each<Role>(['doctor', 'hospital_admin', 'researcher', 'system_admin'])(
    'puts the experimental notice above the page content for %s',
    async (role) => {
      pageState.user = sessionUser(role);
      render(await DashboardLayout({ children: <p>page content</p> }));

      const note = screen.getByRole('note', { name: 'Experimental status' });
      expect(note).toHaveTextContent('Experimental decision-support prototype.');
      const content = screen.getByText('page content');
      expect(note.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    },
  );

  it('shows the notice inside <main>, not in a footer', async () => {
    render(await DashboardLayout({ children: <p>page content</p> }));
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('note'));
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});
