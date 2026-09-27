import { Badge, Cell, Row, Table } from '@/components/ui';
import DownloadButton from '@/components/ui/DownloadButton';
import { formatBytes, formatDateTime } from '@/lib/format';
import { FILTER_LABELS, reportTypeLabel } from '@/lib/reports';
import type { Report, ReportFilterKey } from '@/types';

import DeleteReportButton from './DeleteReportButton';

function describeFilters(report: Report): string {
  const entries = Object.entries(report.filters) as [ReportFilterKey, string | number][];
  if (entries.length === 0) {
    return 'None';
  }
  return entries.map(([key, value]) => `${FILTER_LABELS[key] ?? key}: ${value}`).join(' · ');
}

/** Report history rows with their download and delete actions. */
export default function ReportHistory({
  reports,
  currentUserId,
  ownerNames,
}: {
  reports: Report[];
  currentUserId: number | null;
  ownerNames: Record<number, string>;
}) {
  const owner = (id: number) =>
    id === currentUserId ? 'You' : (ownerNames[id] ?? `User #${id}`);

  return (
    <Table
      headers={['Report', 'Format', 'Generated (UTC)', 'Owner', 'Filters', 'Size', 'Actions']}
      empty="No reports yet. Generate one above."
    >
      {reports.map((report) => (
        <Row key={report.id}>
          <Cell>{reportTypeLabel(report.report_type)}</Cell>
          <Cell>
            <Badge>{report.format.toUpperCase()}</Badge>
          </Cell>
          <Cell>{formatDateTime(report.generated_at)}</Cell>
          <Cell>{owner(report.generated_by)}</Cell>
          <Cell>
            <span className="text-xs opacity-80">{describeFilters(report)}</span>
          </Cell>
          <Cell>{formatBytes(report.file_size_bytes)}</Cell>
          <Cell>
            <div className="flex flex-wrap gap-2">
              <DownloadButton
                href={`/api/reports/${report.id}/download`}
                fallbackName={`${report.report_type}_${report.id}.${report.format}`}
              />
              <DeleteReportButton reportId={report.id} />
            </div>
          </Cell>
        </Row>
      ))}
    </Table>
  );
}
