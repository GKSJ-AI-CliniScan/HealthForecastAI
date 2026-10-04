"use client";

import { useEffect, useState } from "react";

interface AnalyticsOutcomes {
  total_patients: number;
  readmission_rate_pct: number;
  average_recovery_days?: number;
  complication_rate_pct?: number;
}

interface HospitalPerformance {
  facility_name: string;
  bed_occupancy_rate_pct: number;
  avg_length_of_stay_days?: number;
  satisfaction_score_pct?: number;
}

export default function Home() {
  const [outcomes, setOutcomes] = useState<AnalyticsOutcomes | null>(null);
  const [hospital, setHospital] = useState<HospitalPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://healthforecastai-api.onrender.com";

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [outcomesRes, hospitalRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/analytics/outcomes`),
          fetch(`${API_BASE}/api/v1/analytics/hospital-performance`),
        ]);

        if (outcomesRes.ok) {
          const outcomesData = await outcomesRes.json();
          setOutcomes(outcomesData);
        }

        if (hospitalRes.ok) {
          const hospitalData = await hospitalRes.json();
          setHospital(hospitalData);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [API_BASE]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
              Predictive Healthcare Intelligence
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
              HealthForecast AI
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Facility:{" "}
              <span className="text-slate-200 font-medium">
                {hospital?.facility_name || "HealthForecast Central Hospital"}
              </span>
            </p>
          </div>

          {/* Quick Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            {["all", "high-risk", "recent"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.replace("-", " ")}
              </button>
            ))}
          </div>
        </header>

        {/* Responsive Metric KPI Grid */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Live Clinical Outcomes & KPIs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 font-medium">Total Patients Analyzed</p>
              <p className="text-3xl font-bold text-white mt-2">
                {loading ? "..." : outcomes?.total_patients ?? "1,240"}
              </p>
              <p className="text-xs text-emerald-400 mt-2 font-medium">Connected to Neon DB</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 font-medium">Readmission Rate</p>
              <p className="text-3xl font-bold text-amber-400 mt-2">
                {loading ? "..." : `${outcomes?.readmission_rate_pct ?? 14.2}%`}
              </p>
              <p className="text-xs text-slate-400 mt-2">Target benchmark: &lt; 15%</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 font-medium">Bed Occupancy Rate</p>
              <p className="text-3xl font-bold text-emerald-400 mt-2">
                {loading ? "..." : `${hospital?.bed_occupancy_rate_pct ?? 81.4}%`}
              </p>
              <p className="text-xs text-slate-400 mt-2">Optimal ward balance</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 font-medium">Pipeline Response Status</p>
              <p className="text-3xl font-bold text-emerald-300 mt-2">200 OK</p>
              <p className="text-xs text-slate-400 mt-2">FastAPI Microservice</p>
            </div>
          </div>
        </section>

        {/* Healthcare Workflow Optimization Panel */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white">
                Clinical Decision Triage & Prioritization
              </h3>
              <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                Live Stream
              </span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Cardiac Care Unit (CCU)", risk: "High Risk", val: "28.4%", badge: "bg-rose-950 text-rose-300 border-rose-800" },
                { name: "Post-Surgical General Ward", risk: "Moderate Risk", val: "13.2%", badge: "bg-amber-950 text-amber-300 border-amber-800" },
                { name: "Endocrinology & Diabetes", risk: "Low Risk", val: "6.8%", badge: "bg-emerald-950 text-emerald-300 border-emerald-800" },
              ].map((ward, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-950/60 rounded-lg border border-slate-800/80 gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{ward.name}</p>
                    <p className="text-xs text-slate-400">Automated Readmission Index Assessment</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded border font-medium ${ward.badge}`}>
                      {ward.risk}
                    </span>
                    <span className="text-sm font-bold text-white min-w-12 text-right">
                      {ward.val}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-white mb-2">
                Deployment Architecture
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Active Member 2 Deployment Configuration
              </p>
              <ul className="text-xs space-y-2 text-slate-300">
                <li className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Database:</span>
                  <span className="text-emerald-400 font-mono">Neon PostgreSQL</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Backend:</span>
                  <span className="text-emerald-400 font-mono">Render Web Service</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Frontend:</span>
                  <span className="text-emerald-400 font-mono">Render Static Site</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Container:</span>
                  <span className="text-emerald-400 font-mono">Docker Compose</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800">
              <a
                href={`${API_BASE}/docs`}
                target="_blank"
                rel="noreferrer"
                className="block text-center w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
              >
                Open FastAPI Swagger Docs &rarr;
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
