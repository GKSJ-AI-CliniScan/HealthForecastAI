'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MenuIcon,
  BellIcon,
  SearchIcon,
  UserIcon,
  ChevronDownIcon,
  LockIcon,
  LogOutIcon,
} from '@/components/ui/Icons';
import { RoleBadge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen = false }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-warm-border bg-white/95 px-4 sm:px-6 backdrop-blur-sm dark:border-warm-border dark:bg-warm-card/95">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          aria-expanded={isSidebarOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-warm-border text-warm-text hover:bg-warm-neutral/50 hover:text-warm-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden dark:border-warm-border dark:text-warm-text dark:hover:bg-warm-neutral/20"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-warm-text dark:text-warm-text">
            HealthForecast AI
          </span>
          <span className="hidden sm:inline text-warm-border dark:text-warm-border">/</span>
          <span className="hidden sm:inline text-xs font-medium text-warm-text-muted dark:text-warm-text-muted">
            Hospital Readmission Intelligence
          </span>
        </div>
      </div>

      {/* Center: Search / Search Placeholder */}
      <div className="hidden md:flex max-w-xs flex-1 items-center px-4">
        <div className="relative w-full">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-text-light" />
          <input
            type="text"
            placeholder="Search patient, MRN, diagnosis..."
            aria-label="Search platform"
            className="w-full rounded-lg border border-warm-border bg-warm-bg/70 py-1.5 pl-9 pr-3 text-xs text-warm-text placeholder:text-warm-text-light focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-warm-border dark:bg-warm-neutral/10 dark:text-warm-text dark:placeholder:text-warm-text-light dark:focus:bg-warm-card"
          />
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-warm-border text-warm-text hover:bg-warm-neutral/50 hover:text-warm-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-warm-border dark:text-warm-text dark:hover:bg-warm-neutral/20"
          >
            <BellIcon className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-coral-500" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-warm-border bg-white p-3 shadow-lg dark:border-warm-border dark:bg-warm-card">
              <div className="flex items-center justify-between border-b border-warm-border/60 pb-2 dark:border-warm-border/60">
                <span className="text-xs font-bold text-warm-text dark:text-warm-text">
                  Clinical Alerts
                </span>
                <span className="text-[10px] text-brand-500 font-semibold">Real-Time</span>
              </div>
              <div className="mt-2 space-y-2 text-xs">
                <div className="rounded-lg border border-coral-200 bg-coral-50/80 p-2 text-coral-900 dark:border-coral-900/40 dark:bg-coral-950/40 dark:text-coral-200">
                  <p className="font-semibold">High Readmission Risk Alert</p>
                  <p className="text-[11px] text-coral-700 dark:text-coral-300 mt-0.5">
                    Patient Arthur Pendleton (MRN-104928) evaluated at 84% readmission risk.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            aria-label="User profile menu"
            className="flex items-center gap-2 rounded-lg border border-warm-border p-1.5 hover:bg-warm-neutral/40 dark:border-warm-border dark:hover:bg-warm-neutral/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-semibold text-xs">
              {user ? user.full_name[0] : 'U'}
            </div>
            <div className="hidden text-left xl:block pr-1">
              <p className="text-xs font-semibold text-warm-text dark:text-warm-text leading-none">
                {user ? user.full_name : 'Healthcare User'}
              </p>
              <p className="text-[10px] text-warm-text-muted dark:text-warm-text-muted leading-none mt-1">
                {user ? user.department || user.role : 'Clinical Practitioner'}
              </p>
            </div>
            <ChevronDownIcon className="h-3 w-3 text-warm-text-light hidden xl:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-warm-border bg-white p-2 shadow-lg dark:border-warm-border dark:bg-warm-card">
              <div className="border-b border-warm-border/60 p-2 dark:border-warm-border/60">
                <p className="text-xs font-semibold text-warm-text dark:text-warm-text truncate">
                  {user ? user.full_name : 'Signed Out'}
                </p>
                <p className="text-[10px] text-warm-text-muted truncate mt-0.5">
                  {user ? user.email : ''}
                </p>
                {user && (
                  <div className="mt-1.5">
                    <RoleBadge role={user.role} />
                  </div>
                )}
              </div>
              <div className="py-1 text-xs">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      router.push('/login');
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-coral-600 hover:bg-coral-50 dark:text-coral-400 dark:hover:bg-coral-950/40 font-medium"
                  >
                    <LogOutIcon className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-warm-text hover:bg-warm-neutral/50 dark:text-warm-text dark:hover:bg-warm-neutral/20"
                    >
                      <LockIcon className="h-3.5 w-3.5" />
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-warm-text hover:bg-warm-neutral/50 dark:text-warm-text dark:hover:bg-warm-neutral/20"
                    >
                      <UserIcon className="h-3.5 w-3.5" />
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
