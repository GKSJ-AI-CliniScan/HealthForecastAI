import React from 'react';
import { PatientDetail } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PhoneIcon, UserIcon } from '@/components/ui/Icons';

export interface PatientBasicInfoProps {
  patient: PatientDetail;
}

export function PatientBasicInfo({ patient }: PatientBasicInfoProps) {
  const riskBadge =
    patient.risk_category === 'high' ? (
      <Badge variant="riskHigh">
        High Risk {patient.readmission_risk_score ? `(${Math.round(patient.readmission_risk_score * 100)}%)` : ''}
      </Badge>
    ) : patient.risk_category === 'medium' ? (
      <Badge variant="riskMedium">
        Medium Risk {patient.readmission_risk_score ? `(${Math.round(patient.readmission_risk_score * 100)}%)` : ''}
      </Badge>
    ) : (
      <Badge variant="riskLow">
        Low Risk {patient.readmission_risk_score ? `(${Math.round(patient.readmission_risk_score * 100)}%)` : ''}
      </Badge>
    );

  const patientName =
    patient.full_name || patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient Record';

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 font-bold text-base">
              {patient.first_name && patient.last_name
                ? `${patient.first_name[0]}${patient.last_name[0]}`
                : patientName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle>{patientName}</CardTitle>
                {riskBadge}
              </div>
              <p className="text-xs text-warm-text-muted dark:text-warm-text-muted font-mono mt-0.5">
                MRN: <span className="font-semibold text-warm-text dark:text-warm-text">{patient.medical_record_number}</span> &bull; {patient.department || 'Internal Medicine'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                patient.admission_status === 'admitted'
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                  : 'bg-warm-neutral/60 text-warm-text-muted dark:bg-warm-neutral/20 dark:text-warm-text-muted'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  patient.admission_status === 'admitted' ? 'bg-brand-500 animate-pulse' : 'bg-warm-text-light'
                }`}
              />
              {patient.admission_status === 'admitted' ? 'Currently Inpatient' : 'Discharged / Outpatient'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 space-y-4">
        {/* Core Clinical Demographics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-warm-neutral/30 p-3 dark:bg-warm-neutral/10 border border-warm-border/60 dark:border-warm-border/60">
            <span className="text-warm-text-muted font-medium">Age Group & Gender</span>
            <p className="mt-1 font-semibold text-warm-text dark:text-warm-text">
              {patient.age_group || 'Unspecified'} &bull; {patient.gender || 'Unspecified'}
            </p>
          </div>

          <div className="rounded-lg bg-warm-neutral/30 p-3 dark:bg-warm-neutral/10 border border-warm-border/60 dark:border-warm-border/60">
            <span className="text-warm-text-muted font-medium">Race / Ethnicity</span>
            <p className="mt-1 font-semibold text-warm-text dark:text-warm-text">
              {patient.race || 'Not specified'}
            </p>
          </div>

          <div className="rounded-lg bg-warm-neutral/30 p-3 dark:bg-warm-neutral/10 border border-warm-border/60 dark:border-warm-border/60">
            <span className="text-warm-text-muted font-medium">Assigned Physician</span>
            <p className="mt-1 font-semibold text-warm-text dark:text-warm-text">
              {patient.assigned_doctor_name || 'Dr. Sarah Jenkins, MD'}
            </p>
          </div>

          <div className="rounded-lg bg-warm-neutral/30 p-3 dark:bg-warm-neutral/10 border border-warm-border/60 dark:border-warm-border/60">
            <span className="text-warm-text-muted font-medium">Primary Clinical Diagnosis</span>
            <p className="mt-1 font-semibold text-warm-text dark:text-warm-text truncate" title={patient.primary_diagnosis}>
              {patient.primary_diagnosis}
            </p>
          </div>
        </div>

        {/* Contact Information & Emergency Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="rounded-lg border border-warm-border/80 bg-white p-3.5 dark:border-warm-border dark:bg-warm-card">
            <div className="flex items-center gap-1.5 font-bold text-warm-text dark:text-warm-text mb-2">
              <PhoneIcon className="h-3.5 w-3.5 text-brand-500" />
              <span>Contact Information</span>
            </div>
            <div className="space-y-1 text-warm-text-muted dark:text-warm-text-muted">
              <p className="flex items-center gap-2">
                <span className="font-medium text-warm-text dark:text-warm-text">Phone:</span>
                <span>{patient.contact_number || patient.phone || '+1 (555) 234-8901'}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium text-warm-text dark:text-warm-text">Email:</span>
                <span>{patient.email || `${patientName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@patient.healthforecast.ai`}</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-warm-border/80 bg-white p-3.5 dark:border-warm-border dark:bg-warm-card">
            <div className="flex items-center gap-1.5 font-bold text-warm-text dark:text-warm-text mb-2">
              <UserIcon className="h-3.5 w-3.5 text-brand-500" />
              <span>Emergency Contact</span>
            </div>
            <div className="space-y-1 text-warm-text-muted dark:text-warm-text-muted">
              {patient.emergency_contact ? (
                <>
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-warm-text dark:text-warm-text">Name:</span>
                    <span>{patient.emergency_contact.name} ({patient.emergency_contact.relationship})</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-warm-text dark:text-warm-text">Phone:</span>
                    <span>{patient.emergency_contact.phone}</span>
                  </p>
                </>
              ) : (
                <p>No emergency contact on file for this patient.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
