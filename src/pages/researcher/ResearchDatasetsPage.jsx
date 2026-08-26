import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { Database, Download, CheckCircle, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';

const ResearchDatasetsPage = () => {
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState(null);

  const datasets = [
    { id: 'DS-001', name: 'Type 2 Diabetes Anonymized Cohort', records: 450, format: 'CSV', status: 'De-identified' },
    { id: 'DS-002', name: 'Congestive Heart Failure Analytics Matrix', records: 280, format: 'CSV', status: 'De-identified' },
    { id: 'DS-003', name: 'COPD Respiratory Baseline Registry', records: 190, format: 'CSV', status: 'De-identified' }
  ];

  const handleDownload = async (id) => {
    try {
      setDownloadingId(id);
      setDownloadSuccessId(null);
      
      // Simulate dataset download call
      await analyticsService.exportReport('summary', 'csv');
      
      setDownloadSuccessId(id);
      setTimeout(() => setDownloadSuccessId(null), 3000);
    } catch (err) {
      alert("Error downloading research dataset: " + err.message);
    } finally {
      setDownloadingId(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Sanitized Research Datasets" 
        description="Download curated, anonymized clinical datasets in HIPAA-sanitized CSV format."
      />

      <div className="space-y-4">
        {datasets.map((ds) => (
          <div key={ds.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-wrap items-center justify-between gap-6 hover:shadow-xs transition">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-slate-400 text-xs">{ds.id} • Format: <span className="font-bold text-slate-600">{ds.format}</span></span>
                <h4 className="font-bold text-slate-800 text-xs">{ds.name}</h4>
                <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> {ds.status} • {ds.records} records indexed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {downloadSuccessId === ds.id && (
                <span className="text-xs font-bold text-emerald-650 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Download Saved!
                </span>
              )}
              <button
                onClick={() => handleDownload(ds.id)}
                disabled={downloadingId === ds.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-60 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                {downloadingId === ds.id ? 'Downloading...' : 'Export Dataset'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResearchDatasetsPage;
