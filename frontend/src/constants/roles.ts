import { UserRole } from '@/types';

export const ROLES: Record<UserRole, UserRole> = {
  DOCTOR: 'DOCTOR',
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  RESEARCHER: 'RESEARCHER',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  DOCTOR: 'Clinical Doctor',
  HOSPITAL_ADMIN: 'Hospital Administrator',
  RESEARCHER: 'Healthcare Researcher',
  SYSTEM_ADMIN: 'System Administrator',
};

export const ROLE_BADGE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  DOCTOR: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
  },
  HOSPITAL_ADMIN: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
  },
  RESEARCHER: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  SYSTEM_ADMIN: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
};
