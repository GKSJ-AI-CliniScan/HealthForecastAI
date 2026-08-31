import React from 'react';
import { LucideIcon, FolderSearch, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}> = ({ title, description, icon: Icon = FolderSearch, actionText, onAction }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
    <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 mb-4">
      <Icon className="w-8 h-8" />
    </div>
    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">{description}</p>
    {actionText && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>
        {actionText}
      </Button>
    )}
  </div>
);

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full space-y-3 p-4 animate-pulse">
    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl w-full"></div>
    ))}
  </div>
);

export const ErrorAlert: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
    {onRetry && (
      <Button variant="danger" size="sm" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);
