import React, { useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import PageHeader from '../../components/common/PageHeader';
import { FileText, Download, Calendar, Filter, FileSpreadsheet } from 'lucide-react';

const HospitalReportsPage = () => {
  const [reportType, setReportType] = useState('summary');
  const [department, setDepartment] = useState('All');
  const [riskLevel, setRiskLevel] = useState('All');
  const [dateFrom, setDateFrom] = useState('2026-08-01');
  const [dateTo, setDateTo] = useState('2026-08-31');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportSuccess(false);
      
      // Call actual CSV download helper implemented in services/analyticsService
      await analyticsService.exportReport(reportType, 'csv');
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000); // Clear success label
    } catch (err) {
      alert("Error generating spreadsheet file: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Healthcare Reports Registry" 
        description="Configure filters and click download to compile medical databases to CSV format."
      />

      {/* Query Filters Form */}
      <div className="rounded-2xl border border-slate-202 bg-white p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Configure Spreadsheet Export Query</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Report Type selector */}
          <div className="space-y-1.5 col-span-1 md:col-span-2 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Select Dataset Template</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-bold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="summary">General Operational Performance Summary</option>
              <option value="readmission">Historical Monthly Readmissions Rates</option>
              <option value="department">Clinic Performance & Allocation Capacities</option>
            </select>
          </div>

          {/* Department filter selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Department Clinic</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-bold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Cardiology">Cardiology Unit Only</option>
              <option value="Endocrinology">Endocrinology Unit Only</option>
              <option value="Pulmonology">Pulmonology Unit Only</option>
              <option value="General Medicine">General Medicine Unit Only</option>
            </select>
          </div>

          {/* Risk category filters */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Risk Category Cohort</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-bold text-slate-705 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Risks</option>
              <option value="High">High Risk Cohort</option>
              <option value="Medium">Medium Risk Cohort</option>
              <option value="Low">Low Risk Cohort</option>
            </select>
          </div>

          {/* Date range filters */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Date Admissions From</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Calendar className="h-4 w-4" />
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Date Admissions To</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Calendar className="h-4 w-4" />
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action button trigger row */}
        <div className="border-t border-slate-100 pt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-400">
            Export complies with St. Jude healthcare HIPAA privacy constraints.
          </div>
          <div className="flex items-center gap-3">
            {exportSuccess && (
              <span className="text-xs font-bold text-emerald-650 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                ✓ Export compiled successfully!
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-60 cursor-pointer"
            >
              <Download className="h-4.5 w-4.5" />
              {exporting ? 'Compiling File...' : 'Compile & Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Available templates lists cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-605 flex items-center justify-center border border-emerald-100">
            <FileSpreadsheet className="h-4.5 w-4.5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-xs">Summary KPIs Database</h4>
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            Satisfying bed occupancy rates, success metrics, and average clinical reviews. Updated daily.
          </p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <FileSpreadsheet className="h-4.5 w-4.5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-xs">Readmission Speed Sheets</h4>
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            Historical cohorts containing monthly admissions, high-risk breakdowns, and recurrence indices.
          </p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="h-8 w-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
            <FileSpreadsheet className="h-4.5 w-4.5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-xs">Clinical Wards Efficiency</h4>
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            Total active cases, discharges, and medication recovery ratios grouped by ward categories.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HospitalReportsPage;
