import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BAND_CUTOFFS } from './bands';
import RiskScoreBar from './RiskScoreBar';

describe('RiskScoreBar (band scale)', () => {
  it('splits the 0-1 track at exactly the fixed 0.40 and 0.70 cut-offs', () => {
    render(<RiskScoreBar probability={0.61} category="medium" />);
    const widths = [...document.querySelectorAll('[data-band]')].map((zone) => [
      zone.getAttribute('data-band'),
      (zone as HTMLElement).style.width,
    ]);
    expect(BAND_CUTOFFS).toEqual({ medium: 0.4, high: 0.7 });
    expect(widths).toEqual([
      ['low', '40%'],
      ['medium', '30%'],
      ['high', '30%'],
    ]);
  });

  it('places the marker at the unrounded score', () => {
    render(<RiskScoreBar probability={0.6951} category="medium" />);
    expect(screen.getByTestId('band-marker').style.left).toBe('69.51%');
  });

  it('keeps the marker on the track for out-of-range input', () => {
    const { unmount } = render(<RiskScoreBar probability={1.4} category="high" />);
    expect(screen.getByTestId('band-marker').style.left).toBe('100%');
    unmount();
    render(<RiskScoreBar probability={-0.2} category="low" />);
    expect(screen.getByTestId('band-marker').style.left).toBe('0%');
  });

  it('colours the marker by the band the API returned, not by its position', () => {
    // A score of 0.65 with a "high" band from the API (e.g. if the backend
    // threshold changed) is still marked as high: the API is authoritative.
    render(<RiskScoreBar probability={0.65} category="high" />);
    expect(screen.getByTestId('band-marker').className).toContain('bg-zone-high');
  });

  it('labels the cut-offs on the large scale only', () => {
    const { unmount } = render(<RiskScoreBar probability={0.5} category="medium" />);
    for (const label of ['0.00', '0.40', '0.70', '1.00']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    unmount();
    render(<RiskScoreBar probability={0.5} category="medium" size="sm" />);
    expect(screen.queryByText('0.40')).not.toBeInTheDocument();
  });

  it('is hidden from assistive tech, because the score and band are given as text beside it', () => {
    render(<RiskScoreBar probability={0.5} category="medium" />);
    expect(screen.getByTestId('band-scale')).toHaveAttribute('aria-hidden', 'true');
  });
});
