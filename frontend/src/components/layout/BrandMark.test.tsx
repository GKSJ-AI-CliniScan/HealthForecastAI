import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import BrandMark from './BrandMark';

describe('BrandMark', () => {
  it('is decorative, since the product name always sits beside it', () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('takes its colours from the brand tokens, so it follows the theme', () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector('rect')).toHaveClass('fill-brand');
    expect(container.querySelector('g')).toHaveClass('stroke-on-brand');
  });

  it('matches the favicon drawing', () => {
    const favicon = readFileSync(join(__dirname, '../../app/icon.svg'), 'utf8');
    const { container } = render(<BrandMark />);
    for (const path of container.querySelectorAll('path')) {
      expect(favicon).toContain(`d="${path.getAttribute('d')}"`);
    }
  });
});
