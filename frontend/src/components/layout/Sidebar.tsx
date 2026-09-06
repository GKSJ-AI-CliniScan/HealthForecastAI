'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PulseIcon, LockIcon, UserIcon, LogOutIcon } from '@/components/ui/Icons';
import { Navigation } from './Navigation';
import { RoleBadge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps {
  onNavClick?: () => void;
  className?: string;
}

export function Sidebar({ onNavClick, className }: SidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const currentRole = user?.role ?? 'doctor';

  return (
    <aside
      className={`flex h-full w-64 flex-col border-r border-warm-border bg-white dark:border-warm-border dark:bg-warm-card select-none ${
        className || ''
      }`}
      aria-label="Application Sidebar"
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-warm-border/60 px-5 dark:border-warm-border/60">
        <Link
          href="/dashboard"
          onClick={onNavClick}
          className="flex items-center gap-2.5 group focus-visible:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-sm ring-1 ring-brand-500/20 group-hover:scale-105 transition-transform">
            <PulseIcon className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-warm-text dark:text-warm-text">
              HealthForecast <span className="text-brand-500 dark:text-brand-400">AI</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-warm-text-muted dark:text-warm-text-muted">
              Risk Intelligence
            </span>
          </div>
        </Link>
      </div>

      {/* Role State Indicator */}
      <div className="border-b border-warm-border/60 px-4 py-2.5 dark:border-warm-border/60 bg-warm-neutral/30 dark:bg-warm-neutral/10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-warm-text-muted font-medium dark:text-warm-text-muted">Active View:</span>
          <RoleBadge role={currentRole} />
        </div>
      </div>

      {/* Main Navigation links */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-4 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-text-light dark:text-warm-text-light">
            Navigation
          </p>
        </div>
        <Navigation onItemClick={onNavClick} />
      </div>

      {/* User / Session Footer */}
      <div className="border-t border-warm-border/60 p-3.5 dark:border-warm-border/60 bg-warm-neutral/20 dark:bg-warm-neutral/10">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold text-xs">
                {user.full_name ? user.full_name[0] : 'U'}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-warm-text dark:text-warm-text truncate">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-warm-text-muted truncate">{user.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/login');
              }}
              title="Sign out of current session"
              className="rounded-lg p-1.5 text-warm-text-muted hover:bg-warm-neutral/60 hover:text-warm-text dark:hover:bg-warm-neutral/20 dark:hover:text-warm-text transition-colors"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href="/login"
              onClick={onNavClick}
              className="flex items-center justify-center gap-1.5 rounded-md border border-warm-border bg-white py-1.5 text-xs font-medium text-warm-text hover:bg-warm-bg hover:text-warm-text dark:border-warm-border dark:bg-warm-card dark:text-warm-text dark:hover:bg-warm-neutral/20"
            >
              <LockIcon className="h-3.5 w-3.5 text-warm-text-muted" />
              Login
            </Link>
            <Link
              href="/register"
              onClick={onNavClick}
              className="flex items-center justify-center gap-1.5 rounded-md border border-brand-200 bg-brand-50/70 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100/70 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
            >
              <UserIcon className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" />
              Register
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
