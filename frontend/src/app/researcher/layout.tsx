"use client";

import "./researcher.css";

import {
  HeartPulse,
  Bell,
  ChevronDown,
  LayoutDashboard,
  BarChart3,
  Database,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResearcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [showProfile, setShowProfile] = useState(false);

  const isActive = (path: string) => {
    if (path === "/researcher") {
      return pathname === "/researcher";
    }

    return pathname.startsWith(path);
  };

  const handleSignOut = () => {
    window.location.href = "/login";
  };

  return (
    <div className="researcher-layout">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="researcher-header">

        {/* BRAND */}

        <div className="researcher-brand">

          <div className="researcher-logo">
            <HeartPulse
              size={28}
              strokeWidth={2.5}
            />
          </div>

          <div className="researcher-brand-text">

            <h1>
              HealthForecast <span>AI</span>
            </h1>

            <p>
              HEALTHCARE INTELLIGENCE
            </p>

          </div>

        </div>


        {/* HEADER RIGHT */}

        <div className="researcher-header-right">

          <button
            type="button"
            className="researcher-notification"
          >
            <Bell size={22} />

            <span className="researcher-notification-dot" />
          </button>


          <div className="researcher-header-divider" />


          {/* PROFILE */}

          <div className="researcher-profile-wrapper">

            <button
              type="button"
              className="researcher-profile-button"
              onClick={() =>
                setShowProfile(!showProfile)
              }
            >

              <div className="researcher-avatar">
                HR
              </div>

              <div className="researcher-profile-info">

                <strong>
                  Healthcare Researcher
                </strong>

                <small>
                  Researcher
                </small>

              </div>

              <ChevronDown
                size={17}
                className={
                  showProfile
                    ? "researcher-profile-arrow open"
                    : "researcher-profile-arrow"
                }
              />

            </button>


            {showProfile && (
              <div className="researcher-profile-menu">

                <button
                  type="button"
                  onClick={() =>
                    router.push("/researcher/settings")
                  }
                >
                  <Settings size={16} />

                  <span>
                    Profile Settings
                  </span>
                </button>


                <button
                  type="button"
                  className="researcher-logout"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />

                  <span>
                    Sign out
                  </span>
                </button>

              </div>
            )}

          </div>

        </div>

      </header>


      {/* =====================================================
          BODY
      ===================================================== */}

      <div className="researcher-body">

        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="researcher-sidebar">

          <p className="researcher-sidebar-title">
            HEALTHCARE RESEARCHER
          </p>


          {/* DASHBOARD */}

          <nav className="researcher-sidebar-nav">

            <a
              href="/researcher"
              className={`researcher-menu ${
                isActive("/researcher")
                  ? "active"
                  : ""
              }`}
            >

              <LayoutDashboard size={21} />

              <span>
                Dashboard
              </span>

            </a>

          </nav>


          {/* RESEARCH */}

          <p className="researcher-section-title">
            RESEARCH
          </p>


          <nav className="researcher-sidebar-nav">

            <a
              href="/researcher/analytics"
              className={`researcher-menu ${
                isActive("/researcher/analytics")
                  ? "active"
                  : ""
              }`}
            >

              <BarChart3 size={21} />

              <span>
                Research Analytics
              </span>

            </a>


            <a
              href="/researcher/datasets"
              className={`researcher-menu ${
                isActive("/researcher/datasets")
                  ? "active"
                  : ""
              }`}
            >

              <Database size={21} />

              <span>
                Research Datasets
              </span>

            </a>

          </nav>


          {/* REPORTS */}

          <p className="researcher-section-title">
            REPORTS
          </p>


          <nav className="researcher-sidebar-nav">

            <a
              href="/researcher/reports"
              className={`researcher-menu ${
                isActive("/researcher/reports")
                  ? "active"
                  : ""
              }`}
            >

              <FileText size={21} />

              <span>
                Reports
              </span>

            </a>

          </nav>


          {/* SIDEBAR STATUS */}

          <div className="researcher-sidebar-bottom">

            <div className="researcher-security-icon">
              ✓
            </div>

            <div>

              <strong>
                Research Access
              </strong>

              <p>
                Anonymized data access enabled
              </p>

            </div>

          </div>

        </aside>


        {/* ===================================================
            PAGE CONTENT
        =================================================== */}

        <main className="researcher-content">
          {children}
        </main>

      </div>

    </div>
  );
}