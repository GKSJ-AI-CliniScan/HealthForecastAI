export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <p className="muted py-8 text-sm">{label}</p>;
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: '#fdecea', color: '#8a1c12' }}
    >
      {message}
    </div>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="card text-center">
      <p className="muted text-sm">{message}</p>
    </div>
  );
}
