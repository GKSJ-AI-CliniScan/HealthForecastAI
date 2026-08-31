import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glass = true,
  hoverable = false,
  className = '',
  ...props
}) => {
  const glassStyle = glass
    ? 'bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm'
    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm';

  const hoverStyle = hoverable
    ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-teal-500/30'
    : '';

  return (
    <div
      className={`rounded-2xl p-5 ${glassStyle} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
