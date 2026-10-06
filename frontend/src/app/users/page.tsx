'use client';
/**
 * Users (/users) — Milestone 1 "user management" (system admin only).
 *
 * List of people + one simple "Add a person" form (name, email, role, password).
 * Validation happens before sending (same rules as backend schema: email format,
 * password ≥ 8 chars). Errors are announced and focus goes to the first wrong field.
 * Data: GET /users, POST /users.
 */
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { data, type Role } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { Button, Field, INPUT, LoadState, PageHeader, Section, SimpleTable } from '@/saral/ui';
import { useData } from '@/saral/useData';

export default function UsersPage() {
  return (
    <AppShell page="users">
      <Users />
    </AppShell>
  );
}

const ROLES: Role[] = ['doctor', 'hospital_admin', 'researcher', 'system_admin'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Users() {
  const { t } = useI18n();
  const q = useData(() => data.users(), []);
  const [form, setForm] = useState({ name: '', email: '', role: 'doctor' as Role, password: '' });
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'password', string>>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = t('form.required');
    if (!EMAIL_RE.test(form.email.trim())) next.email = form.email ? t('form.badEmail') : t('form.required');
    if (form.password.length < 8) next.password = t('form.required');
    setErrors(next);
    const first = (['name', 'email', 'password'] as const).find((k) => next[k]);
    if (first) return refs[first].current?.focus();

    setBusy(true);
    setResult(null);
    try {
      const u = await data.addUser({ ...form, name: form.name.trim(), email: form.email.trim() });
      setResult({ ok: true, text: t('users.added', { name: u.name }) });
      setForm({ name: '', email: '', role: 'doctor', password: '' });
      q.reload();
    } catch {
      setResult({ ok: false, text: t('users.addFailed') });
    } finally {
      setBusy(false);
    }
  }

  const input = (key: 'name' | 'email' | 'password', type: string, autoComplete: string) => (
    <input
      ref={refs[key]}
      id={`u-${key}`}
      type={type}
      autoComplete={autoComplete}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      aria-invalid={!!errors[key]}
      aria-describedby={errors[key] ? `u-${key}-err` : key === 'password' ? 'u-password-hint' : undefined}
      className={INPUT}
    />
  );

  return (
    <>
      <PageHeader title={t('nav.users')} help={t('help.users')} />
      <Section title={t('users.list')} id="list">
        <LoadState q={q} isEmpty={(u) => u.length === 0}>
          {(users) => (
            <SimpleTable
              caption={t('users.list')}
              headers={[t('users.name'), t('auth.email'), t('users.role')]}
              rows={users.map((u) => [u.name, u.email, t(`role.${u.role}`)])}
            />
          )}
        </LoadState>
      </Section>

      <Section title={t('users.add')} id="add">
        <form onSubmit={onSubmit} noValidate className="max-w-xl rounded-2xl border-2 border-line bg-paper-raised p-5">
          <Field id="u-name" label={t('users.name')} error={errors.name}>
            {input('name', 'text', 'name')}
          </Field>
          <Field id="u-email" label={t('auth.email')} error={errors.email}>
            {input('email', 'email', 'email')}
          </Field>
          <Field id="u-role" label={t('users.role')}>
            <select id="u-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))} className={INPUT}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="u-password" label={t('auth.password')} error={errors.password} hint="8+">
            {input('password', 'password', 'new-password')}
          </Field>
          <Button type="submit" disabled={busy} icon="+">
            {busy ? t('common.loading') : t('users.add')}
          </Button>
          {result && (
            <p role={result.ok ? 'status' : 'alert'} className={`mt-4 text-lg font-semibold ${result.ok ? 'text-rlow' : 'text-rhigh'}`}>
              {result.text}
            </p>
          )}
        </form>
      </Section>
    </>
  );
}
