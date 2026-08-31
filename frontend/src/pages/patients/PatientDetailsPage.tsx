import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  FileText,
  Building2,
  Stethoscope,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Edit2,
} from 'lucide-react';
import { patientsApi } from '@/api/patients.api';
import { medicalHistoryApi } from '@/api/medicalHistory.api';
import { admissionsApi } from '@/api/admissions.api';
import { treatmentsApi } from '@/api/treatments.api';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';
import { MedicalHistoryTab } from '@/components/patients/MedicalHistoryTab';
import { AdmissionsTab } from '@/components/patients/AdmissionsTab';
import { TreatmentsTab } from '@/components/patients/TreatmentsTab';
import { PatientFormModal } from '@/components/patients/PatientFormModal';

export const PatientDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isResearcher = user?.role === 'RESEARCHER';
  const canEdit = user?.role === 'DOCTOR' || user?.role === 'SYSTEM_ADMIN';

  const [activeTab, setActiveTab] = useState<'overview' | 'medical' | 'admissions' | 'treatments'>('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Queries
  const {
    data: patient,
    isLoading: patientLoading,
    isError: patientError,
    refetch: refetchPatient,
  } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.getPatient(id!),
    enabled: !!id,
  });

  const { data: medicalHistories = [] } = useQuery({
    queryKey: ['medical-history', id],
    queryFn: () => medicalHistoryApi.getPatientMedicalHistory(id!),
    enabled: !!id,
  });

  const { data: admissions = [] } = useQuery({
    queryKey: ['admissions', id],
    queryFn: () => admissionsApi.getPatientAdmissions(id!),
    enabled: !!id,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments', id],
    queryFn: () => treatmentsApi.getPatientTreatments(id!),
    enabled: !!id,
  });

  // Mutations
  const updatePatientMutation = useMutation({
    mutationFn: (payload: any) => patientsApi.updatePatient(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
      setEditModalOpen(false);
    },
  });

  // Medical history mutations
  const addMedHistoryMutation = useMutation({
    mutationFn: (payload: any) => medicalHistoryApi.createMedicalHistory(id!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medical-history', id] }),
  });
  const updateMedHistoryMutation = useMutation({
    mutationFn: ({ histId, payload }: { histId: string; payload: any }) =>
      medicalHistoryApi.updateMedicalHistory(histId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medical-history', id] }),
  });
  const deleteMedHistoryMutation = useMutation({
    mutationFn: (histId: string) => medicalHistoryApi.deleteMedicalHistory(histId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medical-history', id] }),
  });

  // Admissions mutations
  const addAdmissionMutation = useMutation({
    mutationFn: (payload: any) => admissionsApi.createAdmission(id!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admissions', id] }),
  });
  const updateAdmissionMutation = useMutation({
    mutationFn: ({ admId, payload }: { admId: string; payload: any }) =>
      admissionsApi.updateAdmission(admId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admissions', id] }),
  });
  const deleteAdmissionMutation = useMutation({
    mutationFn: (admId: string) => admissionsApi.deleteAdmission(admId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admissions', id] }),
  });

  // Treatments mutations
  const addTreatmentMutation = useMutation({
    mutationFn: (payload: any) => treatmentsApi.createTreatment(id!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treatments', id] }),
  });
  const updateTreatmentMutation = useMutation({
    mutationFn: ({ txId, payload }: { txId: string; payload: any }) =>
      treatmentsApi.updateTreatment(txId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treatments', id] }),
  });
  const deleteTreatmentMutation = useMutation({
    mutationFn: (txId: string) => treatmentsApi.deleteTreatment(txId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treatments', id] }),
  });

  if (patientLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  if (patientError || !patient) {
    return (
      <ErrorAlert
        message="Unable to find patient clinical file or access is restricted."
        onRetry={() => refetchPatient()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} icon={ArrowLeft}>
          Back to Directory
        </Button>
      </div>

      {/* Patient Header Banner */}
      <PageHeader
        title={isResearcher ? (patient as any).anonymized_patient_id : patient.full_name}
        subtitle={
          isResearcher
            ? 'De-Identified Research Record'
            : `Medical Record ID: ${patient.patient_identifier}`
        }
        badge={
          isResearcher ? (
            <Badge variant="purple">Anonymized Record</Badge>
          ) : (
            <Badge variant="teal">Registered Inpatient</Badge>
          )
        }
      >
        {!isResearcher && canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            icon={Edit2}
          >
            Edit Record
          </Button>
        )}
      </PageHeader>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/40 dark:bg-teal-950/20 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('medical')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'medical'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/40 dark:bg-teal-950/20 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Medical History ({medicalHistories.length})
        </button>
        <button
          onClick={() => setActiveTab('admissions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'admissions'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/40 dark:bg-teal-950/20 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Admissions ({admissions.length})
        </button>
        <button
          onClick={() => setActiveTab('treatments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'treatments'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/40 dark:bg-teal-950/20 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Treatments ({treatments.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Demographics Card */}
          <Card className="md:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-500" />
              Patient Demographics & Identifiers
            </h3>

            {isResearcher ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Anonymized Identifier</span>
                  <span className="font-mono font-bold text-purple-600 text-sm">{(patient as any).anonymized_patient_id}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Age Bracket</span>
                  <span className="font-semibold">{(patient as any).age_group || '[50-60)'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Gender</span>
                  <span className="font-semibold">{patient.gender || 'Unknown'}</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <span className="text-purple-700 dark:text-purple-300 block text-[10px] uppercase font-bold">Privacy Level</span>
                  <span className="font-semibold text-purple-800 dark:text-purple-200">Zero PII Sanitized</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Date of Birth</span>
                    <span className="font-semibold">{patient.date_of_birth || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Gender</span>
                    <span className="font-semibold">{patient.gender || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone</span>
                    <span className="font-semibold">{patient.phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                    <span className="font-semibold truncate max-w-[170px] block">{patient.email || 'N/A'}</span>
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Address</span>
                    <span className="font-semibold">{patient.address || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Quick Summary Card */}
          <Card className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              Clinical Summary
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-slate-500">Medical Histories</span>
                <span className="font-bold text-teal-600">{medicalHistories.length} Logged</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-slate-500">Admission Episodes</span>
                <span className="font-bold text-sky-600">{admissions.length} Episodes</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-slate-500">Active Treatments</span>
                <span className="font-bold text-purple-600">
                  {treatments.filter((t) => t.status === 'ACTIVE').length} Active
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'medical' && (
        <MedicalHistoryTab
          records={medicalHistories}
          onAdd={async (payload) => {
            await addMedHistoryMutation.mutateAsync(payload);
          }}
          onUpdate={async (histId, payload) => {
            await updateMedHistoryMutation.mutateAsync({ histId, payload });
          }}
          onDelete={async (histId) => {
            await deleteMedHistoryMutation.mutateAsync(histId);
          }}
        />
      )}

      {activeTab === 'admissions' && (
        <AdmissionsTab
          records={admissions}
          onAdd={async (payload) => {
            await addAdmissionMutation.mutateAsync(payload);
          }}
          onUpdate={async (admId, payload) => {
            await updateAdmissionMutation.mutateAsync({ admId, payload });
          }}
          onDelete={async (admId) => {
            await deleteAdmissionMutation.mutateAsync(admId);
          }}
        />
      )}

      {activeTab === 'treatments' && (
        <TreatmentsTab
          records={treatments}
          onAdd={async (payload) => {
            await addTreatmentMutation.mutateAsync(payload);
          }}
          onUpdate={async (txId, payload) => {
            await updateTreatmentMutation.mutateAsync({ txId, payload });
          }}
          onDelete={async (txId) => {
            await deleteTreatmentMutation.mutateAsync(txId);
          }}
        />
      )}

      {/* Edit Modal */}
      {!isResearcher && (
        <PatientFormModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          patientToEdit={patient}
          onSubmit={async (formData) => {
            await updatePatientMutation.mutateAsync(formData);
          }}
          isLoading={updatePatientMutation.isPending}
        />
      )}
    </div>
  );
};
