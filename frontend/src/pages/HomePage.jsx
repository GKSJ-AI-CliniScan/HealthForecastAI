import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HeartPulse, Activity, ShieldCheck, Users, Building2,
  Stethoscope, Clock, Phone, MapPin, Award, ArrowRight,
  Sparkles, Bed, CheckCircle2, Lock, Ambulance, Microscope,
  Star, UserCheck, Flame, Zap, Shield, TrendingUp
} from 'lucide-react';

/* ─── Reusable 3-D tilt card ─────────────────────────────────────────── */
const TiltCard = ({ children, className = '', style = {} }) => {
  const ref = useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale3d(1.03,1.03,1.03)`;
    el.style.boxShadow = `${-x * 16}px ${y * 16}px 40px rgba(220,38,38,0.18), 0 8px 40px rgba(220,38,38,0.08)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)';
    el.style.boxShadow = '';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{ transition: 'transform 0.15s ease, box-shadow 0.15s ease', willChange: 'transform', ...style }}
    >
      {children}
    </div>
  );
};

/* ─── Floating 3-D stat pill ──────────────────────────────────────────── */
const StatPill = ({ value, label, delay = 0, color = 'red' }) => {
  const colors = {
    red:   'from-red-50 to-red-100 border-red-200 text-red-600',
    gray:  'from-zinc-50 to-zinc-100 border-zinc-200 text-zinc-700',
    amber: 'from-amber-50 to-amber-100 border-amber-200 text-amber-600',
    rose:  'from-rose-50 to-rose-100 border-rose-200 text-rose-600',
  };
  return (
    <div
      className={`relative rounded-2xl border bg-gradient-to-br p-5 text-center shadow-lg ${colors[color]}`}
      style={{ animation: `floatSlow ${3 + delay}s ${delay}s ease-in-out infinite alternate` }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
      <span className="block text-2xl sm:text-3xl font-black text-zinc-900 drop-shadow-sm">{value}</span>
      <span className="block text-[11px] font-bold uppercase tracking-wider mt-1 opacity-60">{label}</span>
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────────────────── */
const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getDashboardPath = () => {
    if (!user) return '/login';
    const map = {
      doctor: '/doctor/dashboard',
      'hospital-admin': '/hospital-admin/dashboard',
      researcher: '/researcher/dashboard',
      'system-admin': '/system-admin/dashboard'
    };
    return map[user.role] || '/login';
  };

  const departments = [
    { name: "Cardiovascular & Heart Institute", icon: HeartPulse, badge: "Center of Excellence", description: "Advanced cardiac telemetry, post-operative coronary care, acute angioplasty, and 24/7 arrhythmia stabilization.", metrics: "91.2% Recovery • 4.8 Days Avg Stay", treatments: ["Angioplasty & Stenting","Heart Failure Telemetry","Echocardiography","Cardiac Rehabilitation"] },
    { name: "Endocrinology & Diabetes Center", icon: Stethoscope, badge: "Specialized Care", description: "Multi-disciplinary diabetic care, continuous glucose monitoring, DKA stabilization, and outpatient insulin protocols.", metrics: "88.5% Recovery • 350+ Patients Annually", treatments: ["Type 1 & 2 Diabetes Care","Insulin Titration Protocols","Renal Protection","Nutritional Therapy"] },
    { name: "Pulmonary & Respiratory Medicine", icon: Activity, badge: "Advanced Diagnostics", description: "COPD exacerbation treatment, community-acquired pneumonia care, asthma management, and pulmonary rehab programs.", metrics: "94.0% Recovery • 280+ Patients Treated", treatments: ["Nebulizer Therapy","Spirometry Diagnostics","Supplemental O2 Protocol","Inpatient Ventilator Support"] },
    { name: "Nephrology & Renal Dialysis Wing", icon: Microscope, badge: "Critical Care", description: "Acute kidney injury management, chronic renal disease monitoring, and full-service outpatient hemodialysis suites.", metrics: "86.4% Recovery • 220+ Monitored", treatments: ["Hemodialysis Suites","Peritoneal Dialysis","Electrolyte Balancing","Pre-Transplant Triage"] },
    { name: "Emergency & Level-1 Trauma Care", icon: Ambulance, badge: "24/7 Red Alert", description: "Immediate life-saving trauma surgery, rapid cardiac triage, acute stroke resuscitation, and intensive observation bays.", metrics: "<8 min Triage • 24/7 Red Alert Active", treatments: ["Acute Resuscitation","Rapid CT/MRI Imaging","Sepsis Emergency Care","Critical Care Bays"] },
    { name: "General Internal Medicine & Surgery", icon: Building2, badge: "Primary Surgical Wing", description: "Inpatient surgical recovery, multi-morbidity patient management, post-op wound healing, and discharge coordination.", metrics: "95.8% Recovery • 370+ Patients", treatments: ["Laparoscopic Surgery","Post-Op Wound Care","Medication Reconciliation","Home Health Coordination"] }
  ];

  return (
    <div className="min-h-screen font-sans text-zinc-800 select-none bg-white">

      {/* ═══════════ LAYERED BACKGROUND MESH ════════════════════════════ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* subtle grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(220,38,38,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.05) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {/* top red orb */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #dc2626 0%, transparent 70%)', transform: `translateX(-50%) translateY(${scrollY * 0.1}px)` }} />
        {/* bottom-right soft blush */}
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(ellipse, #fca5a5 0%, transparent 70%)' }} />
      </div>

      {/* ═══════════ STICKY NAVBAR ══════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-zinc-200"
        style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10" style={{ perspective: '200px' }}>
              <div
                className="absolute inset-0 rounded-xl shadow-lg shadow-red-300/50 group-hover:shadow-red-400/60 transition-shadow"
                style={{
                  background: 'linear-gradient(135deg,#dc2626,#be123c)',
                  transform: 'rotateY(-10deg) rotateX(8deg)',
                  transition: 'transform 0.3s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'rotateY(0deg) rotateX(0deg)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'rotateY(-10deg) rotateX(8deg)'}
              >
                <HeartPulse className="h-6 w-6 text-white absolute inset-0 m-auto animate-pulse" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-zinc-900 text-lg tracking-tight">
                St. Jude <span className="text-red-600">Medical</span>
              </span>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Hospital & Care System</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[11px] font-bold text-zinc-500">
            {['#about','#departments','#facilities','#contact'].map((href, i) => (
              <a key={href} href={href} className="hover:text-red-600 transition-colors relative group">
                {['About','Departments','Facilities','Emergency'][i]}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 group-hover:w-full transition-all duration-300 rounded-full" />
              </a>
            ))}
          </nav>

          {isAuthenticated ? (
            <Link to={getDashboardPath()}
              className="inline-flex items-center gap-2 rounded-xl text-xs font-extrabold text-white px-4 py-2 shadow-md shadow-red-200 transition-all hover:scale-105 hover:shadow-red-300"
              style={{ background: 'linear-gradient(135deg,#dc2626,#be123c)' }}>
              <UserCheck className="h-4 w-4" /> EHR Workspace
            </Link>
          ) : (
            <Link to="/login"
              className="inline-flex items-center gap-2 rounded-xl text-xs font-extrabold text-white px-4 py-2 shadow-md shadow-red-200 transition-all hover:scale-105 hover:shadow-red-300 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#dc2626,#be123c)' }}>
              <Lock className="h-3.5 w-3.5" /> Staff Portal Login
            </Link>
          )}
        </div>
      </header>

      {/* ═══════════ HERO ══════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pt-10 pb-16 text-center overflow-hidden">
        {/* 3-D perspective grid floor */}
        <div className="absolute inset-0 flex items-end justify-center overflow-hidden opacity-20 pointer-events-none">
          <div style={{
            width: '140%', height: '55%',
            backgroundImage: 'linear-gradient(rgba(220,38,38,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(220,38,38,0.6) 1px,transparent 1px)',
            backgroundSize: '50px 50px',
            transform: 'perspective(500px) rotateX(65deg)',
            transformOrigin: 'bottom center',
            maskImage: 'linear-gradient(to top, black 20%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 80%)'
          }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto space-y-7">
          {/* Glowing chip */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1 border text-xs font-bold text-red-600 animate-float"
            style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.25)' }}>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <Sparkles className="h-3.5 w-3.5 text-red-500" />
            St. Jude Medical Center • 24/7 Acute Healthcare Excellence
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-zinc-900">
            Excellence in<br />
            <span style={{
              background: 'linear-gradient(135deg,#dc2626 0%,#be123c 40%,#f87171 70%,#dc2626 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 16px rgba(220,38,38,0.25))'
            }}>
              Clinical Medicine.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-zinc-500 max-w-2xl mx-auto leading-relaxed font-medium">
            A premier multi-specialty acute care hospital delivering world-class diagnostics, proactive recovery planning, and cutting-edge clinical treatment — powered by a real-time clinical intelligence system.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <a href="#departments"
              className="inline-flex items-center gap-2 rounded-2xl text-sm font-extrabold text-white px-7 py-3.5 shadow-lg shadow-red-200 transition-all hover:scale-105 hover:-translate-y-0.5 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#dc2626 0%,#be123c 100%)', boxShadow: '0 4px 24px rgba(220,38,38,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
              Explore Departments <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/login"
              className="inline-flex items-center gap-2 rounded-2xl text-sm font-bold text-zinc-700 px-7 py-3.5 transition-all hover:scale-105 hover:border-red-300 hover:-translate-y-0.5 active:scale-95 bg-white border border-zinc-200 shadow-sm hover:shadow-md">
              <Lock className="h-4 w-4 text-red-500" /> Staff Portal Login
            </Link>
          </div>

          {/* Floating 3-D Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 max-w-4xl mx-auto">
            <StatPill value="450+"    label="Active Beds"        delay={0}   color="red"   />
            <StatPill value="1,420+"  label="Annual Admissions"  delay={0.6} color="gray"  />
            <StatPill value="91.8%"   label="Recovery Rate"      delay={1.2} color="amber" />
            <StatPill value="4.8 / 5" label="Quality Rating"     delay={1.8} color="rose"  />
          </div>
        </div>
      </section>

      {/* ═══════════ ABOUT ══════════════════════════════════════════════ */}
      <section id="about" className="py-24 px-4 relative overflow-hidden bg-zinc-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          <div className="space-y-6">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-1.5">
              <Flame className="h-4 w-4" /> About St. Jude Medical Center
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-zinc-900">
              Patient-First.<br /><span className="text-red-600">World-Class.</span>
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Established as a cornerstone of medical excellence, St. Jude Medical Center delivers integrated acute inpatient and ambulatory healthcare. Our dedicated physicians, board-certified surgeons, and specialized nursing staff collaborate seamlessly across all departments to deliver exceptional outcomes.
            </p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              With a state-of-the-art telemetry infrastructure, we emphasize continuous recovery monitoring, personalized medication reconciliation, and post-discharge follow-ups — minimizing readmission risks and maximizing long-term patient health outcomes.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {["24/7 Level-1 Emergency & Trauma","Sub-Specialty Catheterization Labs","Integrated Digital EHR Telemetry","Accredited Inpatient Dialysis Suites"].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <CheckCircle2 className="h-4 w-4 text-red-500 shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>

          {/* 3-D Infrastructure Card Stack */}
          <div className="relative" style={{ perspective: '1200px' }}>
            <div className="absolute inset-0 rounded-3xl opacity-20"
              style={{ background: 'linear-gradient(135deg,#dc2626,#fca5a5)', transform: 'translateZ(-30px) scale(0.97) translateY(12px)', filter: 'blur(20px)' }} />

            <TiltCard className="relative rounded-3xl border border-zinc-200 p-8 space-y-5 bg-white shadow-xl shadow-zinc-100">
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
              </div>

              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-4">
                <Building2 className="h-5 w-5 text-red-500" /> Hospital Infrastructure
              </h3>

              {[
                { label: 'Total Operational Wards',       value: '6 Specialized Wings',   color: 'text-red-600 bg-red-50 border-red-200' },
                { label: 'Average Inpatient Stay',         value: '4.8 Days',              color: 'text-zinc-700 bg-zinc-100 border-zinc-200' },
                { label: 'Bed Occupancy Management',       value: '81.3% Capacity',        color: 'text-amber-600 bg-amber-50 border-amber-200' },
                { label: 'Physician-to-Patient Ratio',     value: '1:4 ICU / 1:8 Ward',   color: 'text-red-600 bg-red-50 border-red-200' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center p-3.5 rounded-xl border border-zinc-100 bg-zinc-50 hover:border-red-200 transition-colors">
                  <span className="text-xs font-bold text-zinc-800">{label}</span>
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${color}`}>{value}</span>
                </div>
              ))}
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ═══════════ DEPARTMENTS ══════════════════════════════════════ */}
      <section id="departments" className="py-24 px-4 relative bg-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent" />

        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Centers of Excellence</span>
            <h2 className="text-3xl sm:text-5xl font-black text-zinc-900 tracking-tight">
              Hospital Clinical Departments
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto">Specialized inpatient medical wards and diagnostic clinics built for exceptional care.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: '1400px' }}>
            {departments.map((dept) => {
              const Icon = dept.icon;
              return (
                <TiltCard key={dept.name}
                  className="rounded-2xl border border-zinc-200 p-6 flex flex-col gap-4 bg-white shadow-sm hover:shadow-md cursor-default"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-300/60 to-transparent rounded-t-2xl pointer-events-none" />

                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center border border-red-200 shadow-sm"
                      style={{ background: 'linear-gradient(135deg,rgba(220,38,38,0.08),rgba(190,18,60,0.04))' }}>
                      <Icon className="h-5 w-5 text-red-500" />
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 uppercase tracking-wider">
                      {dept.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 leading-snug">{dept.name}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{dept.description}</p>

                  <div className="rounded-xl px-3 py-2 border border-red-100 bg-red-50 text-[11px] font-bold text-red-700">
                    📊 {dept.metrics}
                  </div>

                  <div className="border-t border-zinc-100 pt-3 space-y-1.5">
                    <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">Clinical Services</span>
                    {dept.treatments.map(t => (
                      <div key={t} className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600">
                        <CheckCircle2 className="h-3 w-3 text-red-500 shrink-0" /> {t}
                      </div>
                    ))}
                  </div>
                </TiltCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ FACILITIES ═══════════════════════════════════════ */}
      <section id="facilities" className="py-24 px-4 relative bg-zinc-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent" />

        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Quality Care & Follow-Up</span>
            <h2 className="text-3xl sm:text-5xl font-black text-zinc-900 tracking-tight">Inpatient & Outpatient Services</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ perspective: '1200px' }}>
            {[
              { icon: HeartPulse, title: 'Post-Discharge Follow-Up',    desc: 'Dedicated nursing check-ins within 48 hours of discharge to review medications, vital signs, and diet compliance to prevent readmission.' },
              { icon: Activity,   title: 'Telemetry & Continuous Vitals', desc: 'Automated cardiac monitors and ambulatory blood pressure streams alert on-duty physicians immediately to any abnormal vital changes.' },
              { icon: ShieldCheck, title: 'Clinical Safety Standards',   desc: 'Rigorous infection control, strict medication verification, and proactive clinical audits ensure maximum inpatient safety at all times.' },
            ].map(({ icon: Icon, title, desc }) => (
              <TiltCard key={title}
                className="relative rounded-2xl border border-zinc-200 p-7 text-center space-y-4 bg-white shadow-sm hover:shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-300/60 to-transparent rounded-t-2xl pointer-events-none" />
                <div className="h-14 w-14 mx-auto rounded-2xl flex items-center justify-center border border-red-200 shadow-md shadow-red-100"
                  style={{ background: 'linear-gradient(135deg,rgba(220,38,38,0.08),rgba(190,18,60,0.04))' }}>
                  <Icon className="h-7 w-7 text-red-500" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CONTACT / EMERGENCY ════════════════════════════ */}
      <section id="contact" className="py-24 px-4 relative overflow-hidden bg-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-60 rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse,#dc2626 0%,transparent 70%)' }} />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-red-600 border border-red-200 bg-red-50">
              <Ambulance className="h-3.5 w-3.5 animate-bounce" /> 24/7 Level-1 Emergency Hotline
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
              Emergency &<br /><span className="text-red-600">Hospital Contacts</span>
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              For life-threatening emergencies, dial 911 immediately or visit our 24-hour Emergency Department intake bay at the main campus entrance.
            </p>

            <div className="space-y-3">
              {[
                { icon: Phone,  label: 'Hospital Switchboard & Appointments', value: '+1 (555) 234-5678' },
                { icon: MapPin, label: 'Main Campus Address',                 value: '1042 Medical Center Way, Seattle, WA 98101' },
                { icon: Clock,  label: 'General Ward Visiting Hours',         value: '08:00 AM – 08:00 PM Daily' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:border-red-200 transition-colors">
                  <Icon className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-bold text-zinc-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3-D Staff Portal Card */}
          <div className="relative" style={{ perspective: '900px' }}>
            <div className="absolute inset-0 rounded-3xl opacity-25"
              style={{ background: 'linear-gradient(135deg,#fca5a5,#fecdd3)', transform: 'scale(0.95) translateY(16px)', filter: 'blur(28px)' }} />

            <TiltCard className="relative rounded-3xl border border-zinc-200 p-8 space-y-6 bg-white shadow-xl shadow-zinc-100">
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
              </div>

              <div>
                <p className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Lock className="h-3.5 w-3.5" /> Medical Staff Gateway
                </p>
                <h3 className="text-xl font-black text-zinc-900">Clinical EHR & Administration Portal</h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  Authorized clinicians, physicians, and admin staff sign in to access live patient worksheets, telemetry charts, and operational analytics.
                </p>
              </div>

              <div className="space-y-2.5 text-xs border-t border-zinc-100 pt-5">
                {[
                  { role: 'Doctor Portal',  email: 'doctor@healthforecast.ai',     color: 'text-red-600' },
                  { role: 'Hospital Admin', email: 'admin@healthforecast.ai',      color: 'text-zinc-700' },
                  { role: 'Research Lab',   email: 'researcher@healthforecast.ai', color: 'text-red-600' },
                ].map(({ role, email, color }) => (
                  <div key={role} className="flex justify-between items-center py-1.5 border-b border-zinc-100 last:border-0">
                    <span className="text-zinc-400 font-bold">{role}:</span>
                    <span className={`font-extrabold ${color}`}>{email}</span>
                  </div>
                ))}
              </div>

              <Link to="/login"
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-extrabold text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-200"
                style={{ background: 'linear-gradient(135deg,#dc2626,#be123c)', boxShadow: '0 4px 20px rgba(220,38,38,0.25), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
                <Lock className="h-4 w-4" /> Sign In to Hospital Portal
              </Link>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ══════════════════════════════════════════ */}
      <footer className="border-t border-zinc-200 py-8 px-4 bg-zinc-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-700 font-bold">
            <HeartPulse className="h-4 w-4 text-red-500" />
            St. Jude Medical Center
            <span className="text-zinc-400 font-normal">| HealthForecast Hospital Care System</span>
          </div>
          <p>&copy; 2026 St. Jude Medical Center. All rights reserved. Emergency Care 24/7.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
