import React from 'react';
import {
  usePredictionSummary,
  useRiskDistribution,
  useReadmissionTrends,
  useHighRiskPatients,
} from '@/features/predictions/prediction.hooks';
import { PredictionDisclaimer } from '@/components/predictions/PredictionDisclaimer';
import { RiskBadge } from '@/components/predictions/RiskBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

export const PredictionDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading } = usePredictionSummary();
  const { data: riskDist } = useRiskDistribution();
  const { data: trendsData } = useReadmissionTrends();
  const { data: highRiskData } = useHighRiskPatients({ page: 1, page_size: 5 });

  const distColors: Record<string, string> = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#e11d48',
  };

  const distributionChartData =
    riskDist?.distribution.map((d) => ({
      name: d.category,
      count: d.count,
      percentage: d.percentage,
      fill: distColors[d.category] || '#0d9488',
    })) || [];

  const trends = trendsData?.trends || [];

  return (
    <div className="space-y-6">
      {/* Top Notice Banner */}
      <PredictionDisclaimer />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Predictions */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Predictions
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mt-0.5">
              {summaryLoading ? '...' : summary?.total_predictions ?? 0}
            </div>
            <span className="text-[10px] font-medium text-slate-400">
              Model: {summary?.active_model || 'Random Forest'} ({summary?.active_version || 'v1.0'})
            </span>
          </div>
        </Card>

        {/* High Risk Patients */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              High-Risk Patients
            </span>
            <div className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-0.5">
              {summaryLoading ? '...' : summary?.high_risk_patients ?? 0}
            </div>
            <span className="text-[10px] font-medium text-slate-400">Score 51–75 Band</span>
          </div>
        </Card>

        {/* Critical Patients */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Critical Risk
            </span>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
              {summaryLoading ? '...' : summary?.critical_patients ?? 0}
            </div>
            <span className="text-[10px] font-medium text-slate-400">Score 76–100 Band</span>
          </div>
        </Card>

        {/* Average Readmission Probability */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Avg Readmission Prob
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mt-0.5">
              {summaryLoading
                ? '...'
                : `${Math.round((summary?.average_readmission_probability ?? 0) * 100)}%`}
            </div>
            <span className="text-[10px] font-medium text-slate-400">Population baseline</span>
          </div>
        </Card>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Risk Distribution Pie */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Risk Category Distribution
              </h3>
              <p className="text-xs text-slate-400">Current population split across risk bands</p>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {distributionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    label={(entry: any) => `${entry.name} (${entry.percentage}%)`}
                  >
                    {distributionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No predictions recorded yet</div>
            )}
          </div>
        </Card>

        {/* Chart 2: Readmission Probability Distribution Bar */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Risk Band Counts
              </h3>
              <p className="text-xs text-slate-400">Absolute volume by category severity</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {distributionChartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: Predictions Over Time */}
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Predictions Over Time
            </h3>
            <p className="text-xs text-slate-400">Daily volume of AI evaluations conducted</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="predArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="prediction_count"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#predArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 4: High-Risk Trend */}
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              High-Risk Patient Trend
            </h3>
            <p className="text-xs text-slate-400">High & Critical readmission evaluations</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="highRiskArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="high_risk_count"
                  stroke="#e11d48"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#highRiskArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* High-Risk Clinical Watchlist Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            Top High-Risk Inpatient Watchlist
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/predictions/high-risk')}
            icon={ArrowRight}
          >
            View All Watchlist
          </Button>
        </div>

        {highRiskData?.items && highRiskData.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {highRiskData.items.slice(0, 3).map((pat) => (
              <Card
                key={pat.patient_id}
                className="p-4 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                onClick={() => navigate(`/patients/${pat.patient_id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {pat.patient_name}
                  </div>
                  <RiskBadge category={pat.risk_category} size="sm" />
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-500">
                  <span>Risk Score:</span>
                  <span className="text-sm font-extrabold font-mono text-rose-600">
                    {pat.risk_score} / 100
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-500">
                  <span>Readmission Prob:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {Math.round(pat.readmission_probability * 100)}%
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-xs text-slate-400">
            No patients currently identified in High or Critical risk bands.
          </Card>
        )}
      </div>
    </div>
  );
};
