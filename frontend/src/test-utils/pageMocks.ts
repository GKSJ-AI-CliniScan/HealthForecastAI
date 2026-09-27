import { vi } from 'vitest';

import type { SessionUser } from '@/lib/session';

/**
 * Shared state for page tests. Each test file registers the module mocks
 * (vi.mock is hoisted per file) and points them at these functions.
 */
export const pageState = {
  user: null as SessionUser | null,
  apiFetch: vi.fn(),
  apiFetchPage: vi.fn(),
};

export const sessionMock = {
  requireUser: async () => pageState.user,
  getToken: async () => 'test-token',
  can: (user: SessionUser, permission: string) => user.permissions.includes(permission),
};

/** Route an apiFetch mock by path prefix; unknown paths reject like a network failure. */
export function routeResponses(routes: Record<string, unknown>) {
  return async (path: string) => {
    const match = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((prefix) => path.startsWith(prefix));
    if (match === undefined) {
      throw new TypeError(`unexpected request ${path}`);
    }
    const value = routes[match];
    if (value instanceof Error) {
      throw value;
    }
    return value;
  };
}
