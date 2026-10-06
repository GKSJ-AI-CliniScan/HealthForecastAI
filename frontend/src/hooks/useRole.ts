import { Role } from '@/types';
import { useAuth } from '@/lib/auth-context';

/**
 * Custom hook to easily check role and permissions in components.
 */
export function useRole() {
  const { user, can } = useAuth();
  const currentRole: Role = user?.role ?? 'doctor';

  const isDoctor = currentRole === 'doctor';
  const isHospitalAdmin = currentRole === 'hospital_admin';
  const isResearcher = currentRole === 'researcher';
  const isSystemAdmin = currentRole === 'system_admin';

  return {
    role: currentRole,
    user,
    can,
    isDoctor,
    isHospitalAdmin,
    isResearcher,
    isSystemAdmin,
  };
}
