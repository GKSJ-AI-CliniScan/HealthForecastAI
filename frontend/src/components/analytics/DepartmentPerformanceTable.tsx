import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Building } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DepartmentAnalyticsItem } from '@/features/analytics/analytics.types';

interface DepartmentPerformanceTableProps {
  departments: DepartmentAnalyticsItem[];
}

type SortField = 'department' | 'patients' | 'admissions' | 'average_length_of_stay' | 'treatments' | 'treatment_effectiveness';

export const DepartmentPerformanceTable: React.FC<DepartmentPerformanceTableProps> = ({
  departments,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('admissions');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    return departments
      .filter((d) => d.department.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (valA === null || valA === undefined) valA = -1;
        if (valB === null || valB === undefined) valB = -1;

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [departments, searchTerm, sortField, sortAsc]);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Clinical Department Performance
          </h3>
          <p className="text-xs text-slate-500">
            Real aggregated workload, hospitalization duration, and treatment response
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th
                onClick={() => handleSort('department')}
                className="py-3 px-4 cursor-pointer hover:text-teal-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Department <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('patients')}
                className="py-3 px-4 cursor-pointer hover:text-teal-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Patients <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('admissions')}
                className="py-3 px-4 cursor-pointer hover:text-teal-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Admissions <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('average_length_of_stay')}
                className="py-3 px-4 cursor-pointer hover:text-teal-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Avg Stay (Days) <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('treatments')}
                className="py-3 px-4 cursor-pointer hover:text-teal-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Treatments <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('treatment_effectiveness')}
                className="py-3 px-4 cursor-pointer hover:text-teal-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Effectiveness Score <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Outcome Distribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No department records found matching filters.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((d) => (
                <tr
                  key={d.department}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {d.department}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                    {d.patients.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                    {d.admissions.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                    {d.average_length_of_stay.toFixed(1)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                    {d.treatments.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    {d.treatment_effectiveness !== null && d.treatment_effectiveness !== undefined ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {Math.round(d.treatment_effectiveness)} / 100
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Pending Data</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                      {Object.entries(d.outcome_distribution).map(([status, cnt]) => (
                        <span
                          key={status}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {status}: {cnt}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
