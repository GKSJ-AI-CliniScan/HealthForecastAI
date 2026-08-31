import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from './page';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

// The default below is an obvious placeholder, not a credential: the secret
// scan treats a literal password assignment as a leak unless it reads as an
// example.
function submitCredentials(email = 'doc@hospital.org', password = 'example-Passw0rd-1') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the credential fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('never renders the password as readable text', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('posts to the session route rather than to the backend directly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'doctor' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginPage />);
    submitCredentials();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/session');
    expect(options.method).toBe('POST');
  });

  it('sends the user to the dashboard on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ role: 'doctor' }) }),
    );

    render(<LoginPage />);
    submitCredentials();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows the failure reason and stays put on bad credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Incorrect email or password' }),
      }),
    );

    render(<LoginPage />);
    submitCredentials('doc@hospital.org', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password');
    expect(push).not.toHaveBeenCalled();
  });

  it('reports an unreachable server instead of failing silently', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<LoginPage />);
    submitCredentials();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });
});
