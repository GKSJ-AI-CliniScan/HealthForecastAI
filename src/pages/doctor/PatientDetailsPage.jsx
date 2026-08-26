import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import PageHeader from '../../components/common/PageHeader';
import RiskBadge from '../../components/common/RiskBadge';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  ShieldAlert, 
  CheckCircle,
  Activity,
  HeartPlus,
  Sliders,
  Brain
} from 'lucide-react';

const PatientDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insights'); // insights, history, vitals

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        const data = await patientService.getPatientById(id);
        if (!data) {
          throw new Error(`Patient record [${id}] not registered in index.`);
        }
        setPatient(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id]);

  if (loading) return <LoadingSpinner message="Parsing clinical profile charts..." />;
  if (error) return <ErrorState error={error} onRetry={() => navigate('/doctor/patients')} />;

  const pColor = patient.readmissionProbability > 70 
    ? 'text-red-650 bg-red-50 border-red-150' 
    : patient.readmissionProbability > 40 
      ? 'text-amber-650 bg-amber-50 border-amber-150' 
      : 'text-emerald-650 bg-emerald-50 border-emerald-150';

  return (
    <div className="space-y-6">
      {/* Page Header and Router Navigation back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-slate-205 p-2 bg-white hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader 
          title={patient.name} 
          description={`Patient ID: ${patient.id} — Clinical Intelligence Profile`}
        />
      </div>

      {/* Main Grid: Info Sidebar + Complex Diagnostics Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* LEFT COLUMN: Overview Sidebar */}
        <div className="space-y-6">
          {/* Diagnostic Profile card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs border border-emerald-100 font-bold text-2xl uppercase">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </span>
              <h2 className="mt-3 text-lg font-bold text-slate-800 font-heading">{patient.name}</h2>
              <p className="text-xs font-semibold text-slate-400 capitalize">{patient.gender} • {patient.age} years old</p>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <RiskBadge risk={patient.riskLevel} />
                <StatusBadge status={patient.treatmentStatus} />
              </div>
            </div>

            {/* General Contact lists */}
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">{patient.contact?.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700 truncate">{patient.contact?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">{patient.contact?.address}</span>
              </div>
            </div>

            {/* Admission timelines stats */}
            <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Admission Date</span>
                <span className="font-bold text-slate-750">{patient.admissionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Discharge Date</span>
                <span className={`font-bold ${patient.dischargeDate ? 'text-slate-755' : 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded'}`}>
                  {patient.dischargeDate || 'Currently Admitted'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Assigned Staff</span>
                <span className="font-bold text-slate-750">{patient.assignedDoctor}</span>
              </div>
            </div>
          </div>

          {/* Vitals Diagnostics */}
          <div className="rounded-2xl border border-slate-205 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-emerald-650" />
              Patient Recovery Vitals
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Progress Score</span>
                <span className="text-xl font-extrabold text-slate-800">{patient.recoveryProgress?.score}%</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Blood Pressure</span>
                <span className="text-xs font-bold text-slate-800 leading-normal">{patient.recoveryProgress?.bpReading}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Meds Adherence</span>
                <span className="text-xs font-bold text-slate-800 leading-normal">{patient.recoveryProgress?.medicationAdherence}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Comorbidities</span>
                <span className="text-xl font-extrabold text-slate-800">{patient.recoveryProgress?.comorbiditiesCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tabbed AI Diagnostics Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Risk Forecasting Gauge */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-850">
              <ShieldAlert className="h-5.5 w-5.5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-850 font-heading">AI-Forecasted Readmission Risk</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Radial Score Gauge */}
              <div className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                <div className="relative flex items-center justify-center">
                  {/* Circle SVG */}
                  <svg className="h-28 w-28">
                    <circle 
                      cx="56" cy="56" r="48" 
                      className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" 
                    />
                    <circle 
                      cx="56" cy="56" r="48" 
                      className={
                        patient.readmissionProbability > 70 
                          ? 'text-red-500' 
                          : patient.readmissionProbability > 40 
                            ? 'text-amber-500' 
                            : 'text-emerald-500'
                      } 
                      strokeWidth="8" 
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - patient.readmissionProbability / 100)}
                      strokeLinecap="round"
                      stroke="currentColor" fill="transparent" 
                      transform="rotate(-90 56 56)"
                    />
                  </svg>
                  <span className="absolute text-2xl font-extrabold text-slate-800">{patient.readmissionProbability}%</span>
                </div>
                <span className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">Prediction Probability</span>
              </div>

              {/* Detail parameters list */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Model Index:</span>
                  <span className={`px-3 py-1 text-xs font-extrabold border rounded-xl ${pColor}`}>
                    {patient.riskLevel} Risk Level
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-650">
                  <span className="block font-bold text-slate-500 uppercase tracking-widest text-[10px]">Identified Patient Risk Factors</span>
                  {patient.riskFactors && patient.riskFactors.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                      {patient.riskFactors.map((f, i) => <li key={i} className="font-semibold">{f}</li>)}
                    </ul>
                  ) : (
                    <p className="italic text-slate-400 font-medium">No major biometric warning thresholds breached.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Navigation Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('insights')}
              className={`border-b-2 px-6 py-3.5 text-xs font-bold transition-all ${
                activeTab === 'insights' 
                  ? 'border-emerald-600 text-emerald-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Clinical decision support (AI)
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`border-b-2 px-6 py-3.5 text-xs font-bold transition-all ${
                activeTab === 'history' 
                  ? 'border-emerald-600 text-emerald-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Hospital History
            </button>
          </div>

          {/* Tab 1: AI Clinical Insights & Care recommendations */}
          {activeTab === 'insights' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-205/60 bg-emerald-50/15 p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 text-emerald-900">
                  <Brain className="h-5 w-5 text-emerald-650" />
                  <h3 className="text-sm font-bold font-heading">AI-Generated Recommendations</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-450 border border-slate-200 bg-white rounded px-2 py-0.5 uppercase tracking-wide">
                    FastAPI Engine Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-1.5 hover:shadow-xs transition">
                    <span className="font-bold text-emerald-700 text-[10px] uppercase tracking-wider block">Risk Mitigation Strategy</span>
                    <p className="font-semibold text-slate-650 leading-relaxed">{patient.clinicalInsights?.riskMitigation}</p>
                  </div>
                  <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-1.5 hover:shadow-xs transition">
                    <span className="font-bold text-emerald-700 text-[10px] uppercase tracking-wider block">Diet & Medical Recommendations</span>
                    <p className="font-semibold text-slate-650 leading-relaxed">{patient.clinicalInsights?.careRecommendations}</p>
                  </div>
                  <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-1.5 hover:shadow-xs transition">
                    <span className="font-bold text-emerald-700 text-[10px] uppercase tracking-wider block">Follow-Up Action Plan</span>
                    <p className="font-semibold text-slate-650 leading-relaxed">{patient.clinicalInsights?.followUpPlanning}</p>
                  </div>
                  <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-1.5 hover:shadow-xs transition">
                    <span className="font-bold text-emerald-700 text-[10px] uppercase tracking-wider block">Discharge Protocols</span>
                    <p className="font-semibold text-slate-650 leading-relaxed">{patient.clinicalInsights?.dischargeRecommendations}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Hospital History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Previous Admissions & History</h3>
                {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                  <div className="space-y-3">
                    {patient.medicalHistory.map((h) => (
                      <div key={h.id} className="flex gap-4 p-4 border border-slate-150 rounded-xl bg-slate-55/20 text-xs">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold shrink-0">
                          H
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">{h.diagnosis}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{h.date}</span>
                          </div>
                          <p className="text-slate-500 font-medium">Facility: {h.hospital} • Severity: <span className="font-bold">{h.severity}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 py-4 font-semibold text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No historical readmission occurrences logged for this patient profile.
                  </p>
                )}
              </div>

              {/* Applied Clinical Treatments */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Applied Medications & Protocols</h3>
                <ul className="list-inside list-decimal text-xs space-y-2 text-slate-600">
                  {patient.treatmentHistory?.map((t, idx) => (
                    <li key={idx} className="font-semibold">{t}</li>
                  )) || <li className="italic text-slate-400 font-medium">No record</li>}
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PatientDetailsPage;
