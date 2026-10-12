import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExperimentalNotice, SCORE_NOTES, ScoreNote, formatModelScore } from './ModelDisclaimer';

const REQUIRED_WORDING =
  'Experimental decision-support prototype. HealthForecast AI has not been clinically ' +
  'validated or approved for patient care. Scores come from models trained on a public ' +
  'research dataset. They are estimates, not diagnoses, and must not replace clinical judgment.';

describe('ExperimentalNotice', () => {
  it('states the approved wording as a labelled note', () => {
    render(<ExperimentalNotice />);
    const note = screen.getByRole('note', { name: 'Experimental status' });
    expect(note).toHaveTextContent(REQUIRED_WORDING);
  });

  it('never claims validation or regulatory approval', () => {
    render(<ExperimentalNotice />);
    const text = screen.getByRole('note').textContent ?? '';
    expect(text).toMatch(/not been clinically validated or approved/);
    expect(text).not.toMatch(/\b(certified|FDA|CE[- ]marked|clinically proven)\b/i);
  });
});

describe('SCORE_NOTES', () => {
  it('never describes a score as a calibrated probability, only as not one', () => {
    for (const note of Object.values(SCORE_NOTES)) {
      expect(note).not.toMatch(/\d+% probability/i);
      if (/probability/i.test(note)) {
        expect(note).toMatch(/not a calibrated probability|not calibrated probabilities/i);
      }
    }
  });

  it('names the two different targets', () => {
    expect(SCORE_NOTES.riskScore).toMatch(/in-hospital death or 30-day readmission/);
    expect(SCORE_NOTES.readmissionScore).toMatch(/30 days after a live discharge/);
  });

  it('states the fixed, unvalidated band cut-offs', () => {
    expect(SCORE_NOTES.bands).toMatch(/0\.40 and 0\.70/);
    expect(SCORE_NOTES.bands).toMatch(/not clinically validated/);
  });

  it('renders as a caption', () => {
    render(<ScoreNote>{SCORE_NOTES.history}</ScoreNote>);
    expect(screen.getByText(SCORE_NOTES.history)).toBeInTheDocument();
  });
});

describe('ScoreNote contrast', () => {
  it('uses opacity-75, not the opacity-60 that sits at the WCAG AA limit', () => {
    render(<ScoreNote>caption</ScoreNote>);
    const caption = screen.getByText('caption');
    expect(caption).toHaveClass('text-xs', 'opacity-75');
    expect(caption).not.toHaveClass('opacity-60');
  });
});

describe('formatModelScore', () => {
  // The band is computed from the unrounded score (>= 0.70 high, >= 0.40 medium),
  // so the display must never reach a cut-off the band has not reached.
  it.each([
    [0.395, '0.39'],
    [0.3999, '0.39'],
    [0.6951, '0.69'],
    [0.6999, '0.69'],
  ])('truncates %s to %s instead of rounding up to a cut-off', (score, shown) => {
    expect(formatModelScore(score)).toBe(shown);
  });

  it.each([
    [0.4, '0.40'],
    [0.7, '0.70'],
  ])('shows exactly %s as %s', (score, shown) => {
    expect(formatModelScore(score)).toBe(shown);
  });

  it('handles the range ends', () => {
    expect(formatModelScore(0)).toBe('0.00');
    expect(formatModelScore(1)).toBe('1.00');
    expect(formatModelScore(0.999999)).toBe('0.99');
  });

  it('never loses a hundredth to floating-point error', () => {
    // 0.29 * 100 is 28.999999999999996; a bare floor would show 0.28.
    for (let hundredths = 0; hundredths <= 100; hundredths += 1) {
      const exact = hundredths / 100;
      expect(formatModelScore(exact)).toBe(exact.toFixed(2));
      // Anything strictly below the next hundredth still shows this one.
      if (hundredths < 100) {
        expect(formatModelScore(exact + 0.0099)).toBe(exact.toFixed(2));
      }
    }
  });

  it('never displays a value at or above a cut-off whose band has not been reached', () => {
    for (let n = 0; n <= 10000; n += 1) {
      const score = n / 10000;
      const shown = Number(formatModelScore(score));
      expect(shown).toBeLessThanOrEqual(score + 1e-9);
      if (score < 0.7) expect(shown).toBeLessThan(0.7);
      if (score < 0.4) expect(shown).toBeLessThan(0.4);
    }
  });

  it('returns a dash for a non-finite value rather than "NaN"', () => {
    expect(formatModelScore(Number.NaN)).toBe('-');
    expect(formatModelScore(Number.POSITIVE_INFINITY)).toBe('-');
  });
});
