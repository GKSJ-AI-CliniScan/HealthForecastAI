import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Stethoscope } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { usersApi } from '@/api/users.api';
import { patientsApi } from '@/api/patients.api';
import { PageHeader } from '@/components/common/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';

export const DoctorPatientAssignmentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');

  // Queries
  const { data: assignments, isLoading, isError, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: adminApi.listAssignments,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: usersApi.listDoctors,
  });

  const { data: patientsData } = useQuery({
    queryKey: ['patients-select'],
    queryFn: () => patientsApi.listPatients({ page: 1, page_size: 100 }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => adminApi.createAssignment(selectedDoctor, selectedPatient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteAssignment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });

  const handleOpenAssign = () => {
    if (doctors.length > 0) setSelectedDoctor(doctors[0].id);
    if (patientsData?.items.length) setSelectedPatient(patientsData.items[0].id);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDoctor && selectedPatient) {
      await createMutation.mutateAsync();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor-Patient Clinical Assignments"
        subtitle="Manage care mapping between treating physicians and patient cohorts."
      >
        <Button variant="primary" size="md" onClick={handleOpenAssign} icon={Plus}>
          New Assignment
        </Button>
      </PageHeader>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : isError ? (
        <ErrorAlert message="Failed to load assignments." onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doctor</TableHead>
              <TableHead>Patient Identifier</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Assigned Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                  No doctor-patient assignments active.
                </TableCell>
              </TableRow>
            ) : (
              assignments?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      {a.doctor_name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-teal-600">
                    {a.patient_identifier}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                    {a.patient_name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 font-mono">
                    {new Date(a.assigned_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(a.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign Doctor to Patient"
        description="Allocate clinical care ownership for a registered patient."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Select Treating Doctor"
            options={doctors.map((d) => ({
              value: d.id,
              label: `${d.full_name} (@${d.username})`,
            }))}
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          />

          <Select
            label="Select Patient"
            options={
              patientsData?.items.map((p: any) => ({
                value: p.id,
                label: `${p.patient_identifier} - ${p.full_name || 'Patient'}`,
              })) || []
            }
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
