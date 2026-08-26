import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { Upload, Database, Check, Clock, CheckCircle } from 'lucide-react';

const DatasetManagementPage = () => {
  const [datasets, setDatasets] = useState([
    { name: 'Admissions_Record_2026_Q1.csv', size: '14.2 MB', uploadedBy: 'System Admin', date: '2026-08-20', status: 'Verified' },
    { name: 'Pulmonology_COPD_Cohort_2025.csv', size: '8.4 MB', uploadedBy: 'Dr. Sarah Jenkins', date: '2026-08-15', status: 'Verified' }
  ]);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const simulateUpload = () => {
    setUploading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setDatasets((prevList) => [
            {
              name: 'Endocrinology_Diabetes_Indices.csv',
              size: '4.8 MB',
              uploadedBy: 'System Admin',
              date: new Date().toISOString().split('T')[0],
              status: 'Verifying'
            },
            ...prevList
          ]);
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Predictive Source Datasets Registry" 
        description="Upload clinic CSV tables to feed and train prediction weights."
      />

      {/* Drag & Drop Upload Zone mockup */}
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
          <Upload className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-slate-800 text-xs">Upload Clinic CSV Database files</h4>
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            Standard files must contain columns: Patient_ID, Age, Gender, Primary_Diagnosis, Comorbidities, Length_Of_Stay.
          </p>
        </div>

        {uploading ? (
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Uploading Endocrinology_Diabetes_Indices.csv</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <button
            onClick={simulateUpload}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
          >
            Select & Upload File
          </button>
        )}
      </div>

      {/* Uploaded Datasets List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Uploaded Source Files Directory</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Filename String</th>
                <th className="py-3 px-4">Download Size</th>
                <th className="py-3 px-4">Uploaded By</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Quality Verification status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datasets.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors font-semibold text-slate-650">
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <Database className="h-4.5 w-4.5 text-slate-400" /> {d.name}
                  </td>
                  <td className="py-3.5 px-4">{d.size}</td>
                  <td className="py-3.5 px-4 text-slate-500">{d.uploadedBy}</td>
                  <td className="py-3.5 px-4">{d.date}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      d.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-705 border border-amber-100'
                    }`}>
                      {d.status === 'Verified' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5 animate-spin" />}
                      {d.status === 'Verified' ? 'Verification Passed' : 'Parsing Features...'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DatasetManagementPage;
