"use client";

import "./doctor.css";

import {
  HeartPulse,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Users,
  ShieldCheck,
  TrendingUp,
  Lightbulb,
  Pill,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  Search,
} from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [showProfile, setShowProfile] = useState(false);

  /* =====================================================
     ACTIVE SIDEBAR
  ===================================================== */

  const isActive = (path: string) => {
    if (path === "/doctor") {
      return pathname === "/doctor";
    }

    return pathname.startsWith(path);
  };

  /* =====================================================
     SIGN OUT
  ===================================================== */

  const handleSignOut = () => {
    window.location.href = "/login";
  };

  return (
    <div className="doctor-layout">

      {/* =================================================
          TOP NAVBAR
      ================================================= */}

      <header className="doctor-header">

        {/* ================= LOGO ================= */}

        <div className="doctor-brand">

          <div className="doctor-logo">
            <HeartPulse
              size={29}
              strokeWidth={2.5}
            />
          </div>

          <div className="doctor-brand-text">

            <h1>
              HealthForecast <span>AI</span>
            </h1>

            <p>
              HEALTHCARE INTELLIGENCE
            </p>

          </div>

        </div>


        {/* ================= SEARCH ================= */}

        <div className="doctor-search">

          <Search size={20} />

          <input
            type="text"
            placeholder="Search patients by name or ID..."
          />

        </div>


        {/* ================= RIGHT SIDE ================= */}

        <div className="doctor-header-right">

          {/* Notification */}

          <button
            type="button"
            className="doctor-notification"
          >

            <Bell size={22} />

            <span className="notification-count">
              3
            </span>

          </button>


          {/* ================= PROFILE ================= */}

          <div className="doctor-profile-wrapper">

            <button
              type="button"
              className="doctor-profile-button"
              onClick={() =>
                setShowProfile(!showProfile)
              }
            >

              <div className="doctor-avatar">
                D
              </div>

              <div className="doctor-profile-info">

                <h3>
                  Doctor
                </h3>

                <p>
                  Healthcare Team
                </p>

              </div>

              <ChevronDown
                size={17}
                className={
                  showProfile
                    ? "profile-arrow profile-arrow-open"
                    : "profile-arrow"
                }
              />

            </button>


            {/* PROFILE DROPDOWN */}

            {showProfile && (
              <div className="doctor-profile-menu">

                <button
                  type="button"
                  onClick={() =>
                    router.push("/doctor/settings")
                  }
                >

                  <Settings size={16} />

                  Profile Settings

                </button>


                <button
                  type="button"
                  className="logout-item"
                  onClick={handleSignOut}
                >

                  <LogOut size={16} />

                  Sign out

                </button>

              </div>
            )}

          </div>

        </div>

      </header>


      {/* =================================================
          DOCTOR BODY
      ================================================= */}

      <div className="doctor-body">


        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="doctor-sidebar">


          {/* ================= MAIN ================= */}

          <p className="sidebar-title">
            MAIN
          </p>


          {/* DASHBOARD */}

          <a
            href="/doctor"
            className={`doctor-menu ${
              isActive("/doctor")
                ? "active"
                : ""
            }`}
          >

            <LayoutDashboard size={21} />

            <span>
              Dashboard
            </span>

          </a>


          {/* PATIENTS */}

          <a
            href="/doctor/patients"
            className={`doctor-menu ${
              isActive("/doctor/patients")
                ? "active"
                : ""
            }`}
          >

            <Users size={21} />

            <span>
              Patients
            </span>

          </a>


          {/* =================================================
              AI INTELLIGENCE
          ================================================= */}

          <p className="sidebar-title ai-section">
            AI INTELLIGENCE
          </p>


          {/* RISK ASSESSMENT */}

          <a
            href="/doctor/risk-assessment"
            className={`doctor-menu ${
              isActive("/doctor/risk-assessment")
                ? "active"
                : ""
            }`}
          >

            <ShieldCheck size={21} />

            <span>
              Risk Assessment
            </span>

          </a>


          {/* READMISSION FORECAST */}

          <a
            href="/doctor/readmission-forecast"
            className={`doctor-menu ${
              isActive("/doctor/readmission-forecast")
                ? "active"
                : ""
            }`}
          >

            <TrendingUp size={21} />

            <span>
              Readmission Forecast
            </span>

          </a>


          {/* CLINICAL INSIGHTS */}

          <a
            href="/doctor/clinical-insights"
            className={`doctor-menu ${
              isActive("/doctor/clinical-insights")
                ? "active"
                : ""
            }`}
          >

            <Lightbulb size={21} />

            <span>
              Clinical Insights
            </span>

          </a>


          {/* TREATMENT EFFECTIVENESS */}

          <a
            href="/doctor/treatment-effectiveness"
            className={`doctor-menu ${
              isActive("/doctor/treatment-effectiveness")
                ? "active"
                : ""
            }`}
          >

            <Pill size={21} />

            <span>
              Treatment Effectiveness
            </span>

          </a>


          {/* =================================================
              ANALYTICS
          ================================================= */}

          <p className="sidebar-title separated-section">
            ANALYTICS
          </p>


          {/* ANALYTICS */}

          <a
            href="/doctor/analytics"
            className={`doctor-menu ${
              isActive("/doctor/analytics")
                ? "active"
                : ""
            }`}
          >

            <BarChart3 size={21} />

            <span>
              Analytics
            </span>

          </a>


          {/* REPORTS */}

          <a
            href="/doctor/reports"
            className={`doctor-menu ${
              isActive("/doctor/reports")
                ? "active"
                : ""
            }`}
          >

            <FileText size={21} />

            <span>
              Reports
            </span>

          </a>


          {/* =================================================
              SYSTEM
          ================================================= */}

          <p className="sidebar-title separated-section system-section">
            SYSTEM
          </p>


          {/* SETTINGS */}

          <a
            href="/doctor/settings"
            className={`doctor-menu ${
              isActive("/doctor/settings")
                ? "active"
                : ""
            }`}
          >

            <Settings size={21} />

            <span>
              Settings
            </span>

          </a>


          {/* HELP */}

          <a
            href="/doctor/help"
            className={`doctor-menu ${
              isActive("/doctor/help")
                ? "active"
                : ""
            }`}
          >

            <HelpCircle size={21} />

            <span>
              Help & Support
            </span>

          </a>


          {/* ================= BOTTOM MARK ================= */}

         

        </aside>


        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main className="doctor-content">

          {children}

        </main>

      </div>

    </div>
  );
}