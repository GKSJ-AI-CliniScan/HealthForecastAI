import React from 'react';

const PageHeader = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/50 pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-heading">{title}</h1>
        {description && <p className="text-sm text-slate-500 font-medium">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
