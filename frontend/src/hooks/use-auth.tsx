
'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import { apiFetch, ApiError } from '@/lib/api';
import type { Role } from '@/types';

interface LoginResponse {
    access_token: string;
    token_type: string;
    role: Role;
    permissions: string[];
}

export interface CurrentUser {
    subject: string;
    role: Role;
    permissions: string[];
}

interface AuthContextValue {
    token: string | null;
    currentUser: CurrentUser | null;
    loading: boolean;
    error: string;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'healthforecast_access_token';
const USER_KEY = 'healthforecast_current_user';

function clearStoredSession() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
}

function isCurrentUser(value: unknown): value is CurrentUser {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const user = value as Partial<CurrentUser>;

    return (
        typeof user.subject === 'string' &&
        typeof user.role === 'string' &&
        Array.isArray(user.permissions) &&
        user.permissions.every(
            (permission) => typeof permission === 'string',
        )
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function restoreSession() {
            const storedToken = window.localStorage.getItem(TOKEN_KEY);
            const storedUser = window.localStorage.getItem(USER_KEY);

            if (!storedToken || !storedUser) {
                clearStoredSession();

                if (active) {
                    setLoading(false);
                }
                return;
            }

            try {
                const parsedUser: unknown = JSON.parse(storedUser);

                if (!isCurrentUser(parsedUser)) {
                    throw new Error('Stored user data is invalid.');
                }

                // Verify the session against the backend instead of
                // trusting cached user information alone.
                const verifiedUser = await apiFetch<CurrentUser>(
                    '/auth/me',
                    {},
                    storedToken,
                );

                if (!isCurrentUser(verifiedUser)) {
                    throw new Error('Invalid user response.');
                }

                if (!active) {
                    return;
                }

                window.localStorage.setItem(
                    USER_KEY,
                    JSON.stringify(verifiedUser),
                );

                setToken(storedToken);
                setCurrentUser(verifiedUser);
            } catch {
                clearStoredSession();

                if (active) {
                    setToken(null);
                    setCurrentUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void restoreSession();

        return () => {
            active = false;
        };
    }, []);

    async function login(email: string, password: string): Promise<void> {
        setLoading(true);
        setError('');

        try {
            const result = await apiFetch<LoginResponse>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            if (!result.access_token) {
                throw new Error('The server did not return an access token.');
            }

            const user = await apiFetch<CurrentUser>(
                '/auth/me',
                {},
                result.access_token,
            );

            if (!isCurrentUser(user)) {
                throw new Error('The server returned invalid user data.');
            }

            window.localStorage.setItem(TOKEN_KEY, result.access_token);
            window.localStorage.setItem(USER_KEY, JSON.stringify(user));

            setToken(result.access_token);
            setCurrentUser(user);
        } catch (err) {
            clearStoredSession();
            setToken(null);
            setCurrentUser(null);

            const message =
                err instanceof ApiError
                    ? err.message
                    : err instanceof Error
                        ? err.message
                        : 'Unable to sign in. Please try again.';

            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        clearStoredSession();
        setToken(null);
        setCurrentUser(null);
        setError('');
    }

    return (
        <AuthContext.Provider
            value={{
                token,
                currentUser,
                loading,
                error,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
}
