import React, { useState, useEffect } from 'react';
import { patientService } from '../../services/patientService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import RiskBadge from '../../components/common/RiskBadge';
import { Brain, Sparkles, CheckSquare, Square, Check, AlertCircle } from 'lucide-react';

const ClinicalInsightsPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep track of resolved actions/recommendations in local state during demonstration
  const [resolvedRecommendations, setResolvedRecommendations] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await patientService.getAllPatients();
      // Only show patients that have specific clinical insights
      setPatients(data.filter(p => p.clinicalInsights));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleResolve = (patientId, insightType) => {
    const key = `${patientId}-${insightType}`;
    setResolvedRecommendations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) return <LoadingSpinner message="Assembling decision support dashboard..." />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Clinical Decision Support Hub" 
        description="Verify AI-suggested risk reduction pathways. Review and approve recommendations."
      />

      {/* AI Disclaimer Header */}
      <div className="flex gap-3 rounded-2xl bg-emerald-50/30 p-5 text-xs text-emerald-800 border border-emerald-100 italic leading-relaxed">
        <Sparkles className="h-5 w-5 shrink-0 text-emerald-600 animate-pulse" />
        <div className="space-y-1">
          <span className="font-bold underline block not-italic uppercase tracking-widest text-[10px]">AI-Generated Diagnostic Recommendations Notice</span>
          <p className="font-medium text-slate-550">
            These suggestions are dynamically optimized by HealthForecast AI's XGBoost Classifier based on risk classifications. 
            All insights require manual validation by a licensed clinical doctor prior to patient discharge.
          </p>
        </div>
      </div>

      {/* Recommendations patient list cards */}
      <div className="space-y-6">
        {patients.map((p) => {
          return (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-700 border border-slate-150 text-xs">
                    {p.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{p.name}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{p.id} • Diagnosis: <span className="text-slate-550 font-bold">{p.diagnosis}</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <RiskBadge risk={p.riskLevel} />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-250">
                    Prob: {p.readmissionProbability}%
                  </span>
                </div>
              </div>

              {/* Grid of 4 suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Risk Mitigation */}
                <div 
                  onClick={() => toggleResolve(p.id, 'mitigation')}
                  className={`border rounded-xl p-4 cursor-pointer transition select-none flex gap-3 text-xs ${
                    resolvedRecommendations[`${p.id}-mitigation`] 
                      ? 'border-emerald-200 bg-emerald-50/10 opacity-75' 
                      : 'border-slate-200 hover:border-emerald-600 bg-slate-50/50'
                  }`}
                >
                  <span className="shrink-0 mt-0.5 text-emerald-600">
                    {resolvedRecommendations[`${p.id}-mitigation`] ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </span>
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-800 text-[10px] uppercase block tracking-wider">Risk Mitigation Plan</span>
                    <p className="font-semibold text-slate-655 leading-relaxed">{p.clinicalInsights.riskMitigation}</p>
                  </div>
                </div>

                {/* 2. Care Recommendations */}
                <div 
                  onClick={() => toggleResolve(p.id, 'care')}
                  className={`border rounded-xl p-4 cursor-pointer transition select-none flex gap-3 text-xs ${
                    resolvedRecommendations[`${p.id}-care`] 
                      ? 'border-emerald-200 bg-emerald-50/10 opacity-75' 
                      : 'border-slate-200 hover:border-emerald-600 bg-slate-50/50'
                  }`}
                >
                  <span className="shrink-0 mt-0.5 text-emerald-605">
                    {resolvedRecommendations[`${p.id}-care`] ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </span>
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-800 text-[10px] uppercase block tracking-wider">Care & Diet Recommendation</span>
                    <p className="font-semibold text-slate-655 leading-relaxed">{p.clinicalInsights.careRecommendations}</p>
                  </div>
                </div>

                {/* 3. Follow-Up Planning */}
                <div 
                  onClick={() => toggleResolve(p.id, 'followup')}
                  className={`border rounded-xl p-4 cursor-pointer transition select-none flex gap-3 text-xs ${
                    resolvedRecommendations[`${p.id}-followup`] 
                      ? 'border-emerald-200 bg-emerald-50/10 opacity-75' 
                      : 'border-slate-200 hover:border-emerald-650 bg-slate-50/50'
                  }`}
                >
                  <span className="shrink-0 mt-0.5 text-emerald-600">
                    {resolvedRecommendations[`${p.id}-followup`] ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </span>
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-800 text-[10px] uppercase block tracking-wider">Follow-Up Action Plan</span>
                    <p className="font-semibold text-slate-655 leading-relaxed">{p.clinicalInsights.followUpPlanning}</p>
                  </div>
                </div>

                {/* 4. Discharge Recommendations */}
                <div 
                  onClick={() => toggleResolve(p.id, 'discharge')}
                  className={`border rounded-xl p-4 cursor-pointer transition select-none flex gap-3 text-xs ${
                    resolvedRecommendations[`${p.id}-discharge`] 
                      ? 'border-emerald-200 bg-emerald-50/10 opacity-75' 
                      : 'border-slate-200 hover:border-emerald-600 bg-slate-50/50'
                  }`}
                >
                  <span className="shrink-0 mt-0.5 text-emerald-600">
                    {resolvedRecommendations[`${p.id}-discharge`] ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </span>
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-800 text-[10px] uppercase block tracking-wider">Discharge Protocols</span>
                    <p className="font-semibold text-slate-655 leading-relaxed">{p.clinicalInsights.dischargeRecommendations}</p>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClinicalInsightsPage;
