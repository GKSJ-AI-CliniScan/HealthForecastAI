import { Role, SessionUser } from '@/types';
import { MOCK_USERS } from './mockData';

export const authService = {
  /**
   * Get all preset demo accounts for the 4 roles.
   */
  getDemoAccounts() {
    return Object.entries(MOCK_USERS).map(([role, account]) => ({
      role: role as Role,
      email: account.user.email,
      name: account.user.full_name,
      department: account.user.department,
      description: account.description,
    }));
  },

  /**
   * Mock login by role or email.
   */
  async mockLogin(roleOrEmail: Role | string): Promise<SessionUser> {
    // Check if role direct key
    let account = MOCK_USERS[roleOrEmail as Role];

    // Otherwise check by email
    if (!account) {
      const found = Object.values(MOCK_USERS).find(
        (a) => a.user.email.toLowerCase() === roleOrEmail.toLowerCase(),
      );
      if (found) {
        account = found;
      } else {
        // Fallback default to doctor
        account = MOCK_USERS.doctor;
      }
    }

    return {
      id: account.user.id,
      full_name: account.user.full_name,
      email: account.user.email,
      role: account.user.role,
      department: account.user.department,
      permissions: account.permissions,
    };
  },

  /**
   * Get default initial mock user.
   */
  getDefaultUser(): SessionUser {
    const defaultDoc = MOCK_USERS.doctor;
    return {
      id: defaultDoc.user.id,
      full_name: defaultDoc.user.full_name,
      email: defaultDoc.user.email,
      role: defaultDoc.user.role,
      department: defaultDoc.user.department,
      permissions: defaultDoc.permissions,
    };
  },
};
