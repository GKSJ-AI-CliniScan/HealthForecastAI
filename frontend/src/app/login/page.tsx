'use client'
/**
 * Sign-in page (Milestone 1 — authentication).
 *
 * SIMPLE ON PURPOSE: language picker FIRST (so a non-English user can read the
 * rest), then email + password + role + one big button. In demo mode, one-tap
 * buttons for the 4 roles.
 * v2 look: split screen — left a brand panel that says in 4 lines what the app does
 * (reuses the translated page-help sentences, so it is in every language), right the form card.
 * On phones the brand panel shrinks to a header above the form. Errors are spoken by screen readers (role="alert")
 * and focus jumps to the first wrong field.
 *
 * v3 (RBAC on screen): the user also picks their role ("Your role").
 * WHY: the team wants role-based access to be visible at sign-in.
 * SECURITY: the picked role is only a CHECK, never the source of truth. The real
 * role always comes from the backend (POST /auth/login → user.role). If the two
 * differ we sign the user straight out and show the normal "sign-in failed"
 * message — we do NOT say which role the account really has, so nobody can use
 * this screen to guess roles.
 * FLOWS NEXT: session.login() → data.login() → POST /auth/login → role check → /dashboard
 *             (RequireRole then guards every page by user.role).
 */
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { DATA_MODE } from '@/config'
import { ApiError } from '@/data'
import { DEMO_ACCOUNTS } from '@/data/demo'
import type { Role } from '@/data/types'
import { useI18n } from '@/i18n/I18nProvider'
import { useSession } from '@/lib/session'
import { LanguagePicker } from '@/saral/LanguagePicker'
import { Watermark } from '@/saral/Watermark'
import { BrandIcon, PAGE_ICON } from '@/saral/icons'
import { Button, CARD, Field, INPUT } from '@/saral/ui'
import { ArrowRight } from 'lucide-react'
import type { TKey } from '@/i18n/I18nProvider'

