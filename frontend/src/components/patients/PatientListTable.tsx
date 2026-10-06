'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Patient, Role } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { ArrowRightIcon, UsersIcon, ArrowLeftIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';

export interface PatientListTableProps {
  patients: Patient[];
  role?: Role;
  isLoading?: boolean;
  pageSize?: number;
}

export function PatientListTable({
  patients,
  role = 'doctor',
  isLoading = false,
  pageSize = 5,
}: PatientListTableProps) {
  const isResearcher = role === 'researcher';
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-xl border border-warm-border bg-white shadow-sm dark:border-warm-border dark:bg-warm-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-warm-border/60 bg-warm-neutral/30 text-xs font-semibold text-warm-text-muted dark:border-warm-border/60 dark:bg-warm-neutral/10 dark:text-warm-text-muted">
            <tr>
              <th className="py-3.5 px-4">{isResearcher ? 'Cohort ID' : 'MRN / Identifier'}</th>
              {!isResearcher && <th className="py-3.5 px-4">Patient Name</th>}
              <th className="py-3.5 px-4">Demographics</th>
              <th className="py-3.5 px-4">Primary Diagnosis</th>
              <th className="py-3.5 px-4">Readmission Risk</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={isResearcher ? 6 : 7} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-warm-border bg-white p-12 text-center shadow-sm dark:border-warm-border dark:bg-warm-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-warm-neutral/60 text-warm-text-muted dark:bg-warm-neutral/20 dark:text-warm-text-muted">
          <UsersIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-warm-text dark:text-warm-text">
          No patients found
        </h3>
        <p className="mt-1 text-xs text-warm-text-muted dark:text-warm-text-muted max-w-sm mx-auto">
          No patient records match the selected search keywords or filter criteria.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(patients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPatients = patients.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-warm-border bg-white shadow-sm dark:border-warm-border dark:bg-warm-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-warm-border/60 bg-warm-neutral/30 text-xs font-semibold text-warm-text-muted dark:border-warm-border/60 dark:bg-warm-neutral/10 dark:text-warm-text-muted">
            <tr>
              <th className="py-3.5 px-4">{isResearcher ? 'Cohort ID' : 'MRN'}</th>
              {!isResearcher && <th className="py-3.5 px-4">Patient Name</th>}
              <th className="py-3.5 px-4">Demographics</th>
              <th className="py-3.5 px-4">Primary Diagnosis</th>
              <th className="py-3.5 px-4">Readmission Risk</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border/40 dark:divide-warm-border/40">
            {paginatedPatients.map((patient) => {
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

              return (
                <tr
                  key={patient.id}
                  className="hover:bg-warm-bg/60 dark:hover:bg-warm-neutral/10 transition-colors"
                >
                  {/* MRN or Cohort */}
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-warm-text dark:text-warm-text">
                    {patient.medical_record_number}
                  </td>

                  {/* Name (if not researcher) */}
                  {!isResearcher && (
                    <td className="py-3.5 px-4 font-medium text-warm-text dark:text-warm-text">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline"
                      >
                        {patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`}
                      </Link>
                      {patient.department && (
                        <div className="text-[11px] text-warm-text-muted dark:text-warm-text-muted font-normal">
                          {patient.department}
                        </div>
                      )}
                    </td>
                  )}

                  {/* Demographics */}
                  <td className="py-3.5 px-4 text-xs text-warm-text dark:text-warm-text">
                    <div>
                      {patient.gender} &bull; {patient.age_group}
                    </div>
                    <div className="text-[11px] text-warm-text-muted dark:text-warm-text-muted">
                      {patient.race}
                    </div>
                  </td>

                  {/* Primary Diagnosis */}
                  <td
                    className="py-3.5 px-4 text-xs text-warm-text dark:text-warm-text max-w-xs truncate"
                    title={patient.primary_diagnosis}
                  >
                    {patient.primary_diagnosis}
                  </td>

                  {/* Risk */}
                  <td className="py-3.5 px-4">{riskBadge}</td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        patient.admission_status === 'admitted'
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                          : 'bg-warm-neutral/60 text-warm-text-muted dark:bg-warm-neutral/20 dark:text-warm-text-muted'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          patient.admission_status === 'admitted' ? 'bg-brand-500' : 'bg-warm-text-light'
                        }`}
                      />
                      {patient.admission_status === 'admitted' ? 'Inpatient' : 'Discharged'}
                    </span>
                  </td>

                  {/* Detail Link */}
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      <span>View Details</span>
                      <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Toolbar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-warm-text-muted dark:text-warm-text-muted">
          <div>
            Showing <span className="font-semibold text-warm-text dark:text-warm-text">{startIndex + 1}</span> to{' '}
            <span className="font-semibold text-warm-text dark:text-warm-text">
              {Math.min(startIndex + pageSize, patients.length)}
            </span>{' '}
            of <span className="font-semibold text-warm-text dark:text-warm-text">{patients.length}</span> patient records
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              leftIcon={<ArrowLeftIcon className="h-3.5 w-3.5" />}
              className="px-2.5 py-1 text-xs"
            >
              Previous
            </Button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}
              className="px-2.5 py-1 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
