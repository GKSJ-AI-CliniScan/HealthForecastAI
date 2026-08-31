import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Search, Eye, Edit2, Trash2 } from 'lucide-react';

import { patientsApi } from '@/api/patients.api';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { LoadingSkeleton, ErrorAlert, EmptyState } from '@/components/common/FeedbackStates';
import { PatientFormModal } from '@/components/patients/PatientFormModal';
import { Patient, PatientCreatePayload } from '@/types';

export const PatientListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isResearcher = user?.role === 'RESEARCHER';
  const isDoctor = user?.role === 'DOCTOR';
  const isSysAdmin = user?.role === 'SYSTEM_ADMIN';
  const canCreate = user?.role === 'DOCTOR' || user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['patients', page, debouncedSearch, gender],
    queryFn: () =>
      patientsApi.listPatients({
        page,
        page_size: 10,
        search: debouncedSearch || undefined,
        gender: gender || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: PatientCreatePayload) => patientsApi.createPatient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setCreateModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      patientsApi.updatePatient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setEditingPatient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientsApi.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete patient ${name}?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isResearcher ? 'De-Identified Patient Cohorts' : 'Patient Management Directory'}
        subtitle={
          isDoctor
            ? 'Displaying patients assigned to your clinical roster.'
            : isResearcher
            ? 'HIPAA-compliant de-identified records strictly stripped of PII.'
            : 'Hospital-wide patient records registry and clinical files.'
        }
        badge={
          isResearcher ? (
            <Badge variant="purple">Anonymized View</Badge>
          ) : isDoctor ? (
            <Badge variant="teal">Assigned Cohort</Badge>
          ) : undefined
        }
      >
        {canCreate && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateModalOpen(true)}
            icon={UserPlus}
          >
            Register Patient
          </Button>
        )}
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={isResearcher ? "Search by gender or characteristics..." : "Search patient name, ID, or email..."}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            value={gender}
            onChange={(e) => {
              setGender(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : isError ? (
        <ErrorAlert message="Failed to load patient records." onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No Patients Found"
          description="No patient records match the current search or filter criteria."
          icon={Users}
          actionText={canCreate ? 'Register New Patient' : undefined}
          onAction={canCreate ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isResearcher ? 'Anonymized ID' : 'Identifier'}</TableHead>
                {!isResearcher && <TableHead>Full Name</TableHead>}
                <TableHead>{isResearcher ? 'Age Bracket' : 'DOB / Gender'}</TableHead>
                {!isResearcher && <TableHead>Contact</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                    {isResearcher ? p.anonymized_patient_id : p.patient_identifier}
                  </TableCell>
                  {!isResearcher && (
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                      {p.full_name}
                    </TableCell>
                  )}
                  <TableCell className="text-xs">
                    {isResearcher ? (
                      <span className="font-medium">{p.age_group || '[50-60)'} / {p.gender}</span>
                    ) : (
                      <span>{p.date_of_birth || 'N/A'} ({p.gender || 'N/A'})</span>
                    )}
                  </TableCell>
                  {!isResearcher && (
                    <TableCell className="text-xs text-slate-500">
                      <div>{p.phone || 'No phone'}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{p.email || ''}</div>
                    </TableCell>
                  )}
                  <TableCell>
                    {isResearcher ? (
                      <Badge variant="purple">De-Identified</Badge>
                    ) : (
                      <Badge variant="emerald">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/patients/${p.id}`)}
                        icon={Eye}
                      >
                        Details
                      </Button>
                      {!isResearcher && (isDoctor || isSysAdmin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPatient(p)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {isSysAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id, p.full_name || p.patient_identifier)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <Pagination
            currentPage={data.page}
            totalPages={data.total_pages}
            totalItems={data.total}
            pageSize={data.page_size}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}

      {/* Create / Edit Patient Modal */}
      <PatientFormModal
        isOpen={createModalOpen || !!editingPatient}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingPatient(null);
        }}
        patientToEdit={editingPatient}
        onSubmit={async (formData) => {
          if (editingPatient) {
            await updateMutation.mutateAsync({ id: editingPatient.id, payload: formData });
          } else {
            await createMutation.mutateAsync(formData);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};