/** What the app does — one line each, already translated (page help sentences). */
const FEATURES: { icon: keyof typeof PAGE_ICON; key: TKey }[] = [
  { icon: 'risk', key: 'help.risk' },
  { icon: 'forecast', key: 'help.forecast' },
  { icon: 'care', key: 'help.care' },
  { icon: 'help', key: 'help.help' }
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The 4 roles, taken from the demo accounts list.
 * WHY from DEMO_ACCOUNTS (not a new hard-coded list): that list already has one
 * account per role with the exact role values the app uses, and the role names
 * are already translated as `role.<value>` — so no second list can go out of sync.
 * Set → removes duplicates if a role ever gets two demo accounts.
 */
const ROLE_OPTIONS: Role[] = Array.from(
  new Set(DEMO_ACCOUNTS.map(a => a.role as Role))
)

export default function LoginPage () {
  const { t } = useI18n()
  // logout is needed now: a role mismatch must undo the session login() just created.
  const { login, logout, user, ready } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // null = nothing picked yet → the form asks for it (no silent default role).
  const [role, setRole] = useState<Role | null>(null)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    role?: string
    form?: string
  }>({})
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passRef = useRef<HTMLInputElement>(null)
  // First radio button — focus goes here when no role was picked.
  const roleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ready && user) router.replace('/dashboard') // already signed in
  }, [ready, user, router])

  /**
   * @param expected the role the person says they are. Demo buttons pass their own
   *                 role; the form passes the picked radio button.
   */
  async function signIn (e?: string, p?: string, expected?: Role) {
    setBusy(true)
    setErrors({})
    try {
      const u = await login(e ?? email, p ?? password)
      const want = expected ?? role
      // ROLE CHECK — backend role (u.role) must equal the picked role.
      if (want && u.role !== want) {
        // Undo the session right away. login() and logout() run in the same tick,
        // so React batches them and the "already signed in → /dashboard" effect
        // above never sees this user.
        logout()
        setPassword('') // make them type it again — no silent retry with another role
        setErrors({ form: t('auth.failed') }) // same message as a wrong password, on purpose
        return
      }
      router.push('/dashboard')
    } catch (err) {
      // offline gets its own message, so people don't retype a correct password forever
      setErrors({
        form:
          err instanceof ApiError && err.kind === 'offline'
            ? t('common.offline')
            : t('auth.failed')
      })
    } finally {
      setBusy(false)
    }
  }

  function onSubmit (ev: FormEvent) {
    ev.preventDefault()
    // Validate before calling the server; move focus to the first problem (top to bottom).
    const next: typeof errors = {}
    if (!EMAIL_RE.test(email.trim()))
      next.email = email ? t('form.badEmail') : t('form.required')
    if (!password) next.password = t('form.required')
    if (!role) next.role = t('form.required')
    setErrors(next)
    if (next.email) return emailRef.current?.focus()
    if (next.password) return passRef.current?.focus()
    if (next.role) return roleRef.current?.focus()
    void signIn()
  }

  return (
    <div className='grid min-h-screen bg-paper lg:grid-cols-2'>
      <a href='#main' className='skip-link'>
        {t('a11y.skip')}
      </a>

      {/* Brand panel (decorative + informative; the form never depends on it). */}
      <aside className='bg-hero flex flex-col justify-between gap-8 p-6 text-white sm:p-10 lg:p-14'>
        <p className='flex items-center gap-3 text-xl font-bold'>
          <span
            aria-hidden='true'
            className='grid h-11 w-11 place-items-center rounded-xl bg-white/15'
          >
            <BrandIcon size={24} />
          </span>
          {t('app.name')}
        </p>
        <div>
          <p className='max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl'>
            {t('app.tagline')}
          </p>
          <ul className='mt-8 hidden space-y-4 sm:block'>
            {FEATURES.map(f => {
              const Icon = PAGE_ICON[f.icon]
              return (
                <li
                  key={f.key}
                  className='flex items-start gap-3 text-base text-white/90'
                >
                  <span
                    aria-hidden='true'
                    className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15'
                  >
                    <Icon size={18} />
                  </span>
                  <span className='pt-1.5'>{t(f.key)}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <span className='hidden text-sm text-white/70 lg:block'>
          Infosys Springboard · HealthForecast AI
        </span>
      </aside>

      <div className='flex flex-col'>
        <div className='flex justify-end px-4 pt-4 sm:px-8'>
          <LanguagePicker id='lang-login' />
        </div>
        <main
          id='main'
          className='flex flex-1 items-center justify-center px-4 py-8 sm:px-8'
        >
          <div className={`${CARD} w-full max-w-md p-6 sm:p-8`}>
            <h1 className='mb-1 text-2xl font-bold tracking-tight'>
              {t('auth.title')}
            </h1>
            <p className='mb-6 text-sm text-ink-soft'>{t('auth.noAccount')}</p>

            {errors.form && (
              <p
                role='alert'
                className='mb-5 rounded-xl border border-rhigh bg-rhigh-bg p-4 text-base font-semibold text-rhigh'
              >
                {errors.form}
              </p>
            )}

            <form onSubmit={onSubmit} noValidate>
              <Field id='email' label={t('auth.email')} error={errors.email}>
                <input
                  ref={emailRef}
                  id='email'
                  type='email'
                  inputMode='email'
                  autoComplete='username'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-err' : undefined}
                  className={INPUT}
                />
              </Field>
              <Field
                id='password'
                label={t('auth.password')}
                error={errors.password}
              >
                <input
                  ref={passRef}
                  id='password'
                  type='password'
                  autoComplete='current-password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? 'password-err' : undefined
                  }
                  className={INPUT}
                />
              </Field>

              {/* Role picker — real radio buttons inside a fieldset, so screen readers
                  announce "Your role, group, Doctor, radio button, 1 of 4" and arrow keys work. */}
              <fieldset
                className='mb-5'
                aria-invalid={!!errors.role}
                aria-describedby={errors.role ? 'role-err' : undefined}
              >
                <div className='grid grid-cols-2 gap-2'>
                  {ROLE_OPTIONS.map((r, i) => {
                    const picked = role === r
                    return (
                      <label
                        key={r}
                        // Big tap targets (min 48px) and a clear ring on the picked one —
                        // not colour alone, so it also works for colour-blind users.
                        className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                          picked
                            ? 'border-current font-semibold ring-2 ring-current'
                            : 'border-line'
                        }`}
                      >
                        <input
                          ref={i === 0 ? roleRef : undefined}
                          type='radio'
                          name='role'
                          value={r}
                          checked={picked}
                          onChange={() => setRole(r)}
                          className='h-4 w-4 shrink-0'
                        />
                        {t(`role.${r}` as TKey)}
                      </label>
                    )
                  })}
                </div>
                {errors.role && (
                  <p
                    id='role-err'
                    role='alert'
                    className='mt-2 text-sm font-semibold text-rhigh'
                  >
                    {errors.role}
                  </p>
                )}
              </fieldset>

              <div className='[&>button]:w-full'>
                <Button type='submit' disabled={busy}>
                  {busy ? t('auth.busy') : t('auth.submit')}
                  <ArrowRight aria-hidden='true' size={18} />
                </Button>
              </div>
            </form>

            {DATA_MODE === 'demo' && (
              <section
                className='mt-8 border-t border-line pt-6'
                aria-labelledby='demo-h'
              >
                <h2
                  id='demo-h'
                  className='mb-3 text-sm font-semibold text-ink-soft'
                >
                  {t('auth.demo')}
                </h2>
                <div className='grid grid-cols-2 gap-2'>
                  {DEMO_ACCOUNTS.map(a => (
                    <Button
                      key={a.role}
                      variant='quiet'
                      disabled={busy}
                      onClick={() => {
                        // Demo button = that account AND that role, so the role check passes
                        // and the picker shows which role was used.
                        setRole(a.role as Role)
                        void signIn(a.email, 'demo', a.role as Role)
                      }}
                    >
                      {t(`role.${a.role}` as TKey)}
                    </Button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
        <Watermark />
      </div>
    </div>
  )
}
