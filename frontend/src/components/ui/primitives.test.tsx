import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Cell, MetricStrip, PageHeader, RiskBadge, Row, StatTile, Table } from './index';

describe('PageHeader', () => {
  it('renders the title as the page heading with its description and actions', () => {
    render(<PageHeader title="Patients" description="Hospital-wide records." actions={<button type="button">Search</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Patients' })).toBeInTheDocument();
    expect(screen.getByText('Hospital-wide records.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('marks the last breadcrumb as the current page and links the rest', () => {
    render(
      <PageHeader
        title="SYN-QA-0001"
        breadcrumb={[{ label: 'Patients', href: '/dashboard/patients' }, { label: 'SYN-QA-0001' }]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Patients' })).toHaveAttribute('href', '/dashboard/patients');
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('SYN-QA-0001');
  });
});

describe('RiskBadge', () => {
  it.each([
    ['low', 'LOW', 'text-zone-low'],
    ['medium', 'MEDIUM', 'text-zone-medium'],
    ['high', 'HIGH', 'text-zone-high'],
  ])('names the %s band in text, with its zone colour', (category, text, colour) => {
    render(<RiskBadge category={category} />);
    const badge = screen.getByText(text);
    expect(badge.className).toContain(colour);
  });

  it('falls back to a neutral badge for an unknown category', () => {
    render(<RiskBadge category="unrated" />);
    expect(screen.getByText('UNRATED').className).toContain('text-ink-muted');
  });
});

describe('StatTile and MetricStrip', () => {
  it('keeps the value immediately after its label', () => {
    render(
      <MetricStrip label="Summary">
        <StatTile variant="plain" label="Admissions" value={3} />
      </MetricStrip>,
    );
    expect(screen.getByRole('region', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText('Admissions').nextSibling).toHaveTextContent('3');
  });
});

describe('Table', () => {
  it('right-aligns numeric columns, header and cells alike', () => {
    render(
      <Table headers={['Name', 'Stay (days)']} numeric={[1]}>
        <Row>
          <Cell>Ward A</Cell>
          <Cell numeric>4</Cell>
        </Row>
      </Table>,
    );
    expect(screen.getByRole('columnheader', { name: 'Stay (days)' }).className).toContain('text-right');
    expect(screen.getByRole('columnheader', { name: 'Name' }).className).not.toContain('text-right');
    expect(screen.getByRole('cell', { name: '4' }).className).toContain('tabular-nums');
  });

  it('shows the empty message instead of an empty table', () => {
    render(<Table headers={['Name']} empty="No patients yet.">{[]}</Table>);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No patients yet.')).toBeInTheDocument();
  });
});
