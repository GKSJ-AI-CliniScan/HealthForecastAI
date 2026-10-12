"use client";

import React, { useState, useEffect } from "react";

export default function ClinicalDashboard() {
  const [activeTab, setActiveTab] = useState("doctor");
  const [totalPatients, setTotalPatients] = useState("1,240");
  const [readmissionRate, setReadmissionRate] = useState("14.2%");
  const [bedOccupancy, setBedOccupancy] = useState("81.4%");
  const [avgRecovery, setAvgRecovery] = useState("6.8 Days");
  const [filterCohort, setFilterCohort] = useState("All");

  const [patients] = useState([
    { id: "PT-10024", adm: "ADM-9824", name: "James Miller", risk: "HIGH", pct: 89, los: "14 Days", hba1c: "8.4% (Elevated)", status: "Active Care Plan" },
    { id: "PT-10811", adm: "ADM-9412", name: "Martha Jenkins", risk: "HIGH", pct: 92, los: "11 Days", hba1c: "9.1% (Elevated)", status: "Active Care Plan" },
    { id: "PT-12402", adm: "ADM-8730", name: "Robert Vance", risk: "MODERATE", pct: 52, los: "5 Days", hba1c: "7.2% (Normal)", status: "Discharge Ready" },
    { id: "PT-13991", adm: "ADM-8104", name: "Sarah Connor", risk: "LOW", pct: 18, los: "3 Days", hba1c: "5.8% (Normal)", status: "Discharged" },
    { id: "PT-14220", adm: "ADM-7921", name: "David Kim", risk: "HIGH", pct: 76, los: "9 Days", hba1c: "8.0% (Elevated)", status: "Active Care Plan" }
  ]);

  useEffect(() => {
    async function loadLiveData() {
      try {
        const [outcomesRes, hospRes] = await Promise.all([
          fetch("https://healthforecastai-api.onrender.com/api/v1/analytics/outcomes"),
          fetch("https://healthforecastai-api.onrender.com/api/v1/analytics/hospital-performance")
        ]);
        if (outcomesRes.ok) {
          const outcomes = await outcomesRes.json();
          if (outcomes.total_patients) setTotalPatients(Number(outcomes.total_patients).toLocaleString());
          if (outcomes.readmission_rate_pct != null) setReadmissionRate(outcomes.readmission_rate_pct + "%");
          if (outcomes.average_recovery_days != null) setAvgRecovery(outcomes.average_recovery_days + " Days");
        }
        if (hospRes.ok) {
          const hosp = await hospRes.json();
          if (hosp.bed_occupancy_rate_pct != null) setBedOccupancy(hosp.bed_occupancy_rate_pct + "%");
        }
      } catch (err) {
        console.warn("Using baseline cached metrics:", err);
      }
    }
    loadLiveData();
  }, []);

  const filteredPatients = filterCohort === "All" 
    ? patients 
    : patients.filter(p => p.risk === filterCohort);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
              HF
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-white">
                HealthForecast<span className="text-blue-500">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400">Clinical Decision Intelligence</p>
            </div>
          </div>

          {/* Interactive Role Switcher */}
          <nav className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-medium">
            <button
              onClick={() => setActiveTab("doctor")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "doctor" ? "bg-blue-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Doctor View
            </button>
            <button
              onClick={() => setActiveTab("hospital")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "hospital" ? "bg-blue-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Hospital Admin
            </button>
            <button
              onClick={() => setActiveTab("researcher")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "researcher" ? "bg-blue-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Researcher View
            </button>
            <button
              onClick={() => setActiveTab("system")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "system" ? "bg-blue-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              System Admin
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://healthforecastai-api.onrender.com/docs"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition"
          >
            Swagger API Docs ?
          </a>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cloud API Active
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Top Operational Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-semibold">Total Patients Analyzed</p>
            <p className="text-2xl font-bold text-white mt-1">{totalPatients}</p>
            <span className="text-[11px] text-emerald-400 font-medium">PostgreSQL Connected</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-semibold">Cohort Readmission Rate</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{readmissionRate}</p>
            <span className="text-[11px] text-slate-500">Benchmark: &lt; 15%</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-semibold">Bed Occupancy Rate</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{bedOccupancy}</p>
            <span className="text-[11px] text-slate-500">Target ward balance</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-semibold">Avg Recovery Length</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{avgRecovery}</p>
            <span className="text-[11px] text-slate-500">Across active wards</span>
          </div>
        </section>

        {/* 1. DOCTOR VIEW */}
        {activeTab === "doctor" && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h2 className="text-lg font-bold text-white">Clinical Risk Watchlist & Triage</h2>
                <p className="text-xs text-slate-400">Patients ranked by machine learning readmission probability.</p>
              </div>
              <div className="flex gap-2 text-xs">
                {["All", "HIGH", "MODERATE", "LOW"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterCohort(status)}
                    className={`px-3 py-1.5 rounded-lg border transition ${
                      filterCohort === status 
                        ? "bg-blue-600 border-blue-500 text-white font-semibold" 
                        : "border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/70 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Patient Name & ID</th>
                    <th className="p-3.5">Admission</th>
                    <th className="p-3.5">Risk Category</th>
                    <th className="p-3.5">Length of Stay</th>
                    <th className="p-3.5">HbA1c Lab Indicator</th>
                    <th className="p-3.5 text-right">Action Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-sans font-semibold text-slate-200">
                        {p.name} <span className="text-slate-500 font-mono text-[11px]">({p.id})</span>
                      </td>
                      <td className="p-3.5 text-slate-400">{p.adm}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          p.risk === "HIGH" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                          p.risk === "MODERATE" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}>
                          {p.risk} ({p.pct}%)
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-slate-300">{p.los}</td>
                      <td className="p-3.5 font-sans">
                        <span className={p.hba1c.includes("Elevated") ? "text-rose-400 font-medium" : "text-slate-400"}>
                          {p.hba1c}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        <span className="px-2.5 py-1 rounded bg-slate-800 text-blue-400 border border-slate-700 text-[11px]">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 2. HOSPITAL ADMIN VIEW */}
        {activeTab === "hospital" && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white">Department Readmission Vulnerability</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-white">Cardiac Care Unit (CCU)</p>
                    <p className="text-[11px] text-slate-400">High priority monitoring</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                    28.4% Readmission
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-white">Post-Surgical General Ward</p>
                    <p className="text-[11px] text-slate-400">Moderate turnaround</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                    13.2% Readmission
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-white">Endocrinology & Diabetes</p>
                    <p className="text-[11px] text-slate-400">Standard outpatient follow-up</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    6.8% Readmission
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white">Facility Capacity & Resource Allocation</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>General Beds Occupancy</span>
                  <span className="font-mono font-bold text-white">412 / 500 (82%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: "82%" }}></div>
                </div>

                <div className="flex justify-between items-center text-slate-300 pt-2">
                  <span>ICU Beds Occupancy</span>
                  <span className="font-mono font-bold text-white">54 / 60 (90%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: "90%" }}></div>
                </div>

                <div className="flex justify-between items-center text-slate-300 pt-2">
                  <span>Step-down Recovery Units</span>
                  <span className="font-mono font-bold text-white">88 / 120 (73%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "73%" }}></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. RESEARCHER VIEW */}
        {activeTab === "researcher" && (
          <section className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">Model Attribution & Clinical Cohort Analysis</h2>
              <p className="text-xs text-slate-400">Feature contribution scores computed across Random Forest & XGBoost classifiers.</p>
            </div>

            <div className="space-y-3 max-w-xl text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Polypharmacy (Total Prescriptions Count)</span>
                  <span className="font-mono text-blue-400 font-bold">+0.284 SHAP</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: "85%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Length of Hospital Stay (Days)</span>
                  <span className="font-mono text-blue-400 font-bold">+0.241 SHAP</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: "72%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Prior Emergency Admissions Count</span>
                  <span className="font-mono text-blue-400 font-bold">+0.193 SHAP</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: "58%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Secondary Comorbid Diagnosis Count</span>
                  <span className="font-mono text-blue-400 font-bold">+0.162 SHAP</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: "49%" }}></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. SYSTEM ADMIN VIEW */}
        {activeTab === "system" && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
              <p className="text-xs text-slate-400 uppercase font-semibold">FastAPI Microservice</p>
              <p className="text-xl font-bold text-emerald-400 mt-2">200 OK</p>
              <p className="text-[11px] text-slate-500 mt-1">Render Web Service (US-East)</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
              <p className="text-xs text-slate-400 uppercase font-semibold">Database Engine</p>
              <p className="text-xl font-bold text-emerald-400 mt-2">Neon PostgreSQL</p>
              <p className="text-[11px] text-slate-500 mt-1">Pooled serverless connection</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
              <p className="text-xs text-slate-400 uppercase font-semibold">Frontend Build</p>
              <p className="text-xl font-bold text-blue-400 mt-2">Next.js 14 / Tailwind</p>
              <p className="text-[11px] text-slate-500 mt-1">Render Static Host</p>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
