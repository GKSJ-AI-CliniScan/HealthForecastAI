import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import { Cpu, Play, CheckCircle, ShieldAlert, Award } from 'lucide-react';

const AiModelManagementPage = () => {
  const [models, setModels] = useState([
    { id: 'M-101', name: 'XGBoost Readmission Classifier', accuracy: '93.2%', recall: '91.8%', status: 'Active Release' },
    { id: 'M-102', name: 'Random Forest Diabetes Predictor', accuracy: '89.4%', recall: '87.1%', status: 'Active Release' },
    { id: 'M-103', name: 'Neural Net Length of Stay Estimator', accuracy: '87.1%', recall: '84.6%', status: 'Offline' }
  ]);

  const [trainingId, setTrainingId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [deployingId, setDeployingId] = useState(null);

  const startTraining = (id) => {
    setTrainingId(id);
    setLogs(['Initiating model cross-validation split...', 'Parsing 450 clinical features arrays...']);
    
    setTimeout(() => {
      setLogs((prev) => [...prev, 'Epoch 1/5: loss: 0.3421 - accuracy: 89.2%']);
    }, 1000);

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Epoch 3/5: loss: 0.1872 - accuracy: 92.1%']);
    }, 2000);

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Epoch 5/5: loss: 0.0982 - F1-score: 93.8%']);
    }, 3000);

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Verification completed. New weights ready for deployment.']);
      setTrainingId(null);
      setModels((prevList) => 
        prevList.map((m) => m.id === id ? { ...m, accuracy: '93.8%', status: 'Weights Updated' } : m)
      );
    }, 4000);
  };

  const deployWeights = (id) => {
    setDeployingId(id);
    setTimeout(() => {
      setDeployingId(null);
      setModels((prevList) =>
        prevList.map((m) => m.id === id ? { ...m, status: 'Active Release' } : m)
      );
      alert('Weights successfully deployed to FastAPI environment.');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Weights Tuning & AI Models Control Hub" 
        description="Trigger pipeline validation epochs and hot-deploy new target models."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <DashboardCard 
          title="Optimal Core Model" 
          value="XGBoost v2.4" 
          icon={Cpu}
          color="emerald"
          subtitle="93.2% ROC-AUC evaluation score"
        />
        <DashboardCard 
          title="Total Features Parsed" 
          value="48 Fields" 
          icon={Award}
          color="blue"
          subtitle="Biometric indicators"
        />
        <DashboardCard 
          title="Last Weights Deploy" 
          value="24h Ago" 
          icon={ShieldAlert}
          color="violet"
          subtitle="Target API parameters synchronized"
        />
      </div>

      {/* Models Status and Control Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Active AI Classifier Catalog</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Model Description</th>
                <th className="py-3 px-4 text-center">F1 Accuracy</th>
                <th className="py-3 px-4 text-center">Recall Index</th>
                <th className="py-3 px-4">FastAPI Deploy Status</th>
                <th className="py-3 px-4">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors font-medium text-slate-650">
                  <td className="py-4 px-4 font-bold text-slate-800">
                    <div className="text-slate-850 font-extrabold">{m.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">Instance ID: {m.id}</div>
                  </td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-600">{m.accuracy}</td>
                  <td className="py-4 px-4 text-center font-bold text-slate-700">{m.recall}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      m.status === 'Active Release' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : m.status === 'Weights Updated'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-slate-50 text-slate-500 border border-slate-150'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 flex gap-2">
                    <button
                      onClick={() => startTraining(m.id)}
                      disabled={trainingId !== null || deployingId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-650 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Train
                    </button>
                    {m.status === 'Weights Updated' && (
                      <button
                        onClick={() => deployWeights(m.id)}
                        disabled={deployingId !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 transition cursor-pointer shadow-xs animate-bounce"
                      >
                        {deployingId === m.id ? 'Deploying...' : 'Deploy Weights'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Epoch training logs tracker console - light theme */}
      {logs.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-xs font-bold text-zinc-500 tracking-wider">
            <span>Weights Compiler Training Console logs</span>
            <span className="text-[10px] bg-white border border-zinc-200 px-2 py-0.5 rounded text-emerald-600 animate-pulse">Running compilation epoch</span>
          </div>
          <div className="font-mono text-[11px] leading-relaxed space-y-1 overflow-y-auto max-h-40">
            {logs.map((log, idx) => <p key={idx} className={log.includes('accuracy') || log.includes('ready') ? 'text-emerald-600' : 'text-zinc-500'}>{`$ ${log}`}</p>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiModelManagementPage;
