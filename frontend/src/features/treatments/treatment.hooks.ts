import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { treatmentApi } from './treatment.api';
import { Medication, PatientOutcome } from './treatment.types';

export const usePatientTreatmentAnalysis = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-treatment-analysis', patientId],
    queryFn: () => treatmentApi.getPatientTreatmentAnalysis(patientId),
    enabled: !!patientId,
  });
};

export const usePatientMedications = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-medications', patientId],
    queryFn: () => treatmentApi.getPatientMedications(patientId),
    enabled: !!patientId,
  });
};

export const usePatientRecovery = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-recovery', patientId],
    queryFn: () => treatmentApi.getPatientRecovery(patientId),
    enabled: !!patientId,
  });
};

export const usePatientOutcomes = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-outcomes', patientId],
    queryFn: () => treatmentApi.getPatientOutcomes(patientId),
    enabled: !!patientId,
  });
};

export const useCreateMedication = (patientId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Medication>) =>
      treatmentApi.createMedication(patientId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-medications', patientId] });
      qc.invalidateQueries({ queryKey: ['analytics', 'medications'] });
    },
  });
};

export const useUpdateMedication = (patientId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medId, payload }: { medId: string; payload: Partial<Medication> }) =>
      treatmentApi.updateMedication(medId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-medications', patientId] });
      qc.invalidateQueries({ queryKey: ['analytics', 'medications'] });
    },
  });
};

export const useDeleteMedication = (patientId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (medId: string) => treatmentApi.deleteMedication(medId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-medications', patientId] });
      qc.invalidateQueries({ queryKey: ['analytics', 'medications'] });
    },
  });
};

export const useCreatePatientOutcome = (patientId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PatientOutcome>) =>
      treatmentApi.createPatientOutcome(patientId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-outcomes', patientId] });
      qc.invalidateQueries({ queryKey: ['patient-recovery', patientId] });
      qc.invalidateQueries({ queryKey: ['analytics', 'patient-outcomes'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'hospital-performance'] });
    },
  });
};
