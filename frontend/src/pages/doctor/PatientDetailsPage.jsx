import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import PageHeader from '../../components/common/PageHeader';
import RiskBadge from '../../components/common/RiskBadge';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';
import { 
  ArrowLeft, User, Calendar, MapPin, Phone, Mail, FileText, 
  ShieldAlert, CheckCircle, Activity, HeartPlus, Sliders, Brain,
  PlusCircle, CheckCircle2, MessageSquarePlus, Pill, Sparkles, HeartPulse,
  Clock, Edit3, X
} from 'lucide-react';

const PatientDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('notes'); // notes, insights, history, vitals
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  // Form states
  const [newNote, setNewNote] = useState({
    note: '',
    category: 'Progress Note',
    doctor: user?.name || 'Attending Doctor'
  });

  const [newTreatment, setNewTreatment] = useState('');

  const [vitalsForm, setVitalsForm] = useState({
    score: 75,
    bpReading: '120/80 mmHg',
    medicationAdherence: 'Good',
    comorbiditiesCount: 1,
  });

  const [statusForm, setStatusForm] = useState({
    treatmentStatus: 'Stable',
    riskLevel: 'Medium',
    readmissionProbability: 45
  });

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const data = await patientService.getPatientById(id);
      if (!data) {
        throw new Error(`Patient record [${id}] not registered in index.`);
      }
      setPatient(data);
      if (data.recoveryProgress) {
        setVitalsForm({
          score: data.recoveryProgress.score || 75,
          bpReading: data.recoveryProgress.bpReading || '120/80 mmHg',
          medicationAdherence: data.recoveryProgress.medicationAdherence || 'Good',
          comorbiditiesCount: data.recoveryProgress.comorbiditiesCount || 1,
        });
      }
      setStatusForm({
        treatmentStatus: data.treatmentStatus || 'Stable',
        riskLevel: data.riskLevel || 'Medium',
        readmissionProbability: data.readmissionProbability || 45
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Add Note Handler
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.note.trim()) return;

    try {
      const updated = await patientService.addClinicalNote(patient.id, {
        note: newNote.note.trim(),
        category: newNote.category,
        doctor: user?.name || newNote.doctor,
        date: new Date().toISOString().split('T')[0]
      });

      if (updated) setPatient(updated);
      setNoteModalOpen(false);
      setNewNote({ note: '', category: 'Progress Note', doctor: user?.name || 'Attending Doctor' });
      showToast('Clinical note added successfully!');
      await fetchPatientData();
    } catch (err) {
      alert('Failed to add note: ' + err.message);
    }
  };

  // Add Treatment Handler
  const handleAddTreatment = async (e) => {
    e.preventDefault();
    if (!newTreatment.trim()) return;

    try {
      const updated = await patientService.addTreatment(patient.id, newTreatment.trim());
      if (updated) setPatient(updated);
      setTreatmentModalOpen(false);
      setNewTreatment('');
      showToast('Medication / Treatment protocol added!');
      await fetchPatientData();
    } catch (err) {
      alert('Failed to add treatment: ' + err.message);
    }
  };

  // Update Vitals Handler
  const handleUpdateVitals = async (e) => {
    e.preventDefault();
    try {
      const updated = await patientService.updatePatient(patient.id, {
        recoveryProgress: {
          score: parseInt(vitalsForm.score, 10) || 75,
          bpReading: vitalsForm.bpReading,
          medicationAdherence: vitalsForm.medicationAdherence,
          comorbiditiesCount: parseInt(vitalsForm.comorbiditiesCount, 10) || 1,
        }
      });
      if (updated) setPatient(updated);
      setVitalsModalOpen(false);
      showToast('Patient vitals & recovery score updated!');
      await fetchPatientData();
    } catch (err) {
      alert('Failed to update vitals: ' + err.message);
    }
  };

  // Update Status / Risk Handler
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      const updated = await patientService.updatePatient(patient.id, {
        treatmentStatus: statusForm.treatmentStatus,
        riskLevel: statusForm.riskLevel,
        readmissionProbability: parseInt(statusForm.readmissionProbability, 10) || 50,
        dischargeDate: statusForm.treatmentStatus === 'Discharged' ? new Date().toISOString().split('T')[0] : null
      });
      if (updated) setPatient(updated);
      setStatusModalOpen(false);
      showToast(`Status updated to ${statusForm.treatmentStatus}!`);
      await fetchPatientData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Parsing clinical profile charts..." />;
  if (error) return <ErrorState error={error} onRetry={() => navigate('/doctor/patients')} />;

  const pColor = patient.readmissionProbability > 70 
    ? 'text-red-700 bg-red-50 border-red-200' 
    : patient.readmissionProbability > 40 
      ? 'text-amber-700 bg-amber-50 border-amber-200' 
      : 'text-emerald-700 bg-emerald-50 border-emerald-200';

  const notesList = patient.clinicalNotes || [];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs font-bold text-emerald-800 shadow-md animate-fade-up">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header and Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-zinc-200 p-2.5 bg-white hover:bg-zinc-100 transition cursor-pointer shadow-xs"
            title="Back to Registry"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">{patient.name}</h1>
            <p className="text-xs text-zinc-400 font-medium">Patient ID: <span className="font-bold text-zinc-700">{patient.id}</span> — {patient.diagnosis}</p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setNoteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-red-200 hover:from-red-700 hover:to-rose-800 transition hover:scale-102 cursor-pointer"
          >
            <MessageSquarePlus className="h-4 w-4" /> Add Clinical Note
          </button>
          <button
            onClick={() => setTreatmentModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-zinc-200 px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:border-red-200 hover:text-red-600 transition cursor-pointer shadow-xs"
          >
            <Pill className="h-4 w-4 text-red-500" /> Add Medication
          </button>
          <button
            onClick={() => setVitalsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-zinc-200 px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:border-red-200 hover:text-red-600 transition cursor-pointer shadow-xs"
          >
            <Activity className="h-4 w-4 text-red-500" /> Update Vitals
          </button>
          <button
            onClick={() => setStatusModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-zinc-200 px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:border-red-200 hover:text-red-600 transition cursor-pointer shadow-xs"
          >
            <Edit3 className="h-4 w-4 text-red-500" /> Status / Discharge
          </button>
        </div>
      </div>

      {/* Main Grid: Info Sidebar + Tabbed Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* LEFT COLUMN: Overview Sidebar */}
        <div className="space-y-6">
          {/* Diagnostic Profile card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col items-center text-center pb-4 border-b border-zinc-100">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-xs border border-red-100 font-bold text-2xl uppercase">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </span>
              <h2 className="mt-3 text-lg font-bold text-zinc-900">{patient.name}</h2>
              <p className="text-xs font-semibold text-zinc-400 capitalize">{patient.gender} • {patient.age} years old</p>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <RiskBadge risk={patient.riskLevel} />
                <StatusBadge status={patient.treatmentStatus} />
              </div>
            </div>

            {/* General Contact lists */}
            <div className="space-y-3.5 text-xs text-zinc-600">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="font-semibold text-zinc-700">{patient.contact?.phone || '+1 (555) 234-8901'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="font-semibold text-zinc-700 truncate">{patient.contact?.email || 'patient@healthforecast.ai'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="font-semibold text-zinc-700">{patient.contact?.address || 'Seattle, WA'}</span>
              </div>
            </div>

            {/* Admission timelines stats */}
            <div className="border-t border-zinc-100 pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Admission Date</span>
                <span className="font-bold text-zinc-700">{patient.admissionDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Discharge Date</span>
                <span className={`font-bold ${patient.dischargeDate ? 'text-zinc-700' : 'text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full'}`}>
                  {patient.dischargeDate || 'Active Inpatient'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Attending Clinician</span>
                <span className="font-bold text-zinc-700">{patient.assignedDoctor}</span>
              </div>
            </div>
          </div>

          {/* Vitals Diagnostics Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-red-500" />
                Patient Recovery Vitals
              </h3>
              <button 
                onClick={() => setVitalsModalOpen(true)}
                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
              >
                Edit Vitals
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Recovery Score</span>
                <span className="text-xl font-extrabold text-zinc-900">{patient.recoveryProgress?.score || 70}%</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Blood Pressure</span>
                <span className="text-xs font-bold text-zinc-900 leading-normal">{patient.recoveryProgress?.bpReading || '120/80 mmHg'}</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Meds Adherence</span>
                <span className="text-xs font-bold text-zinc-900 leading-normal">{patient.recoveryProgress?.medicationAdherence || 'Good'}</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Comorbidities</span>
                <span className="text-xl font-extrabold text-zinc-900">{patient.recoveryProgress?.comorbiditiesCount || 1}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tabbed Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Risk Forecasting Gauge */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-800">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h3 className="text-base font-bold text-zinc-900">AI Readmission Risk Stratification</h3>
              </div>
              <button
                onClick={() => setStatusModalOpen(true)}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Edit3 className="h-3.5 w-3.5" /> Adjust Risk Level
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Radial Score Gauge */}
              <div className="flex flex-col items-center justify-center p-4 border border-zinc-100 rounded-2xl bg-zinc-50">
                <div className="relative flex items-center justify-center">
                  <svg className="h-28 w-28">
                    <circle 
                      cx="56" cy="56" r="48" 
                      className="text-zinc-200" strokeWidth="8" stroke="currentColor" fill="transparent" 
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
                      strokeDashoffset={2 * Math.PI * 48 * (1 - (patient.readmissionProbability || 50) / 100)}
                      strokeLinecap="round"
                      stroke="currentColor" fill="transparent" 
                      transform="rotate(-90 56 56)"
                    />
                  </svg>
                  <span className="absolute text-2xl font-extrabold text-zinc-900">{patient.readmissionProbability || 50}%</span>
                </div>
                <span className="mt-2 text-xs font-bold text-zinc-400 uppercase tracking-widest text-center">Prediction Score</span>
              </div>

              {/* Detail parameters list */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Model Assessment:</span>
                  <span className={`px-3 py-1 text-xs font-extrabold border rounded-xl ${pColor}`}>
                    {patient.riskLevel} Risk Class
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-zinc-600">
                  <span className="block font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Identified Patient Risk Factors</span>
                  {patient.riskFactors && patient.riskFactors.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                      {patient.riskFactors.map((f, i) => <li key={i} className="font-semibold">{f}</li>)}
                    </ul>
                  ) : (
                    <p className="italic text-zinc-400 font-medium">Standard baseline clinical monitoring parameters.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Navigation Tabs */}
          <div className="flex border-b border-zinc-200">
            <button
              onClick={() => setActiveTab('notes')}
              className={`border-b-2 px-5 py-3 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'notes' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Clinical Notes ({notesList.length})
            </button>
            <button
              onClick={() => setActiveTab('treatments')}
              className={`border-b-2 px-5 py-3 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'treatments' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Pill className="h-4 w-4" />
              Medications & Treatments ({patient.treatmentHistory?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`border-b-2 px-5 py-3 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'insights' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Brain className="h-4 w-4" />
              AI Decision Support
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`border-b-2 px-5 py-3 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'history' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Admissions History
            </button>
          </div>

          {/* Tab 1: Clinical Notes (Interactive!) */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-800">Physician & Nursing Clinical Notes</h3>
                <button
                  onClick={() => setNoteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Write New Note
                </button>
              </div>

              {notesList.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200 space-y-3">
                  <MessageSquarePlus className="h-8 w-8 text-zinc-300 mx-auto" />
                  <p className="text-xs text-zinc-500 font-medium">No clinical notes recorded yet for this patient.</p>
                  <button
                    onClick={() => setNoteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition cursor-pointer"
                  >
                    + Add First Clinical Note
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {notesList.map((n, idx) => (
                    <div key={n.id || idx} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-2 hover:border-red-200 transition">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-xs font-bold text-zinc-800">{n.doctor || 'Attending Physician'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase">
                            {n.category || 'Clinical Note'}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-400">{n.date || 'Recent'}</span>
                      </div>
                      <p className="text-xs text-zinc-700 leading-relaxed font-medium whitespace-pre-wrap">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Medications & Treatments */}
          {activeTab === 'treatments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-800">Active Medications & Treatment Regimens</h3>
                <button
                  onClick={() => setTreatmentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add Medication / Protocol
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
                {patient.treatmentHistory && patient.treatmentHistory.length > 0 ? (
                  <div className="space-y-2.5">
                    {patient.treatmentHistory.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                        <div className="h-7 w-7 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-zinc-800 flex-1">{t}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-zinc-400 py-4 font-semibold text-center">
                    No active medications recorded. Click "+ Add Medication / Protocol" above.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: AI Clinical Insights & Care recommendations */}
          {activeTab === 'insights' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 text-zinc-800">
                  <Brain className="h-5 w-5 text-red-500" />
                  <h3 className="text-sm font-bold">AI Clinical Care Pathways</h3>
                  <span className="ml-auto text-[10px] font-bold text-zinc-500 border border-zinc-200 bg-zinc-50 rounded-full px-2.5 py-0.5 uppercase tracking-wide">
                    Live Model
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl space-y-1.5">
                    <span className="font-bold text-red-600 text-[10px] uppercase tracking-wider block">Risk Mitigation Strategy</span>
                    <p className="font-semibold text-zinc-700 leading-relaxed">{patient.clinicalInsights?.riskMitigation}</p>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl space-y-1.5">
                    <span className="font-bold text-red-600 text-[10px] uppercase tracking-wider block">Diet & Medication Protocol</span>
                    <p className="font-semibold text-zinc-700 leading-relaxed">{patient.clinicalInsights?.careRecommendations}</p>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl space-y-1.5">
                    <span className="font-bold text-red-600 text-[10px] uppercase tracking-wider block">Follow-Up Action Plan</span>
                    <p className="font-semibold text-zinc-700 leading-relaxed">{patient.clinicalInsights?.followUpPlanning}</p>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl space-y-1.5">
                    <span className="font-bold text-red-600 text-[10px] uppercase tracking-wider block">Discharge Protocols</span>
                    <p className="font-semibold text-zinc-700 leading-relaxed">{patient.clinicalInsights?.dischargeRecommendations}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Hospital History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-800">Previous Admissions & Historical Encounters</h3>
                {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                  <div className="space-y-3">
                    {patient.medicalHistory.map((h, i) => (
                      <div key={h.id || i} className="flex gap-4 p-4 border border-zinc-200 rounded-xl bg-zinc-50 text-xs">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 font-bold shrink-0">
                          H
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-zinc-800">{h.diagnosis}</span>
                            <span className="text-[10px] text-zinc-400 font-semibold">{h.date}</span>
                          </div>
                          <p className="text-zinc-500 font-medium">Facility: {h.hospital || 'St. Jude Medical Center'} • Severity: <span className="font-bold text-zinc-700">{h.severity}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-zinc-400 py-4 font-semibold text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                    No prior readmission occurrences logged for this patient profile.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── MODAL 1: Add Clinical Note ─── */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Add Physician / Clinical Progress Note"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Note Category
            </label>
            <select
              value={newNote.category}
              onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="Progress Note">Progress Note</option>
              <option value="Physician Consultation">Physician Consultation</option>
              <option value="Medication Adjustment">Medication Adjustment</option>
              <option value="Discharge Evaluation">Discharge Evaluation</option>
              <option value="Nursing Triage">Nursing Triage</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Clinical Observations & Directives *
            </label>
            <textarea
              required
              rows={4}
              value={newNote.note}
              onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
              placeholder="Document patient's current response to therapy, vital trends, bedside observations, or post-discharge recommendations..."
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-medium text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-red-700 hover:to-rose-800 transition"
            >
              Save Clinical Note
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 2: Add Medication / Treatment ─── */}
      <Modal
        isOpen={treatmentModalOpen}
        onClose={() => setTreatmentModalOpen(false)}
        title="Add Medication Prescription / Treatment"
      >
        <form onSubmit={handleAddTreatment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Medication / Protocol Details *
            </label>
            <input
              type="text"
              required
              value={newTreatment}
              onChange={(e) => setNewTreatment(e.target.value)}
              placeholder="e.g. Metformin 500mg BID with meals"
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
            />
            <p className="mt-1.5 text-[11px] text-zinc-400">Include drug name, dosage, frequency, and administration instructions.</p>
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setTreatmentModalOpen(false)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-red-700 hover:to-rose-800 transition"
            >
              Add Protocol
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 3: Update Vitals ─── */}
      <Modal
        isOpen={vitalsModalOpen}
        onClose={() => setVitalsModalOpen(false)}
        title="Update Patient Recovery Vitals"
      >
        <form onSubmit={handleUpdateVitals} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Blood Pressure
              </label>
              <input
                type="text"
                value={vitalsForm.bpReading}
                onChange={(e) => setVitalsForm({ ...vitalsForm, bpReading: e.target.value })}
                placeholder="120/80 mmHg"
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Recovery Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={vitalsForm.score}
                onChange={(e) => setVitalsForm({ ...vitalsForm, score: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Medication Adherence
              </label>
              <select
                value={vitalsForm.medicationAdherence}
                onChange={(e) => setVitalsForm({ ...vitalsForm, medicationAdherence: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Good">Good (90%+ compliant)</option>
                <option value="Moderate">Moderate (60-89%)</option>
                <option value="Poor">Poor (&lt;60%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Comorbidities Count
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={vitalsForm.comorbiditiesCount}
                onChange={(e) => setVitalsForm({ ...vitalsForm, comorbiditiesCount: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setVitalsModalOpen(false)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-red-700 hover:to-rose-800 transition"
            >
              Update Vitals
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 4: Update Status / Discharge ─── */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Patient Care Status & Discharge"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Patient Care Status
            </label>
            <select
              value={statusForm.treatmentStatus}
              onChange={(e) => setStatusForm({ ...statusForm, treatmentStatus: e.target.value })}
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="Stable">Stable</option>
              <option value="Improving">Improving</option>
              <option value="Under Observation">Under Observation</option>
              <option value="Critical">Critical</option>
              <option value="Discharged">Discharged (Discharge to Outpatient)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Risk Level Classification
            </label>
            <select
              value={statusForm.riskLevel}
              onChange={(e) => setStatusForm({ ...statusForm, riskLevel: e.target.value })}
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="High">High Risk (&gt;70%)</option>
              <option value="Medium">Medium Risk (40-70%)</option>
              <option value="Low">Low Risk (&lt;40%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Readmission Probability (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={statusForm.readmissionProbability}
              onChange={(e) => setStatusForm({ ...statusForm, readmissionProbability: e.target.value })}
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-red-700 hover:to-rose-800 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default PatientDetailsPage;
