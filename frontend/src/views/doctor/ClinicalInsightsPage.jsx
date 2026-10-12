import React, { useState, useEffect } from 'react';
import { clinicalSupportService } from '../../services/clinicalSupportService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import RiskBadge from '../../components/common/RiskBadge';
import { Sparkles, CheckSquare, Square, RefreshCw } from 'lucide-react';

const initialsFor = (recordNumber) =>
  String(recordNumber || '?')
    .split(/[\s-]+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

const InsightBlock = ({ title, body, resolved, onToggle }) => (
  <div
    onClick={onToggle}
    className={`border rounded-xl p-4 cursor-pointer transition select-none flex gap-3 text-xs ${
      resolved ? 'border-emerald-200 bg-emerald-50/10 opacity-75' : 'border-slate-200 hover:border-emerald-600 bg-slate-50/50'
    }`}
  >
    <span className="shrink-0 mt-0.5 text-emerald-600">
      {resolved ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
    </span>
    <div className="space-y-1">
      <span className="font-bold text-emerald-800 text-[10px] uppercase block tracking-wider">{title}</span>
      <p className="font-semibold text-slate-700 leading-relaxed">{body}</p>
    </div>
  </div>
);

const ClinicalInsightsPage = () => {
  const [rows, setRows] = useState([]);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);

  // Keep track of resolved actions/recommendations in local state during demonstration
  const [resolvedRecommendations, setResolvedRecommendations] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clinicalSupportService.getCohortInsights();
      setRows(data.items);
      setModel(data.model);
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
    setResolvedRecommendations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async (patientId) => {
    setGeneratingId(patientId);
    try {
      const generated = await clinicalSupportService.generateInsights(patientId);
      setRows((prev) =>
        prev.map((row) =>
          row.patientId === patientId
            ? { ...row, insights: generated.insights, saved: generated.persisted }
            : row
        )
      );
    } catch (err) {
      alert('Failed to generate insights: ' + err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading)
    return (
      <LoadingSpinner
        message="Assembling decision support dashboard..."
        slowMessage="Reading the cohort and its newest scores - a sleeping server can take a minute to answer."
      />
    );
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  const scoredCount = rows.filter((row) => row.modelScored).length;
  const modelLabel = model?.loaded ? `${model.name} (${model.version})` : 'no model artifact loaded';

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
          <span className="font-bold underline block not-italic uppercase tracking-widest text-[10px]">
            AI-Generated Diagnostic Recommendations Notice
          </span>
          <p className="font-medium text-slate-600">
            Pathways are derived from the readmission band produced by {modelLabel}.{' '}
            {scoredCount} of {rows.length} of your patients carry a stored score; the rest show an
            unscored notice instead of a pathway. All insights require manual validation by a
            licensed clinical doctor prior to patient discharge.
          </p>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400 font-semibold">
          No patients are assigned to your account, so there is no cohort to support.
        </div>
      )}

      {/* Recommendations patient list cards */}
      <div className="space-y-6">
        {rows.map((p) => (
          <div key={p.patientId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-700 border border-slate-200 text-xs">
                  {initialsFor(p.name || p.medicalRecordNumber)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{p.name || p.medicalRecordNumber}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {p.name ? `${p.medicalRecordNumber} • ` : ''}
                    {p.ageGroup} • {p.gender} • Diagnosis:{' '}
                    <span className="text-slate-600 font-bold">{p.primaryDiagnosis || 'Not recorded'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.modelScored ? (
                  <>
                    <RiskBadge risk={p.riskCategory} />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">
                      Prob: {Math.round(p.readmissionProbability * 100)}%
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-500 border border-slate-200">
                    Not scored
                  </span>
                )}
              </div>
            </div>

            {p.insights ? (
              <>
                {p.saved === false && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Generated now - not saved, this patient has no prediction row to attach it to
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InsightBlock
                    title="Risk Mitigation Plan"
                    body={p.insights.riskMitigation}
                    resolved={resolvedRecommendations[`${p.patientId}-mitigation`]}
                    onToggle={() => toggleResolve(p.patientId, 'mitigation')}
                  />
                  <InsightBlock
                    title="Care & Diet Recommendation"
                    body={p.insights.careRecommendations}
                    resolved={resolvedRecommendations[`${p.patientId}-care`]}
                    onToggle={() => toggleResolve(p.patientId, 'care')}
                  />
                  <InsightBlock
                    title="Follow-Up Action Plan"
                    body={p.insights.followUpPlanning}
                    resolved={resolvedRecommendations[`${p.patientId}-followup`]}
                    onToggle={() => toggleResolve(p.patientId, 'followup')}
                  />
                  <InsightBlock
                    title="Discharge Protocols"
                    body={p.insights.dischargeRecommendations}
                    resolved={resolvedRecommendations[`${p.patientId}-discharge`]}
                    onToggle={() => toggleResolve(p.patientId, 'discharge')}
                  />
                </div>
                {p.insights.generatedAt && (
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Generated {new Date(p.insights.generatedAt).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  No insights on record for this patient yet.
                </p>
                <button
                  type="button"
                  onClick={() => handleGenerate(p.patientId)}
                  disabled={generatingId === p.patientId}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${generatingId === p.patientId ? 'animate-spin' : ''}`} />
                  {generatingId === p.patientId ? 'Generating...' : 'Generate insights'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClinicalInsightsPage;
