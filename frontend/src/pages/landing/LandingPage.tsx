import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  Building2,
  FlaskConical,
  UserCog,
  Database,
  Lock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  HeartPulse,
  CheckCircle2,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden selection:bg-teal-500 selection:text-white">
      {/* Background Ambience / Glows */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-[140px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute top-[40%] right-10 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* 1. Public Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-md shadow-teal-500/25">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-50">
                HealthForecast <span className="text-teal-600 dark:text-teal-400">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                Enterprise v1.0
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#capabilities" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Capabilities
            </a>
            <a href="#portals" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Role Portals
            </a>
            <a href="#dataset" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Dataset Pipeline
            </a>
            <a href="#security" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Security & HIPAA
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/dashboard')}
                icon={ArrowRight}
                iconPosition="right"
              >
                Dashboard ({user?.first_name || 'My Account'})
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                  icon={Lock}
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  Sign Up
                </Button>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading & Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 text-xs font-bold shadow-sm">
                <HeartPulse className="w-4 h-4 text-teal-600 animate-pulse" />
                <span>Hospital Readmission Prediction & Risk Intelligence</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1]">
                Predict Patient Risk.{' '}
                <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 bg-clip-text text-transparent">
                  Prevent Hospital Readmissions.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                HealthForecast AI transforms electronic health records into proactive clinical risk intelligence. 
                Built for clinical doctors, hospital directors, and medical researchers with strict HIPAA de-identification and role-based access control.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full sm:w-auto shadow-lg shadow-teal-500/25"
                >
                  {isAuthenticated ? 'Enter Clinical Dashboard' : 'Launch Clinical Platform'}
                </Button>
                <a href="#capabilities" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore Architecture
                  </Button>
                </a>
              </div>

              {/* Key Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 text-left">
                <div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-50">101,766</p>
                  <p className="text-xs text-slate-500 font-medium">Dataset Encounters</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-teal-600 dark:text-teal-400">4 Portals</p>
                  <p className="text-xs text-slate-500 font-medium">Role-Based Access</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">100%</p>
                  <p className="text-xs text-slate-500 font-medium">HIPAA De-Identified</p>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Mockup Card */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Decorative border glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-teal-500 to-cyan-500 opacity-30 blur-lg"></div>

                <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-6 space-y-5">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
                        AI
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Clinical Risk Assessment
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">Patient: PAT-2026-44</p>
                      </div>
                    </div>
                    <Badge variant="rose">High Risk - Tier 1</Badge>
                  </div>

                  {/* Risk Score Meter */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        30-Day Readmission Probability
                      </span>
                      <span className="text-xl font-black text-rose-600 dark:text-rose-400">76.4%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-500 to-rose-600 h-full rounded-full w-[76.4%]"></div>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      Elevated probability of inpatient readmission within 30 days.
                    </p>
                  </div>

                  {/* Factor Breakdown */}
                  <div className="space-y-2 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Primary Risk Attribution
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Inpatient Stays (Last 12 Mos)</span>
                        <span className="font-bold text-rose-600">+28%</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">HbA1c &gt; 8% Poor Control</span>
                        <span className="font-bold text-amber-600">+22%</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Polypharmacy (&gt; 7 Medications)</span>
                        <span className="font-bold text-amber-600">+15%</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs space-y-1">
                    <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      Recommended Protocol
                    </span>
                    <p className="text-teal-800/90 dark:text-teal-300 text-[11px]">
                      Schedule outpatient diabetic education within 7 days and review medication titration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Clinical Capabilities */}
      <section id="capabilities" className="py-20 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Platform Features
            </h2>
            <p className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Engineered for Modern Hospital Systems
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              A comprehensive clinical data foundation combining predictive risk stratification, clinical workflow automation, and multi-tier governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card hoverable className="space-y-3">
              <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 w-fit">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                30-Day Readmission Risk Intelligence
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Stratify hospital patients into risk tiers using 50 clinical, lab, and pharmacological features to deploy timely post-discharge interventions.
              </p>
            </Card>

            <Card hoverable className="space-y-3">
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 w-fit">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Doctor-Scoped Clinical Rosters
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Treating physicians receive dedicated queues of their assigned patients, active inpatient episodes, and prescribed drug protocols.
              </p>
            </Card>

            <Card hoverable className="space-y-3">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 w-fit">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                HIPAA De-Identified Research Portal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automated service-layer stripping of patient names, contact details, and precise addresses with deterministic pseudonymization.
              </p>
            </Card>

            <Card hoverable className="space-y-3">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 w-fit">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Hospital Load & Department Throughput
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Hospital administrators monitor inpatient admission volumes, average length of stay across clinical departments, and capacity.
              </p>
            </Card>

            <Card hoverable className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 w-fit">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Longitudinal Clinical Histories
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Capture diagnoses, chronic conditions, and drug allergies across inpatient admissions and therapeutic interventions.
              </p>
            </Card>

            <Card hoverable className="space-y-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 w-fit">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Immutable Security & Audit Trail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Every sensitive data access, user login, and patient record modification is permanently logged with timestamps and user identities.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Four Tailored Role Portals */}
      <section id="portals" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Access Matrix
            </h2>
            <p className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              4 Role-Based Operational Workspaces
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Each user persona is presented with a purpose-built dashboard and strict authorization scope.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Doctor */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/60 shadow-sm space-y-4">
              <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 w-fit">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Clinical Doctor</h3>
                <p className="text-xs text-slate-500 mt-1">Direct bedside and outpatient care</p>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                  Assigned patient cohort only
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                  Manage medical histories & diagnoses
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                  Prescribe therapeutic regimens
                </li>
              </ul>
            </div>

            {/* Hospital Admin */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900/60 shadow-sm space-y-4">
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 w-fit">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Hospital Admin</h3>
                <p className="text-xs text-slate-500 mt-1">Operational throughput and capacity</p>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  Hospital-wide admission metrics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  Department caseload breakdown
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  Average length of stay monitoring
                </li>
              </ul>
            </div>

            {/* Researcher */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-4">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 w-fit">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Healthcare Researcher</h3>
                <p className="text-xs text-slate-500 mt-1">Population health & cohort modeling</p>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                  Zero PII exposure guaranteed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                  Pseudonymized patient records
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                  Access 130-US Hospitals dataset
                </li>
              </ul>
            </div>

            {/* System Admin */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-4">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 w-fit">
                <UserCog className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">System Admin</h3>
                <p className="text-xs text-slate-500 mt-1">Security, users, and governance</p>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  User provisioning & RBAC
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  Doctor-patient care assignments
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  Live security audit trail
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Dataset Architecture & Pipeline Highlights */}
      <section id="dataset" className="py-20 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 text-xs font-bold">
                <Database className="w-3.5 h-3.5" />
                Benchmark Clinical Dataset
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                Diabetes 130-US Hospitals (1999–2008) Reference Pipeline
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                HealthForecast AI integrates 10 years of clinical inpatient care across 130 US hospital facilities, creating a standardized benchmark dataset for downstream AI readmission prediction.
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xl font-extrabold text-teal-600">101,766</p>
                  <p className="text-slate-500 font-medium mt-0.5">Patient Encounters</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xl font-extrabold text-cyan-600">50 Variables</p>
                  <p className="text-slate-500 font-medium mt-0.5">Clinical Dimensions</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xl font-extrabold text-purple-600">23 Drugs</p>
                  <p className="text-slate-500 font-medium mt-0.5">Medication Regimens</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xl font-extrabold text-emerald-600">100%</p>
                  <p className="text-slate-500 font-medium mt-0.5">Standardized Pipeline</p>
                </div>
              </div>
            </div>

            {/* Feature preview visual */}
            <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Key Variables Cataloged
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'time_in_hospital',
                  'num_lab_procedures',
                  'num_procedures',
                  'num_medications',
                  'number_outpatient',
                  'number_emergency',
                  'number_inpatient',
                  'diag_1 (ICD-9)',
                  'diag_2 (ICD-9)',
                  'diag_3 (ICD-9)',
                  'number_diagnoses',
                  'max_glu_serum',
                  'A1Cresult',
                  'metformin',
                  'insulin',
                  'glyburide',
                  'glipizide',
                  'change',
                  'diabetesMed',
                  'readmitted (<30 / >30 / NO)',
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Security & HIPAA Standards */}
      <section id="security" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Compliance & Architecture
            </h2>
            <p className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Enterprise Grade Security & Compliance
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-center sm:text-left">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 w-fit mx-auto sm:mx-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold">HIPAA Safe Harbor De-ID</h4>
              <p className="text-xs text-slate-500">
                Automated stripping of direct identifiers and demographic bracket aggregation for all non-clinical research access.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-center sm:text-left">
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 w-fit mx-auto sm:mx-0">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold">JWT Token Rotation</h4>
              <p className="text-xs text-slate-500">
                Short-lived 15-minute access tokens with cryptographic refresh token rotation and bcrypt-hashed credentials.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-center sm:text-left">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 w-fit mx-auto sm:mx-0">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold">Relational DB Layer</h4>
              <p className="text-xs text-slate-500">
                Cross-compatible architecture supporting SQLite for local development and PostgreSQL for high-availability production clusters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Quick Demo Test Showcase */}
      <section className="py-16 bg-gradient-to-r from-teal-900 via-slate-900 to-cyan-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black">Experience HealthForecast AI Now</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Sign in with any pre-provisioned demo role to explore the live clinical intelligence platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="glass"
              size="lg"
              onClick={() => navigate('/login')}
              icon={ArrowRight}
              iconPosition="right"
            >
              Go to Clinical Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-8 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <span className="font-bold text-slate-700 dark:text-slate-300">HealthForecast AI</span>
            <span>— Hospital Readmission Prediction & Risk Intelligence Platform</span>
          </div>
          <div>
            <span>© 2026 HealthForecast AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
