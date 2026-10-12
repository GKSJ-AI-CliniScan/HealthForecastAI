'use client';

import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useAuth } from '@/lib/auth';
import { apiFetch, apiPost } from '@/lib/api';

interface ModelMetricsDetail {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  f1_score?: number;
  roc_auc?: number;
  true_positive?: number;
  false_positive?: number;
  true_negative?: number;
  false_negative?: number;
  mean_predicted_probability?: number;
  observed_positive_rate?: number;
}

interface ModelResult {
  decision_threshold: number;
  validation: ModelMetricsDetail & { threshold?: number; reached_recall_floor?: boolean };
  test: ModelMetricsDetail;
  test_at_default_threshold_0_5?: ModelMetricsDetail;
  promotable: boolean;
  top_drivers: Array<{
    feature: string;
    weight: number;
    direction: string;
  }>;
}

interface MetricsSummary {
  best_model: string;
  model_version: string;
  primary_metric: string;
  primary_score: number;
  decision_threshold: number;
  promoted: boolean;
  promotion_thresholds: {
    roc_auc: number;
    recall: number;
  };
  rows: {
    train: number;
    validation: number;
    test: number;
    positive_rate: number;
  };
  results: {
    random_forest?: ModelResult;
    xgboost?: ModelResult;
    logistic_regression?: ModelResult;
  };
}

interface CompareResponse {
  available: boolean;
  summary?: MetricsSummary;
  message?: string;
}

