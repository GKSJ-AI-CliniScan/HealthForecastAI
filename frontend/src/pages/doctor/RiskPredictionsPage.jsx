import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { riskService } from '../../services/riskService';
import { patientService } from '../../services/patientService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import RiskBadge from '../../components/common/RiskBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  Eye, ShieldAlert, TrendingUp, AlertTriangle, Calculator, Cpu, 
  CheckCircle2, ArrowRight, Sparkles, Activity, FileSpreadsheet
} from 'lucide-react';

const RiskPredictionsPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interactive Risk Simulator State
  const [simParams, setSimParams] = useState({
    timeInHospital: 5,
    numInpatient: 1,
    numEmergency: 0,
    numDiagnoses: 7,
    insulinDose: 'Moderate',
    medChange: true
  });
  const [simResult, setSimResult] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const summData = await riskService.getRiskSummary();
      setSummary(summData);

      const patientData = await patientService.getAllPatients();
      setPatients(patientData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate simulated risk score whenever inputs change
  useEffect(() => {
    calculateSimulatedRisk();
  }, [simParams]);

  const calculateSimulatedRisk = () => {
    const raw = 
      (simParams.timeInHospital * 0.14) +
      (simParams.numInpatient * 1.6) +
      (simParams.numEmergency * 1.1) +
      (simParams.numDiagnoses * 0.22) +
      (simParams.insulinDose !== 'None' ? 1.0 : 0) +
      (simParams.medChange ? 0.75 : 0);

    const prob = 1 / (1 + Math.exp(-(raw - 3.2)));
    const probPct = parseFloat((prob * 100).toFixed(1));

    let riskLevel = 'Low';
    if (probPct >= 60.0) riskLevel = 'High';
    else if (probPct >= 35.0) riskLevel = 'Medium';

    const riskFactors = [];
    if (simParams.numInpatient > 0) riskFactors.push(`Prior inpatient stays count: ${simParams.numInpatient}`);
    if (simParams.numEmergency > 0) riskFactors.push(`Emergency visits in past 12m: ${simParams.numEmergency}`);
    if (simParams.timeInHospital > 5) riskFactors.push(`Extended hospital stay (${simParams.timeInHospital} days)`);
    if (simParams.numDiagnoses > 6) riskFactors.push(`Multiple complex comorbidities (${simParams.numDiagnoses} diagnoses)`);
    if (simParams.insulinDose !== 'None') riskFactors.push(`Active insulin regimen (${simParams.insulinDose})`);
    if (simParams.medChange) riskFactors.push('Recent medication dosage adjustment');
    if (riskFactors.length === 0) riskFactors.push('Standard low-risk clinical profile');

    setSimResult({
      probability: probPct,
      riskLevel,
      riskFactors
    });
  };

  if (loading) return <LoadingSpinner message="Evaluating patient cohort risk scores & ML model metrics..." />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  // Prepare chart data formats
  const diagnosisCounts = {};
  patients.forEach(p => {
    if (!diagnosisCounts[p.diagnosis]) {
      diagnosisCounts[p.diagnosis] = { name: p.diagnosis.split(' ')[0], High: 0, Medium: 0, Low: 0 };
    }
    diagnosisCounts[p.diagnosis][p.riskLevel]++;
  });
  const barChartData = Object.values(diagnosisCounts);

  // Model Feature Importance Weights
  const featureImportances = [
    { name: 'Prior Inpatient Admissions', weight: 32 },
    { name: 'HbA1c & Glycemic Levels', weight: 24 },
    { name: 'Length of Stay (Days)', weight: 18 },
    { name: 'Comorbidities Count', weight: 15 },
    { name: 'Insulin Regimen Change', weight: 11 }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Patient Risk Prediction & Readmission Intelligence" 
        description="Milestone 2: Real-time risk scoring, cohort stratification, ML model telemetry, and decision support."
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          title="Cohort Readmission Risk" 
          value={`${summary.averageProbability}%`} 
          icon={TrendingUp}
          color="violet"
          subtitle="Cohort average readmission probability"
        />
        <DashboardCard 
          title="High Risk Volume" 
          value={summary.highRiskCount} 
          icon={AlertTriangle}
          color="red"
          subtitle="Immediate clinical intervention candidates"
        />
        <DashboardCard 
          title="Medium Risk Volume" 
          value={summary.mediumRiskCount} 
          icon={ShieldAlert}
          color="amber"
          subtitle="Targeted outpatient follow-up cohort"
        />
        <DashboardCard 
          title="Low Risk Volume" 
          value={summary.lowRiskCount} 
          icon={Eye}
          color="emerald"
          subtitle="Standard post-discharge routine"
        />
      </div>

      {/* SECTION 1: REAL-TIME INTERACTIVE PATIENT RISK CALCULATOR */}
      <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-white via-red-50/20 to-rose-50/40 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-red-100 pb-4 gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-200">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Real-Time Patient Risk Score Simulator</h3>
              <p className="text-xs text-slate-500 font-medium">Input clinical variables to simulate readmission probability % and risk category</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <Sparkles className="h-3.5 w-3.5" /> 97.5% Model Accuracy
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Controls Input (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Length of Stay: <span className="text-red-600 font-extrabold">{simParams.timeInHospital} Days</span></label>
              <input 
                type="range" 
                min="1" 
                max="14" 
                value={simParams.timeInHospital}
                onChange={(e) => setSimParams({...simParams, timeInHospital: parseInt(e.target.value)})}
                className="w-full accent-red-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-0.5">
                <span>1 Day</span>
                <span>7 Days</span>
                <span>14 Days</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prior Inpatient Stays (12m)</label>
              <select 
                value={simParams.numInpatient}
                onChange={(e) => setSimParams({...simParams, numInpatient: parseInt(e.target.value)})}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:border-red-500 focus:outline-none"
              >
                <option value={0}>0 Admissions (Low baseline)</option>
                <option value={1}>1 Prior Admission</option>
                <option value={2}>2 Prior Admissions</option>
                <option value={3}>3+ Prior Admissions (High Risk)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Visits (12m)</label>
              <select 
                value={simParams.numEmergency}
                onChange={(e) => setSimParams({...simParams, numEmergency: parseInt(e.target.value)})}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:border-red-500 focus:outline-none"
              >
                <option value={0}>0 Emergency Visits</option>
                <option value={1}>1 Emergency Visit</option>
                <option value={2}>2 Emergency Visits</option>
                <option value={3}>3+ Emergency Visits</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Comorbid Diagnoses Count: <span className="text-red-600 font-extrabold">{simParams.numDiagnoses}</span></label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={simParams.numDiagnoses}
                onChange={(e) => setSimParams({...simParams, numDiagnoses: parseInt(e.target.value)})}
                className="w-full accent-red-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-0.5">
                <span>1 Diag</span>
                <span>5 Diag</span>
                <span>10 Diag</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Insulin Regimen Status</label>
              <select 
                value={simParams.insulinDose}
                onChange={(e) => setSimParams({...simParams, insulinDose: e.target.value})}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:border-red-500 focus:outline-none"
              >
                <option value="None">No Insulin Prescribed</option>
                <option value="Low">Low / Sliding Scale</option>
                <option value="Moderate">Moderate Basal Insulin</option>
                <option value="High">High Dosage / Combination</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="relative inline-flex items-center cursor-pointer gap-2.5">
                <input 
                  type="checkbox" 
                  checked={simParams.medChange}
                  onChange={(e) => setSimParams({...simParams, medChange: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                <span className="text-xs font-bold text-slate-700">Medication Adjustment in Stay</span>
              </label>
            </div>
          </div>

          {/* Result Card Output (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prediction Output</span>
              {simResult && <RiskBadge risk={simResult.riskLevel} />}
            </div>

            {simResult && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400 font-bold">Calculated Readmission Probability</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-black font-heading ${
                      simResult.riskLevel === 'High' ? 'text-red-600' :
                      simResult.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-600'
                    }`}>
                      {simResult.probability}%
                    </span>
                    <span className="text-xs font-bold text-slate-500">30-day early risk</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      simResult.riskLevel === 'High' ? 'bg-red-600' :
                      simResult.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${simResult.probability}%` }}
                  />
                </div>

                {/* Risk factors list */}
                <div>
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5">Top Identified Risk Factors:</div>
                  <ul className="space-y-1 text-xs text-slate-600 font-medium">
                    {simResult.riskFactors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-red-500 font-bold">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/doctor/clinical-insights')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 px-4 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
            >
              <span>View Clinical Decision Support Protocols</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: CHARTS & MODEL BENCHMARKS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Risk Distribution Donut (4 Cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-slate-850 font-heading border-b border-slate-100 pb-2">Cohort Risk Category Breakdown</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {summary.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Patients`, 'Volume']} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk by Diagnosis Stacked Bar (8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-slate-850 font-heading border-b border-slate-100 pb-2">Risk Stratification by Clinical Diagnosis</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="High" name="High Risk" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Medium" name="Medium Risk" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Low" name="Low Risk" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: ML MODEL TELEMETRY & FEATURE IMPORTANCES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900 font-heading">ML Classifier Performance & Feature Weighting</h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            <span>Model: <span className="text-red-600">Gradient Boosting</span></span>
            <span>Accuracy: <span className="text-emerald-600">97.5%</span></span>
            <span>ROC AUC: <span className="text-emerald-600">0.996</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {featureImportances.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                <span className="truncate">{item.name}</span>
                <span className="text-red-600">{item.weight}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-red-600 h-full rounded-full" style={{ width: `${item.weight * 2.5}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: HIGH & MEDIUM RISK PATIENTS TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-850 font-heading">High & Medium Risk Cohorts for Priority Triage</h3>
          <span className="text-xs font-semibold text-slate-400">Sorted by Readmission Probability</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Diagnosis</th>
                <th className="py-3 px-4">Risk Category</th>
                <th className="py-3 px-4">Readmission Probability</th>
                <th className="py-3 px-4">Attending Doctor</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients
                .filter(p => p.riskLevel !== 'Low')
                .sort((a,b) => b.readmissionProbability - a.readmissionProbability)
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{p.id} • {p.age}y • {p.gender}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{p.diagnosis}</td>
                    <td className="py-3.5 px-4"><RiskBadge risk={p.riskLevel} /></td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-800">{p.readmissionProbability}% probability</td>
                    <td className="py-3.5 px-4 text-slate-550 font-semibold">{p.assignedDoctor}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => navigate(`/doctor/patients/${p.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-slate-200 font-bold text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition"
                      >
                        Evaluate Profile
                      </button>
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

export default RiskPredictionsPage;
