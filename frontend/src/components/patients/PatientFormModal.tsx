import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Patient, PatientCreatePayload } from '@/types';

const patientSchema = z.object({
  patient_identifier: z.string().min(3, 'Identifier must be at least 3 characters').max(64),
  first_name: z.string().min(1, 'First name is required').max(128),
  last_name: z.string().min(1, 'Last name is required').max(128),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

export interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PatientCreatePayload) => Promise<void>;
  patientToEdit?: Patient | null;
  isLoading?: boolean;
}

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  patientToEdit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      patient_identifier: '',
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'Male',
      phone: '',
      email: '',
      address: '',
    },
  });

  useEffect(() => {
    if (patientToEdit) {
      reset({
        patient_identifier: patientToEdit.patient_identifier,
        first_name: patientToEdit.first_name,
        last_name: patientToEdit.last_name,
        date_of_birth: patientToEdit.date_of_birth || '',
        gender: patientToEdit.gender || 'Male',
        phone: patientToEdit.phone || '',
        email: patientToEdit.email || '',
        address: patientToEdit.address || '',
      });
    } else {
      reset({
        patient_identifier: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
        first_name: '',
        last_name: '',
        date_of_birth: '1980-01-01',
        gender: 'Male',
        phone: '',
        email: '',
        address: '',
      });
    }
  }, [patientToEdit, reset, isOpen]);

  const onFormSubmit = async (data: PatientFormData) => {
    await onSubmit({
      ...data,
      email: data.email || undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={patientToEdit ? 'Edit Patient Record' : 'Register New Patient'}
      description={
        patientToEdit
          ? 'Update clinical and demographic patient records.'
          : 'Create a new patient entry in the hospital registry.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Patient Identifier"
            placeholder="e.g. PAT-2026-01"
            disabled={!!patientToEdit}
            error={errors.patient_identifier?.message}
            {...register('patient_identifier')}
          />
          <Select
            label="Gender"
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ]}
            error={errors.gender?.message}
            {...register('gender')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="First name"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label="Last Name"
            placeholder="Last name"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date of Birth"
            type="date"
            error={errors.date_of_birth?.message}
            {...register('date_of_birth')}
          />
          <Input
            label="Phone Number"
            placeholder="+1-555-0123"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          placeholder="patient@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Address
          </label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            placeholder="Full physical address"
            {...register('address')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {patientToEdit ? 'Save Changes' : 'Register Patient'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
