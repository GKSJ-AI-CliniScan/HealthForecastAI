'use client';
/**
 * Help and accessibility (/help) — every accessibility setting in one place.
 *
 * Built only from native, labelled controls (<select>, radio groups in
 * <fieldset>, checkboxes) — the most reliable controls for screen readers,
 * switch devices and voice control. Changes apply instantly and are remembered.
 * FLOWS NEXT: A11yProvider.update() → classes on <html> → globals.css.
 */
import { useA11y, type Speed, type TextSize } from '@/a11y/A11yProvider';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { LanguagePicker } from '@/saral/LanguagePicker';
import { Button, PageHeader, Section } from '@/saral/ui';

export default function HelpPage() {
  return (
    <AppShell page="help">
      <Help />
    </AppShell>
  );
}

function Radios<T extends string>({ name, legend, options, value, onChange }: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-2 text-lg font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={`flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border-2 px-4 text-lg ${value === o.value ? 'border-teal bg-paper-raised font-semibold' : 'border-line'}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="h-5 w-5" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="mb-3 flex min-h-[48px] items-center gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6" />
      <label htmlFor={id} className="text-lg">
        {label}
      </label>
    </div>
  );
}

const SHORTCUTS: [string, TKey][] = [
  ['Alt + Shift + R', 'a11y.sc.read'],
  ['Alt + Shift + S', 'a11y.sc.stop'],
  ['Alt + Shift + V', 'a11y.sc.listen'],
  ['Alt + Shift + H', 'a11y.sc.home'],
  ['Alt + Shift + 1…9', 'a11y.sc.pages'],
];

function Help() {
  const { t } = useI18n();
  const { settings, update, say, listen } = useA11y();
  return (
    <>
      <PageHeader title={t('nav.help')} help={t('help.help')} />

      <Section title={t('a11y.language')} id="lang">
        <LanguagePicker id="lang-help" />
      </Section>

      <Section title={t('a11y.textSize')} id="see">
        <Radios<TextSize>
          name="size"
          legend={t('a11y.textSize')}
          value={settings.textSize}
          onChange={(v) => update({ textSize: v })}
          options={[
            { value: 'normal', label: t('a11y.size.normal') },
            { value: 'large', label: t('a11y.size.large') },
            { value: 'xlarge', label: t('a11y.size.xlarge') },
          ]}
        />
        <Toggle id="hc" label={t('a11y.contrast')} checked={settings.contrast} onChange={(v) => update({ contrast: v })} />
        <Toggle id="rm" label={t('a11y.motion')} checked={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
      </Section>

      <Section title={t('a11y.read')} id="voice">
        <Toggle id="talk" label={t('a11y.talking')} checked={settings.talking} onChange={(v) => update({ talking: v })} />
        <Toggle id="auto" label={t('a11y.autoRead')} checked={settings.autoRead} onChange={(v) => update({ autoRead: v })} />
        <Radios<Speed>
          name="speed"
          legend={t('a11y.speed')}
          value={settings.speed}
          onChange={(v) => update({ speed: v })}
          options={[
            { value: 'slow', label: t('a11y.speed.slow') },
            { value: 'normal', label: t('a11y.speed.normal') },
            { value: 'fast', label: t('a11y.speed.fast') },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" icon="🔊" onClick={() => say(t('app.tagline'))}>
            {t('a11y.read')}
          </Button>
          <Button variant="quiet" icon="🎤" onClick={listen}>
            {t('a11y.listen')}
          </Button>
        </div>
        <p className="mt-3 text-lg">{t('a11y.voiceHelp')}</p>
      </Section>

      <Section title={t('a11y.shortcuts')} id="keys">
        <dl className="grid gap-2">
          {SHORTCUTS.map(([keys, k]) => (
            <div key={keys} className="flex flex-wrap gap-3 text-lg">
              <dt>
                <kbd className="rounded-lg border-2 border-line bg-paper-raised px-2 py-1 font-semibold">{keys}</kbd>
              </dt>
              <dd>{t(k)}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
