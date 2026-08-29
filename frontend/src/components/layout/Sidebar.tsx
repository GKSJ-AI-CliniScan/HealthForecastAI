'use client';

import React from 'react';
import Link from 'next/link';
import { PulseIcon, LockIcon, UserIcon } from '@/components/ui/Icons';
import { Navigation } from './Navigation';
import { Badge } from '@/components/ui/Badge';

interface SidebarProps {
  onNavClick?: () => void;
  className?: string;
}

export function Sidebar({ onNavClick, className }: SidebarProps) {
  return (
    <aside
      className={`flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 select-none ${className || ''}`}
      aria-label="Application Sidebar"
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
        <Link
          href="/"
          onClick={onNavClick}
          className="flex items-center gap-2.5 group focus-visible:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-sm ring-1 ring-brand-500/20 group-hover:scale-105 transition-transform">
            <PulseIcon className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              HealthForecast <span className="text-brand-600 dark:text-brand-400">AI</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Risk Intelligence
            </span>
          </div>
        </Link>
      </div>

      {/* Role State Indicator */}
      <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium dark:text-slate-400">Role View:</span>
          <Badge variant="doctor" className="text-[10px] py-0 px-2">
            Doctor
          </Badge>
        </div>
      </div>

      {/* Main Navigation links */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-4 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Navigation
          </p>
        </div>
        <Navigation onItemClick={onNavClick} />
      </div>

      {/* Quick Auth Links */}
      <div className="border-t border-slate-200/80 p-3.5 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href="/login"
            onClick={onNavClick}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <LockIcon className="h-3.5 w-3.5 text-slate-400" />
            Login
          </Link>
          <Link
            href="/register"
            onClick={onNavClick}
            className="flex items-center justify-center gap-1.5 rounded-md border border-brand-200 bg-brand-50/60 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100/70 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
          >
            <UserIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            Register
          </Link>
        </div>
      </div>
    </aside>
  );
}
