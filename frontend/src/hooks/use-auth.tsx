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
    login: (
        email: string,
        password: string,
    ) => Promise<void>;
    logout: () => void;
}

const AuthContext =
    createContext<AuthContextValue | null>(null);

const TOKEN_KEY =
    'healthforecast_access_token';

const USER_KEY =
    'healthforecast_current_user';

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [token, setToken] =
        useState<string | null>(null);

    const [currentUser, setCurrentUser] =
        useState<CurrentUser | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    useEffect(() => {
        const storedToken =
            window.localStorage.getItem(TOKEN_KEY);

        const storedUser =
            window.localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
            try {
                const user =
                    JSON.parse(storedUser) as CurrentUser;

                setToken(storedToken);
                setCurrentUser(user);
            } catch {
                window.localStorage.removeItem(
                    TOKEN_KEY,
                );

                window.localStorage.removeItem(
                    USER_KEY,
                );
            }
        }

        setLoading(false);
    }, []);

    async function login(
        email: string,
        password: string,
    ) {
        setLoading(true);
        setError('');

        try {
            const result =
                await apiFetch<LoginResponse>(
                    '/auth/login',
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            email,
                            password,
                        }),
                    },
                );

            const user =
                await apiFetch<CurrentUser>(
                    '/auth/me',
                    {},
                    result.access_token,
                );

            window.localStorage.setItem(
                TOKEN_KEY,
                result.access_token,
            );

            window.localStorage.setItem(
                USER_KEY,
                JSON.stringify(user),
            );

            setToken(result.access_token);
            setCurrentUser(user);
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.message
                    : 'Unable to sign in. Please try again.';

            setError(message);

            throw err;
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        window.localStorage.removeItem(
            TOKEN_KEY,
        );

        window.localStorage.removeItem(
            USER_KEY,
        );

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
        throw new Error(
            'useAuth must be used inside AuthProvider',
        );
    }

    return context;
}