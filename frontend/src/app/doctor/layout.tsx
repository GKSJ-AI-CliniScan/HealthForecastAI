"use client";

import "./doctor.css";
import { HeartPulse, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [showLogout, setShowLogout] = useState(false);

  const handleSignOut = () => {
    window.location.href = "/login";
  };

  return (
    <div className="doctor-layout">

      {/* ================= HEADER ================= */}

      <header className="doctor-header">

        {/* ================= BRAND ================= */}

        <div className="doctor-brand">

          <div className="doctor-logo">
            <HeartPulse size={24} strokeWidth={2.5} />
          </div>

          <div>
            <h1>
              HealthForecast <span>AI</span>
            </h1>

            <p>HEALTHCARE INTELLIGENCE</p>
          </div>

        </div>


        {/* ================= RIGHT PROFILE ================= */}

        <div className="doctor-profile">

          <span className="doctor-notification">
            🔔
          </span>


          {/* PROFILE BUTTON */}

          <button
            type="button"
            className="doctor-profile-button"
            onClick={() => setShowLogout(!showLogout)}
          >

            

            <div className="doctor-profile-info">
              <h3>Doctor</h3>
              <p>Healthcare Team</p>
            </div>

          </button>


          {/* ================= SIGN OUT DROPDOWN ================= */}

          {showLogout && (
            <div className="doctor-logout-menu">

              <button
                type="button"
                className="doctor-logout-button"
                onClick={handleSignOut}
              >

                <LogOut size={16} />

                <span>Sign out</span>

              </button>

            </div>
          )}

        </div>

      </header>


      {/* ================= BODY ================= */}

      <div className="doctor-body">

        {/* ================= SIDEBAR ================= */}

        <aside className="doctor-sidebar">

          <p className="sidebar-title">
            MAIN MENU
          </p>


          {/* DASHBOARD */}

          <a
            href="/doctor"
            className={`doctor-menu ${
              pathname === "/doctor" ? "active" : ""
            }`}
          >
            Dashboard
          </a>


          {/* PATIENTS */}

          <a
            href="/doctor/patients"
            className={`doctor-menu ${
              pathname === "/doctor/patients" ? "active" : ""
            }`}
          >
            Patients
          </a>


          {/* MEDICAL HISTORY */}

          <a
            href="/doctor/medical-history"
            className={`doctor-menu ${
              pathname === "/doctor/medical-history" ? "active" : ""
            }`}
          >
            Medical History
          </a>


          {/* TREATMENTS */}

          <a
            href="/doctor/treatments"
            className={`doctor-menu ${
              pathname === "/doctor/treatments" ? "active" : ""
            }`}
          >
            Treatments
          </a>


          {/* ADMISSIONS */}

          <a
            href="/doctor/admissions"
            className={`doctor-menu ${
              pathname === "/doctor/admissions" ? "active" : ""
            }`}
          >
            Admissions
          </a>


          {/* ANALYTICS */}

          <a
            href="/doctor/analytics"
            className={`doctor-menu ${
              pathname === "/doctor/analytics" ? "active" : ""
            }`}
          >
            Analytics
          </a>


          {/* REPORTS */}

          <a
            href="/doctor/reports"
            className={`doctor-menu ${
              pathname === "/doctor/reports" ? "active" : ""
            }`}
          >
            Reports
          </a>


          <div className="sidebar-line" />


          {/* ================= SYSTEM ================= */}

          <p className="sidebar-title">
            SYSTEM
          </p>


          {/* SETTINGS */}

          <a
            href="/doctor/settings"
            className={`doctor-menu ${
              pathname === "/doctor/settings" ? "active" : ""
            }`}
          >
            Settings
          </a>

        </aside>


        {/* ================= PAGE CONTENT ================= */}

        <main className="doctor-content">
          {children}
        </main>

      </div>

    </div>
  );
}