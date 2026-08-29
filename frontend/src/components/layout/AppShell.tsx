'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CloseIcon } from '@/components/ui/Icons';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileSidebarOpen]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased">
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <div className="flex flex-1 w-full min-h-screen">
        {/* Desktop Fixed Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40">
          <Sidebar />
        </div>

        {/* Mobile Slide-Over Drawer with Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-over Drawer Panel */}
            <div className="fixed inset-y-0 left-0 flex max-w-xs w-full shadow-2xl z-10 animate-in slide-in-from-left duration-300">
              <div className="relative flex-1 flex flex-col bg-white dark:bg-slate-900">
                {/* Close Button inside Drawer */}
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Close navigation drawer"
                  className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
                <Sidebar onNavClick={() => setMobileSidebarOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Main Body Area (Header + Content) */}
        <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
          <Header
            onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
            isSidebarOpen={mobileSidebarOpen}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
