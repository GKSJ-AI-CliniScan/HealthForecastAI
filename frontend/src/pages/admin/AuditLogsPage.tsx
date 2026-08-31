import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { PageHeader } from '@/components/common/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';


export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => adminApi.listAuditLogs(page, 15),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Platform Audit Trail"
        subtitle="Complete immutable chronological record of authenticated user actions and system changes."
      />

      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : isError ? (
        <ErrorAlert message="Failed to load security audit logs." onRetry={() => refetch()} />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Initiating User</TableHead>
                <TableHead>Action Taken</TableHead>
                <TableHead>Target Resource</TableHead>
                <TableHead>Resource ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    No audit records logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {log.username || 'System Automation'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.action.includes('DELETE')
                            ? 'rose'
                            : log.action.includes('CREATE')
                            ? 'emerald'
                            : log.action.includes('LOGIN')
                            ? 'teal'
                            : 'slate'
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {log.resource || 'SYSTEM'}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-400 truncate max-w-[150px]">
                      {log.resource_id || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && (
            <Pagination
              currentPage={data.page}
              totalPages={data.total_pages}
              totalItems={data.total}
              pageSize={data.page_size}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </div>
      )}
    </div>
  );
};
