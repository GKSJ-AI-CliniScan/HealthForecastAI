'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MenuIcon, BellIcon, SearchIcon, UserIcon, ChevronDownIcon, LockIcon } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen = false }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          aria-expanded={isSidebarOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            HealthForecast AI
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
          <span className="hidden sm:inline text-xs font-medium text-slate-500 dark:text-slate-400">
            Clinical Platform
          </span>
        </div>
      </div>

      {/* Center: Search / Search Placeholder */}
      <div className="hidden md:flex max-w-xs flex-1 items-center px-4">
        <div className="relative w-full">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search platform..."
            aria-label="Search platform"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
          />
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Navigation Quick Links to Auth */}
        <div className="hidden lg:flex items-center gap-1.5 border-r border-slate-200 pr-3 dark:border-slate-800">
          <Link
            href="/login"
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 shadow-sm"
          >
            Register
          </Link>
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <BellIcon className="h-4 w-4" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Notifications
                </span>
                <span className="text-[10px] text-slate-400">Placeholder</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                No new notifications.
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
            className="flex items-center gap-2 rounded-lg border border-slate-200 p-1.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 font-semibold text-xs">
              U
            </div>
            <div className="hidden text-left xl:block pr-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                Healthcare User
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-1">
                Clinical Staff
              </p>
            </div>
            <ChevronDownIcon className="h-3 w-3 text-slate-400 hidden xl:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Healthcare User
                </p>
                <div className="mt-1">
                  <Badge variant="doctor" className="text-[10px] py-0">Doctor</Badge>
                </div>
              </div>
              <div className="py-1 text-xs">
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <LockIcon className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
