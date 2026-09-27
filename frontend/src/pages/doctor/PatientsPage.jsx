import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import PageHeader from '../../components/common/PageHeader';
import RiskBadge from '../../components/common/RiskBadge';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Eye, UserPlus, CheckCircle2, Sparkles, X } from 'lucide-react';
import Modal from '../../components/common/Modal';

const PatientsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [diagnosisFilter, setDiagnosisFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Patient Creation Form Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    diagnosis: 'Type 2 Diabetes',
    riskLevel: 'Medium',
    readmissionProbability: 45,
    treatmentStatus: 'Stable',
    assignedDoctor: user?.name || 'S.Saumya',
    phone: '+1 (555) 234-8901',
    email: '',
    address: 'Seattle, WA',
    initialNote: ''
  });

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await patientService.getAllPatients();
      setPatients(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleCreatePatientSubmit = async (e) => {
    e.preventDefault();
    if (!newPatient.name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await patientService.addPatient({
        name: newPatient.name.trim(),
        age: parseInt(newPatient.age, 10) || 45,
        gender: newPatient.gender,
        diagnosis: newPatient.diagnosis,
        riskLevel: newPatient.riskLevel,
        readmissionProbability: parseInt(newPatient.readmissionProbability, 10) || 50,
        treatmentStatus: newPatient.treatmentStatus,
        assignedDoctor: newPatient.assignedDoctor || user?.name || 'S.Saumya',
        contact: {
          phone: newPatient.phone || '+1 (555) 019-2834',
          email: newPatient.email || `${newPatient.name.toLowerCase().replace(/\s+/g, '.')}@patientmail.com`,
          address: newPatient.address || 'Seattle, WA',
        },
        clinicalNotes: newPatient.initialNote ? [
          {
            id: `note_${Date.now()}`,
            doctor: newPatient.assignedDoctor || user?.name || 'Doctor',
            note: newPatient.initialNote,
            category: 'Initial Consultation',
            date: new Date().toISOString().split('T')[0]
          }
        ] : undefined
      });

      setCreateModalOpen(false);
      setSuccessMessage(`Patient ${created.name} (${created.id}) registered successfully!`);
      setTimeout(() => setSuccessMessage(''), 5000);

      // Reset form
      setNewPatient({
        name: '',
        age: '',
        gender: 'Male',
        diagnosis: 'Type 2 Diabetes',
        riskLevel: 'Medium',
        readmissionProbability: 45,
        treatmentStatus: 'Stable',
        assignedDoctor: user?.name || 'S.Saumya',
        phone: '+1 (555) 234-8901',
        email: '',
        address: 'Seattle, WA',
        initialNote: ''
      });

      // Clear filters so the new patient is immediately visible
      setSearchTerm('');
      setRiskFilter('All');
      setDiagnosisFilter('All');
      setDoctorFilter('All');
      setCurrentPage(1);

      await loadPatients();
    } catch (err) {
      alert('Error creating patient: ' + (err.message || 'Server error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Querying patient registry..." />;
  if (error) return <ErrorState error={error} onRetry={loadPatients} />;

  // Unique lists for filters
  const allDiagnoses = ['All', ...new Set(patients.map(p => p.diagnosis).filter(Boolean))];
  const allDoctors = ['All', ...new Set([user?.name, ...patients.map(p => p.assignedDoctor)].filter(Boolean))];

  // Filtering Logic
  const filteredPatients = patients.filter((p) => {
    const matchesSearch = !searchTerm ||
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.id && p.id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRisk = riskFilter === 'All' || p.riskLevel === riskFilter;
    const matchesDiag = diagnosisFilter === 'All' || p.diagnosis === diagnosisFilter;
    const matchesDoc = doctorFilter === 'All' || p.assignedDoctor === doctorFilter;

    return matchesSearch && matchesRisk && matchesDiag && matchesDoc;
  });

  // Sorting Logic
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '');
      case 'probability-desc':
        return (b.readmissionProbability || 0) - (a.readmissionProbability || 0);
      case 'probability-asc':
        return (a.readmissionProbability || 0) - (b.readmissionProbability || 0);
      case 'age-desc':
        return (b.age || 0) - (a.age || 0);
      case 'age-asc':
        return (a.age || 0) - (b.age || 0);
      default:
        return 0;
    }
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedPatients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Management Registry"
        description="Search, register, classify, and track readmission probabilities of your patients."
        actions={
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-200 hover:from-red-700 hover:to-rose-800 transition hover:scale-102 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add Patient Record
          </button>
        }
      />

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs font-bold text-emerald-800 shadow-sm animate-fade-up">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Name, Diagnosis, or Patient ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-800 placeholder-zinc-400 transition hover:border-zinc-300 focus:border-red-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Sort selection */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
              <ArrowUpDown className="h-4 w-4" />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-xs font-bold text-zinc-700 transition focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="name-asc">Sort: Name (A to Z)</option>
              <option value="name-desc">Sort: Name (Z to A)</option>
              <option value="probability-desc">Sort: High Risk (Top)</option>
              <option value="probability-asc">Sort: Low Risk (Top)</option>
              <option value="age-desc">Sort: Age (Oldest)</option>
              <option value="age-asc">Sort: Age (Youngest)</option>
            </select>
          </div>

          {/* Risk Filter criteria */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
              <Filter className="h-4 w-4" />
            </span>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-xs font-bold text-zinc-700 transition focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Risk Levels</option>
              <option value="High">High Risk Only</option>
              <option value="Medium">Medium Risk Only</option>
              <option value="Low">Low Risk Only</option>
            </select>
          </div>
        </div>

        {/* Extended filters (Diagnosis & Assigned Doctor) */}
        <div className="flex flex-wrap gap-4 border-t border-zinc-100 pt-4 text-xs items-center justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-500">Diagnosis:</span>
              <select
                value={diagnosisFilter}
                onChange={(e) => {
                  setDiagnosisFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-bold text-zinc-700 focus:outline-hidden cursor-pointer"
              >
                {allDiagnoses.map((diag) => (
                  <option key={diag} value={diag}>{diag}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-500">Doctor Filter:</span>
              <select
                value={doctorFilter}
                onChange={(e) => {
                  setDoctorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-bold text-zinc-700 focus:outline-hidden cursor-pointer"
              >
                {allDoctors.map((doc) => (
                  <option key={doc} value={doc}>{doc === user?.name ? `${doc} (Me)` : doc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-zinc-400 font-semibold">
            Showing <span className="font-bold text-zinc-800">{filteredPatients.length}</span> total patients
          </div>
        </div>
      </div>

      {/* Main Table view */}
      {currentItems.length === 0 ? (
        <EmptyState
          title="No patients found"
          description="Try clearing your active search filters or register a new patient."
          action={
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRiskFilter('All');
                  setDiagnosisFilter('All');
                  setDoctorFilter('All');
                }}
                className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition"
              >
                + Add Patient Now
              </button>
            </div>
          }
        />
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Patient Name</th>
                  <th className="py-4 px-6">Age / Gender</th>
                  <th className="py-4 px-6">Diagnosis</th>
                  <th className="py-4 px-6 text-center">Risk Level</th>
                  <th className="py-4 px-6">Readmission Risk</th>
                  <th className="py-4 px-6">Assigned Doctor</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                {currentItems.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/doctor/patients/${p.id}`)}
                    className="hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-bold text-zinc-400">{p.id}</td>
                    <td className="py-4 px-6 font-bold text-zinc-900">{p.name}</td>
                    <td className="py-4 px-6 text-zinc-500">{p.age} yrs • {p.gender}</td>
                    <td className="py-4 px-6 text-zinc-700 max-w-[200px] truncate">{p.diagnosis}</td>
                    <td className="py-4 px-6 text-center"><RiskBadge risk={p.riskLevel} /></td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-zinc-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.readmissionProbability > 70 ? 'bg-red-500' : p.readmissionProbability > 40 ? 'bg-amber-500' : 'bg-zinc-400'}`}
                            style={{ width: `${p.readmissionProbability}%` }}
                          />
                        </div>
                        <span className={`font-bold ${p.readmissionProbability > 70 ? 'text-red-600' : p.readmissionProbability > 40 ? 'text-amber-600' : 'text-zinc-600'}`}>
                          {p.readmissionProbability}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-semibold">{p.assignedDoctor}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/doctor/patients/${p.id}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-zinc-200 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition cursor-pointer shadow-xs text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
              <span className="text-xs text-zinc-400 font-medium">
                Showing <span className="font-semibold text-zinc-700">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-zinc-700">{Math.min(indexOfLastItem, sortedPatients.length)}</span> of <span className="font-semibold text-zinc-700">{sortedPatients.length}</span> patients
              </span>

              <div className="flex gap-1.5">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg p-1.5 border border-zinc-200 hover:bg-zinc-100 transition disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold border transition ${
                      currentPage === number
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg p-1.5 border border-zinc-200 hover:bg-zinc-100 transition disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patient Creation Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Clinical Patient Record"
        size="lg"
      >
        <form onSubmit={handleCreatePatientSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Full Patient Name *
              </label>
              <input
                type="text"
                required
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Age (Years) *
              </label>
              <input
                type="number"
                required
                min="0"
                max="125"
                value={newPatient.age}
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
                placeholder="62"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Gender *
              </label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Primary Diagnosis *
              </label>
              <select
                value={newPatient.diagnosis}
                onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Type 2 Diabetes">Type 2 Diabetes</option>
                <option value="Congestive Heart Failure (CHF)">Congestive Heart Failure (CHF)</option>
                <option value="COPD Exacerbation">COPD Exacerbation</option>
                <option value="Severe Community-Acquired Pneumonia">Severe Community-Acquired Pneumonia</option>
                <option value="Acute Coronary Syndrome">Acute Coronary Syndrome</option>
                <option value="Chronic Kidney Disease (Stage 3/4)">Chronic Kidney Disease (Stage 3/4)</option>
                <option value="Acute Appendicitis (Post-Appendectomy)">Acute Appendicitis (Post-Appendectomy)</option>
                <option value="Acute Gastroenteritis & Dehydration">Acute Gastroenteritis & Dehydration</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Risk Classification Profile
              </label>
              <select
                value={newPatient.riskLevel}
                onChange={(e) => setNewPatient({ ...newPatient, riskLevel: e.target.value })}
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
                value={newPatient.readmissionProbability}
                onChange={(e) => setNewPatient({ ...newPatient, readmissionProbability: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Initial Treatment Status
              </label>
              <select
                value={newPatient.treatmentStatus}
                onChange={(e) => setNewPatient({ ...newPatient, treatmentStatus: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Stable">Stable</option>
                <option value="Improving">Improving</option>
                <option value="Under Observation">Under Observation</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Assigned Attending Doctor
              </label>
              <select
                value={newPatient.assignedDoctor}
                onChange={(e) => setNewPatient({ ...newPatient, assignedDoctor: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                {user?.name && <option value={user.name}>{user.name} (Current Clinician)</option>}
                <option value="S.Saumya">S.Saumya (Cardiology)</option>
                <option value="Dr. Robert Chen">Dr. Robert Chen (Endocrinology)</option>
                <option value="Dr. Richard Webber">Dr. Richard Webber (Surgery)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Initial Clinical Observation / Triage Note
              </label>
              <textarea
                rows={2}
                value={newPatient.initialNote}
                onChange={(e) => setNewPatient({ ...newPatient, initialNote: e.target.value })}
                placeholder="Enter initial clinical intake note, presenting symptoms, or vitals..."
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-red-700 hover:to-rose-800 transition disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Register Patient</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientsPage;
