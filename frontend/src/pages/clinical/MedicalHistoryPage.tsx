import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';

import { patientsApi } from '@/api/patients.api';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';

export const MedicalHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: patientsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['patients-for-medical-history', search],
    queryFn: () => patientsApi.listPatients({ page: 1, page_size: 20, search: search || undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Records & Histories"
        subtitle="Review longitudinal patient medical histories, clinical diagnoses, and chronic disease profiles."
      />

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient records to review medical history..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : isError ? (
        <ErrorAlert message="Failed to load clinical directory." onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identifier</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Gender / DOB</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patientsData?.items.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs font-bold text-teal-600">
                  {p.patient_identifier || p.anonymized_patient_id}
                </TableCell>
                <TableCell className="font-bold">{p.full_name || 'Anonymized Cohort'}</TableCell>
                <TableCell className="text-xs">{p.date_of_birth || p.age_group} ({p.gender})</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/patients/${p.id}`)}
                    icon={FileText}
                  >
                    View History
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