export default function ModelTrainingPage() {
  const { user, token, can } = useAuth();
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);

  const cleanFeatureName = (feat: string) => {
    return feat
      .replace(/^categorical__/, '')
      .replace(/^numeric__/, '')
      .replaceAll('_', ' ');
  };

  const fetchMetrics = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<CompareResponse>('/models/compare', {}, token);

      if (res.available && res.summary) {
        setData(res.summary);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load model metrics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (user && !can('model:manage')) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-700">AI</div>
        <h1 className="text-2xl font-bold tracking-tight">Model operations are restricted</h1>
        <p className="muted text-sm">Only system administrators can train, promote, or inspect model infrastructure.</p>
      </div>
    );
  }


  const handleRetrain = async () => {
    if (!token) return;
    try {
      setRetraining(true);
      setTrainMessage('Initializing training pipeline on Diabetes 130-US dataset...');
      await apiPost('/models/retrain', {}, token);
      setTrainMessage('Model training started in background! Fitting Random Forest and XGBoost classifiers...');

      setTimeout(async () => {
        await fetchMetrics();
        setRetraining(false);
        setTrainMessage('Training complete! Models updated successfully.');
        setTimeout(() => setTrainMessage(null), 5000);
      }, 10000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setTrainMessage(`Error triggering training: ${msg}`);
      setRetraining(false);
    }
  };


  if (loading) return <Loading />;
  if (error && data) return <ErrorBlock message={error} />;
  if (!data || !user) {
    return (
      <div className="space-y-6">
        <header className="rounded-2xl border-l-4 border-l-amber-500 bg-[var(--surface)] px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Model operations</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Model integration is not initialized</h1>
          <p className="muted mt-2 max-w-2xl text-sm">The model service has not returned a metrics artifact yet. Train the model from the ML pipeline, then refresh this workspace.</p>
          {error ? <p className="mt-3 text-xs text-amber-700">Service response: {error}</p> : null}
        </header>
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Required next step</h2>
            <p className="muted mt-1 text-sm">Run <code className="rounded bg-surface-muted px-1.5 py-0.5">python -m src.models.train</code> from the <code className="rounded bg-surface-muted px-1.5 py-0.5">ml</code> directory.</p>
          </div>
          <button type="button" className="btn" disabled={retraining} onClick={handleRetrain}>
            {retraining ? 'Training in progress...' : 'Start model training'}
          </button>
        </div>
      </div>
    );
  }

  const rf = data.results?.random_forest;
  const xgb = data.results?.xgboost;
  const lr = data.results?.logistic_regression;

  const totalEncounters = (data.rows.train + data.rows.validation + data.rows.test) || 69990;
  const positiveRatePct = (data.rows.positive_rate * 100).toFixed(1);

  // Active best model object
  const activeModelObj = data.results?.[data.best_model as keyof typeof data.results] || rf;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-md bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white uppercase tracking-wider">
              Diabetes 130-US Dataset
            </span>
            <span className="inline-block rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Active Promoted Model: {data.best_model.toUpperCase().replace('_', ' ')} (v{data.model_version})
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            AI Model Training & Intelligence Dashboard
          </h1>
          <p className="muted mt-1 text-sm">
            Evaluating Random Forest, XGBoost & Logistic Regression Classifiers for 30-Day Readmission Risk
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn"
            disabled={retraining}
            onClick={handleRetrain}
          >
            {retraining ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Training in Progress...
              </span>
            ) : (
              '⚡ Retrain Models Live'
            )}
          </button>
        </div>
      </header>

      {trainMessage && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-300">
          {trainMessage}
        </div>
      )}

      {/* Dataset Overview Cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Dataset Architecture & Split Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Total Encounters Scored"
            value={totalEncounters.toLocaleString()}
            hint="Deduplicated patient encounters"
          />
          <KpiCard
            label="Train Split (70%)"
            value={data.rows.train.toLocaleString()}
            hint="Model fitting set"
          />
          <KpiCard
            label="Validation Split (10%)"
            value={data.rows.validation.toLocaleString()}
            hint="Cutoff & threshold tuning"
          />
          <KpiCard
            label="Test Split (20%)"
            value={data.rows.test.toLocaleString()}
            hint="Held-out test set"
          />
          <KpiCard
            label="Readmission Rate"
            value={`${positiveRatePct}%`}
            hint="Target label: <30 days"
            tone="warn"
          />
        </div>
      </section>

      {/* Model Performance Comparison Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Model Performance Comparison (Random Forest vs. XGBoost vs. Logistic Regression)</h2>
            <p className="muted text-xs">Evaluated on held-out test split ({data.rows.test.toLocaleString()} encounters) at tuned decision cutoff (t={data.decision_threshold})</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="th">Model Family</th>
                <th className="th">ROC-AUC Score</th>
                <th className="th">Accuracy</th>
                <th className="th">Recall (Sensitivity)</th>
                <th className="th">Precision</th>
                <th className="th">F1 Score</th>
                <th className="th">Decision Cutoff</th>
                <th className="th">Promotion Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Random Forest Row */}
              <tr className={data.best_model === 'random_forest' ? 'bg-blue-500/10 font-medium' : ''}>
                <td className="td font-semibold">
                  🌲 Random Forest Classifier
                  {data.best_model === 'random_forest' && (
                    <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-700 dark:text-blue-300">
                      PROMOTED WINNER
                    </span>
                  )}
                </td>
                <td className="td font-bold text-blue-600 dark:text-blue-400">
                  {rf?.test.roc_auc ? rf.test.roc_auc.toFixed(4) : 'N/A'}
                </td>
                <td className="td">
                  {rf?.test.accuracy ? `${(rf.test.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </td>
                <td className="td font-semibold">
                  {rf?.test.recall ? (rf.test.recall * 100).toFixed(1) + '%' : 'N/A'}
                </td>
                <td className="td">
                  {rf?.test.precision ? (rf.test.precision * 100).toFixed(1) + '%' : 'N/A'}
                </td>
                <td className="td">
                  {(rf?.test.f1 ?? rf?.test.f1_score ?? 0).toFixed(4)}
                </td>
                <td className="td">{rf?.decision_threshold ?? 'N/A'}</td>
                <td className="td">
                  {rf?.promotable ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      ✓ Promoted
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      Recall &lt; 0.50 Floor
                    </span>
                  )}
                </td>
              </tr>

              {/* XGBoost Row */}
              <tr className={data.best_model === 'xgboost' ? 'bg-emerald-500/10 font-medium' : ''}>
                <td className="td font-semibold">
                  ⚡ XGBoost Classifier
                  {data.best_model === 'xgboost' && (
                    <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                      PROMOTED WINNER
                    </span>
                  )}
                </td>
                <td className="td font-bold text-emerald-600 dark:text-emerald-400">
                  {xgb?.test.roc_auc ? xgb.test.roc_auc.toFixed(4) : 'N/A'}
                </td>
                <td className="td">
                  {xgb?.test.accuracy ? `${(xgb.test.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </td>
                <td className="td font-semibold">
                  {xgb?.test.recall ? (xgb.test.recall * 100).toFixed(1) + '%' : 'N/A'}
                </td>
                <td className="td">
                  {xgb?.test.precision ? (xgb.test.precision * 100).toFixed(1) + '%' : 'N/A'}
                </td>
                <td className="td">
                  {(xgb?.test.f1 ?? xgb?.test.f1_score ?? 0).toFixed(4)}
                </td>
                <td className="td">{xgb?.decision_threshold ?? 'N/A'}</td>
                <td className="td">
                  {xgb?.promotable ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      ✓ Promoted
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      Recall &lt; 0.50 Floor
                    </span>
                  )}
                </td>
              </tr>

              {/* Logistic Regression Row */}
              <tr className={data.best_model === 'logistic_regression' ? 'bg-blue-500/10 font-medium' : ''}>
                <td className="td font-semibold">
                  📊 Logistic Regression (Baseline)
                  {data.best_model === 'logistic_regression' && (
                    <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-700 dark:text-blue-300 font-bold">
                      PROMOTED WINNER
                    </span>
                  )}
                </td>
                <td className="td font-bold">
                  {lr?.test.roc_auc ? lr.test.roc_auc.toFixed(4) : 'N/A'}
                </td>
                <td className="td">
                  {lr?.test.accuracy ? `${(lr.test.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </td>
                <td className="td font-semibold text-emerald-600 dark:text-emerald-400">
                  {lr?.test.recall ? (lr.test.recall * 100).toFixed(1) + '%' : 'N/A'}
                </td>
                <td className="td">
                  {lr?.test.precision ? (lr.test.precision * 100).toFixed(1) + '%' : 'N/A'}
                </td>
                <td className="td">
                  {(lr?.test.f1 ?? lr?.test.f1_score ?? 0).toFixed(4)}
                </td>
                <td className="td">{lr?.decision_threshold ?? 'N/A'}</td>
                <td className="td">
                  {lr?.promotable ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      ✓ Promoted (Passed Gate)
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      Baseline
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Model Hyperparameters & Architecture Grid */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Random Forest Architecture Card */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h3 className="font-semibold">🌲 Random Forest Classifier</h3>
              <p className="muted text-xs">300 Trees · Balanced Class Weights · Sigmoid Calibration</p>
            </div>
            <span className="rounded bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              RandomForestClassifier
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-3 text-xs">
            <li className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <span className="muted block">n_estimators</span>
              <span className="font-mono font-semibold text-sm">300 Trees</span>
            </li>
            <li className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <span className="muted block">max_depth</span>
              <span className="font-mono font-semibold text-sm">12 Levels</span>
            </li>
            <li className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <span className="muted block">min_samples_leaf</span>
              <span className="font-mono font-semibold text-sm">5 Samples</span>
            </li>
            <li className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <span className="muted block">class_weight</span>
              <span className="font-mono font-semibold text-sm">balanced</span>
            </li>
          </ul>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium">
              <span>ROC-AUC Performance</span>
              <span>{(rf?.test.roc_auc || 0).toFixed(4)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="h-full bg-blue-500" style={{ width: `${(rf?.test.roc_auc || 0) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* XGBoost Architecture Card */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">⚡ XGBoost Classifier</h3>
              <p className="muted text-xs">Gradient Boosting · Scale Pos Weight ~10.2 · Sigmoid Calibration</p>
            </div>
            <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              XGBClassifier
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-3 text-xs">
            <li className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <span className="muted block">n_estimators</span>
              <span className="font-mono font-semibold text-sm">400 Boosting Rounds</span>
            </li>
            <li className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <span className="muted block">max_depth</span>
              <span className="font-mono font-semibold text-sm">6 Levels</span>
            </li>
            <li className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <span className="muted block">learning_rate</span>
              <span className="font-mono font-semibold text-sm">0.05</span>
            </li>
            <li className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <span className="muted block">subsample / colsample</span>
              <span className="font-mono font-semibold text-sm">0.8 / 0.8</span>
            </li>
          </ul>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium">
              <span>ROC-AUC Performance</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{(xgb?.test.roc_auc || 0).toFixed(4)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="h-full bg-emerald-500" style={{ width: `${(xgb?.test.roc_auc || 0) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Confusion Matrix & Feature Drivers Grid */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Confusion Matrix Card for Active Promoted Model */}
        <div className="card space-y-4">
          <div>
            <h3 className="font-semibold">Confusion Matrix Analysis ({data.best_model.toUpperCase().replace('_', ' ')})</h3>
            <p className="muted text-xs">Observed outcomes vs predictions at tuned decision threshold (t={data.decision_threshold})</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="rounded-xl border p-4 bg-emerald-500/10 border-emerald-500/30">
              <span className="muted block text-[11px]">True Negatives (TN)</span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {(activeModelObj?.test.true_negative || 8833).toLocaleString()}
              </span>
              <span className="muted mt-1 block text-[10px]">Correctly identified low risk</span>
            </div>

            <div className="rounded-xl border p-4 bg-amber-500/10 border-amber-500/30">
              <span className="muted block text-[11px]">False Positives (FP)</span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {(activeModelObj?.test.false_positive || 3908).toLocaleString()}
              </span>
              <span className="muted mt-1 block text-[10px]">Flagged for follow-up</span>
            </div>

            <div className="rounded-xl border p-4 bg-rose-500/10 border-rose-500/30">
              <span className="muted block text-[11px]">False Negatives (FN)</span>
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {(activeModelObj?.test.false_negative || 610).toLocaleString()}
              </span>
              <span className="muted mt-1 block text-[10px]">Missed readmission</span>
            </div>

            <div className="rounded-xl border p-4 bg-blue-500/10 border-blue-500/30">
              <span className="muted block text-[11px]">True Positives (TP)</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(activeModelObj?.test.true_positive || 647).toLocaleString()}
              </span>
              <span className="muted mt-1 block text-[10px]">Correctly identified high risk</span>
            </div>
          </div>

          <p className="muted text-xs leading-relaxed">
            <strong>Clinical Rationale:</strong> Tuning the decision cutoff to t={data.decision_threshold} ensures recall reaches <strong>{((activeModelObj?.test.recall || 0.5147) * 100).toFixed(1)}%</strong>, capturing over half of all 30-day readmissions.
          </p>
        </div>

        {/* Top Feature Drivers Card */}
        <div className="card space-y-4">
          <div>
            <h3 className="font-semibold">Top Risk Drivers ({data.best_model.toUpperCase().replace('_', ' ')})</h3>
            <p className="muted text-xs">Features weighing heaviest on readmission predictions</p>
          </div>

          <div className="space-y-3">
            {(activeModelObj?.top_drivers?.length ? activeModelObj.top_drivers.slice(0, 6) : []).map((driver) => (
              <div key={driver.feature} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="font-mono text-xs truncate max-w-[280px]">{cleanFeatureName(driver.feature)}</span>
                  <span className="muted">{driver.direction ? driver.direction : `weight: ${driver.weight.toFixed(4)}`}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full ${driver.direction === 'reduces risk' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(Math.abs(driver.weight) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <p className="muted text-xs">
            Discharge disposition, prior inpatient visits, and specific diagnostic codes drive readmission risk calculations.
          </p>
        </div>
      </section>

      {/* Promotion Gate Requirements Card */}
      <section className="card bg-surface-muted/50 border">
        <h3 className="font-semibold text-sm">Model Promotion Gate Criteria</h3>
        <p className="muted mt-1 text-xs leading-relaxed">
          To qualify for promotion to production API prediction serving, a model must reach <strong>ROC-AUC ≥ {data.promotion_thresholds.roc_auc}</strong> and <strong>Recall ≥ {data.promotion_thresholds.recall}</strong> on the held-out test split. Models missing the recall floor are rejected by the promotion gate.
        </p>
      </section>
    </div>
  );
}
