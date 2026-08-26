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
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Eye, UserPlus } from 'lucide-react';
import Modal from '../../components/common/Modal';

const PatientsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [diagnosisFilter, setDiagnosisFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState(user?.role === 'doctor' ? user.name : 'All');
  const [sortBy, setSortBy] = useState('name-asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Patient Creation Form Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    diagnosis: 'Type 2 Diabetes',
    riskLevel: 'Medium',
    readmissionProbability: 50,
    treatmentStatus: 'Stable',
    assignedDoctor: user?.role === 'doctor' ? user.name : 'Dr. Sarah Jenkins'
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
    try {
      await patientService.addPatient({
        ...newPatient,
        age: parseInt(newPatient.age) || 45,
        readmissionProbability: parseInt(newPatient.readmissionProbability) || 50
      });
      setCreateModalOpen(false);
      // Reset form
      setNewPatient({
        name: '',
        age: '',
        gender: 'Male',
        diagnosis: 'Type 2 Diabetes',
        riskLevel: 'Medium',
        readmissionProbability: 50,
        treatmentStatus: 'Stable',
        assignedDoctor: user?.role === 'doctor' ? user.name : 'Dr. Sarah Jenkins'
      });
      loadPatients(); // Reload
    } catch (err) {
      alert('Error creating patient: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Querying patient directory..." />;
  if (error) return <ErrorState error={error} onRetry={loadPatients} />;

  // Unique lists for filters
  const allDiagnoses = ['All', ...new Set(patients.map(p => p.diagnosis))];
  const allDoctors = ['All', ...new Set(patients.map(p => p.assignedDoctor))];

  // Filtering Logic
  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'All' || p.riskLevel === riskFilter;
    const matchesDiag = diagnosisFilter === 'All' || p.diagnosis === diagnosisFilter;
    const matchesDoc = doctorFilter === 'All' || p.assignedDoctor === doctorFilter;

    return matchesSearch && matchesRisk && matchesDiag && matchesDoc;
  });

  // Sorting Logic
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'probability-desc':
        return b.readmissionProbability - a.readmissionProbability;
      case 'probability-asc':
        return a.readmissionProbability - b.readmissionProbability;
      case 'age-desc':
        return b.age - a.age;
      case 'age-asc':
        return a.age - b.age;
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
        description="Search, classify, and track readmission probabilities of your patients."
        actions={
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add Patient Record
          </button>
        }
      />

      {/* Filter and Search Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Name, Diagnosis, or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset page
              }}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 transition hover:border-slate-350 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Sort selection */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <ArrowUpDown className="h-4 w-4" />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="name-asc">Sort: A to Z</option>
              <option value="name-desc">Sort: Z to A</option>
              <option value="probability-desc">Sort: High Risk Probability</option>
              <option value="probability-asc">Sort: Low Risk Probability</option>
              <option value="age-desc">Sort: Age (Oldest First)</option>
              <option value="age-asc">Sort: Age (Youngest First)</option>
            </select>
          </div>

          {/* Risk Filter criteria */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Filter className="h-4 w-4" />
            </span>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="All">Filter: All Risks</option>
              <option value="High">Filter: High Risk Only</option>
              <option value="Medium">Filter: Medium Risk Only</option>
              <option value="Low">Filter: Low Risk Only</option>
            </select>
          </div>
        </div>

        {/* Extended filters (Diagnosis & Assigned Doctor) */}
        <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Diagnosis:</span>
            <select
              value={diagnosisFilter}
              onChange={(e) => {
                setDiagnosisFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              {allDiagnoses.map((diag) => (
                <option key={diag} value={diag}>{diag}</option>
              ))}
            </select>
          </div>

          {user?.role !== 'doctor' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">Assigned Doctor:</span>
              <select
                value={doctorFilter}
                onChange={(e) => {
                  setDoctorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                {allDoctors.map((doc) => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Table view */}
      {currentItems.length === 0 ? (
        <EmptyState 
          title="No patients match search parameters" 
          description="Try broadening your diagnostic criteria, searching another spelling, or clearing your active filters." 
          action={
            <button
              onClick={() => {
                setSearchTerm('');
                setRiskFilter('All');
                setDiagnosisFilter('All');
                setDoctorFilter('All');
              }}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-55/30 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Patient Name</th>
                  <th className="py-4 px-6">Age / Bio</th>
                  <th className="py-4 px-6">Diagnosis</th>
                  <th className="py-4 px-6">Risk Category</th>
                  <th className="py-4 px-6">Readmission Risk</th>
                  <th className="py-4 px-6">Staff Assigned</th>
                  <th className="py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((p) => (
                  <tr 
                    key={p.id} 
                    onClick={() => navigate(`/doctor/patients/${p.id}`)} 
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-semibold text-slate-450">{p.id}</td>
                    <td className="py-4 px-6 font-bold text-slate-800">{p.name}</td>
                    <td className="py-4 px-6 text-slate-650 font-medium">{p.age} yrs • {p.gender}</td>
                    <td className="py-4 px-6 font-medium text-slate-650">{p.diagnosis}</td>
                    <td className="py-4 px-6"><RiskBadge risk={p.riskLevel} /></td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${p.readmissionProbability > 70 ? 'bg-red-500' : p.readmissionProbability > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${p.readmissionProbability}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-slate-700">{p.readmissionProbability}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-semibold">{p.assignedDoctor}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => navigate(`/doctor/patients/${p.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-slate-200 font-bold hover:bg-slate-50 hover:text-emerald-600 transition cursor-pointer shadow-xs"
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
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <span className="text-xs text-slate-400 font-medium">
                Paging <span className="font-semibold text-slate-600">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-slate-600">{Math.min(indexOfLastItem, sortedPatients.length)}</span> of <span className="font-semibold text-slate-600">{sortedPatients.length}</span> patients
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg p-1.5 border border-slate-200 hover:bg-slate-55 transition disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold border transition ${
                      currentPage === number 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-600/20' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg p-1.5 border border-slate-200 hover:bg-slate-55 transition disabled:opacity-40"
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
        title="Add New Clinical Patient Record"
      >
        <form onSubmit={handleCreatePatientSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Patient Name</label>
              <input
                type="text"
                required
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                placeholder="e.g. Clark Kent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Age (Years)</label>
              <input
                type="number"
                required
                value={newPatient.age}
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                placeholder="65"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Gender</label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Primary Diagnosis</label>
              <select
                value={newPatient.diagnosis}
                onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Type 2 Diabetes">Type 2 Diabetes</option>
                <option value="Congestive Heart Failure (CHF)">Congestive Heart Failure (CHF)</option>
                <option value="COPD Exacerbation">COPD Exacerbation</option>
                <option value="Severe Community-Acquired Pneumonia">Severe Community-Acquired Pneumonia</option>
                <option value="Acute Appendicitis (Post-Appendectomy)">Acute Appendicitis (Post-Appendectomy)</option>
                <option value="Acute Gastroenteritis & Dehydration">Acute Gastroenteritis & Dehydration</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Risk Category Profile</label>
              <select
                value={newPatient.riskLevel}
                onChange={(e) => setNewPatient({ ...newPatient, riskLevel: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 font-heading">Readmission Probability (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newPatient.readmissionProbability}
                onChange={(e) => setNewPatient({ ...newPatient, readmissionProbability: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Assigned Medical Doctor</label>
              <select
                value={newPatient.assignedDoctor}
                onChange={(e) => setNewPatient({ ...newPatient, assignedDoctor: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                <option value="Dr. Robert Chen">Dr. Robert Chen</option>
                <option value="Dr. Richard Webber">Dr. Richard Webber</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Add Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientsPage;
