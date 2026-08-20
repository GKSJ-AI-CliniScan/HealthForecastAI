import { MODULES } from '@/lib/modules';

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
        Predictive Healthcare Intelligence
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">HealthForecast AI</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-500">
        Hospital readmission prediction and patient risk intelligence. Replace this
        placeholder with the dashboard you build for your milestone.
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Modules</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {MODULES.map((module) => (
            <li
              key={module.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <span className="text-xs font-semibold text-slate-500">
                Module {module.id}
              </span>
              <h3 className="mt-1 font-medium">{module.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{module.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
