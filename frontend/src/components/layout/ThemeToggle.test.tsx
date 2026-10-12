import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ThemeToggle from './ThemeToggle';
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from './themeScript';

const root = document.documentElement;

function systemPrefersDark(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  root.removeAttribute('data-theme');
  localStorage.clear();
  systemPrefersDark(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const button = () => screen.getByRole('button', { name: 'Dark mode' });

describe('ThemeToggle', () => {
  it('is pressed exactly when the dark theme is on', () => {
    root.setAttribute('data-theme', 'dark');
    render(<ThemeToggle />);
    expect(button()).toHaveAttribute('aria-pressed', 'true');
  });

  it('is not pressed in the light theme', () => {
    root.setAttribute('data-theme', 'light');
    render(<ThemeToggle />);
    expect(button()).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches the theme, remembers it, and switches back', async () => {
    render(<ThemeToggle />);
    expect(button()).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button());
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    await waitFor(() => expect(button()).toHaveAttribute('aria-pressed', 'true'));

    fireEvent.click(button());
    expect(root).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    await waitFor(() => expect(button()).toHaveAttribute('aria-pressed', 'false'));
  });

  it('follows the system setting until the viewer chooses, then overrides it', async () => {
    systemPrefersDark(true);
    render(<ThemeToggle />);
    expect(root).not.toHaveAttribute('data-theme');
    expect(button()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button());
    expect(root).toHaveAttribute('data-theme', 'light');
    await waitFor(() => expect(button()).toHaveAttribute('aria-pressed', 'false'));
  });

  it('still switches the page when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeToggle />);
    fireEvent.click(button());
    expect(root).toHaveAttribute('data-theme', 'dark');
    await waitFor(() => expect(button()).toHaveAttribute('aria-pressed', 'true'));
  });

  it('keeps several toggles on the page in step', async () => {
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    const [first, second] = screen.getAllByRole('button', { name: 'Dark mode' });
    fireEvent.click(first);
    // The change reaches the other toggle through the attribute observer.
    await waitFor(() => expect(second).toHaveAttribute('aria-pressed', 'true'));
  });

  it('works where matchMedia does not exist', () => {
    // @ts-expect-error - simulating an environment without matchMedia
    delete window.matchMedia;
    render(<ThemeToggle />);
    expect(button()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button());
    expect(root).toHaveAttribute('data-theme', 'dark');
  });
});

describe('theme init script', () => {
  const run = () => new Function(THEME_INIT_SCRIPT)();

  it('applies a saved choice before the page is drawn', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    run();
    expect(root).toHaveAttribute('data-theme', 'dark');
  });

  it('does nothing when nothing, or something unknown, is saved', () => {
    run();
    expect(root).not.toHaveAttribute('data-theme');
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    run();
    expect(root).not.toHaveAttribute('data-theme');
  });

  it('does not throw when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(run).not.toThrow();
    expect(root).not.toHaveAttribute('data-theme');
  });
});
