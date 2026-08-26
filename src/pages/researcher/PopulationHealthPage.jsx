import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Activity } from 'lucide-react';

const PopulationHealthPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await analyticsService.getResearchData();
        setData(res);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Assembling population clusters..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Population Health Analytics" 
        description="Analysis of cohort risk indicators and diagnosis frequencies."
      />

      {/* Bar Chart comparing high risk rates across diseases */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">High Readmission Risk Incidence (%) by Diagnosis</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.riskByDiagnosisIndex} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="diagnosis" tick={{ fontSize: 8 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} suffix="%" />
              <Tooltip formatter={(value) => [`${value}%`, 'High Risk Proportion']} />
              <Bar dataKey="highRiskPct" name="High Risk Incidence Ratio" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PopulationHealthPage;
