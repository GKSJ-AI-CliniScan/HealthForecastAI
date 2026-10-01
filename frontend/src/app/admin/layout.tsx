"use client";

import "./admin.css";

import {
  HeartPulse,
  Bell,
  ChevronDown,
  LayoutDashboard,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Search,
} from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({
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
    if (path === "/admin") {
      return pathname === "/admin";
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
    <div className="admin-layout">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="admin-header">

        {/* BRAND */}

        <div className="admin-brand">

          <div className="admin-logo">
            <HeartPulse
              size={29}
              strokeWidth={2.5}
            />
          </div>

          <div className="admin-brand-text">

            <h1>
              HealthForecast <span>AI</span>
            </h1>

            <p>
              HEALTHCARE INTELLIGENCE
            </p>

          </div>

        </div>


        {/* SEARCH */}

        <div className="admin-search">

          <Search size={20} />

          <input
            type="text"
            placeholder="Search hospital analytics..."
          />

        </div>


        {/* HEADER RIGHT */}

        <div className="admin-header-right">

          {/* NOTIFICATION */}

          <button
            type="button"
            className="admin-notification"
          >

            <Bell size={22} />

            <span className="admin-notification-count">
              3
            </span>

          </button>


          {/* PROFILE */}

          <div className="admin-profile-wrapper">

            <button
              type="button"
              className="admin-profile-button"
              onClick={() =>
                setShowProfile(!showProfile)
              }
            >

              <div className="admin-avatar">
                A
              </div>

              <div className="admin-profile-info">

                <h3>
                  Hospital Admin
                </h3>

                <p>
                  Administrator
                </p>

              </div>

              <ChevronDown
                size={17}
                className={
                  showProfile
                    ? "admin-profile-arrow admin-profile-arrow-open"
                    : "admin-profile-arrow"
                }
              />

            </button>


            {/* PROFILE DROPDOWN */}

            {showProfile && (
              <div className="admin-profile-menu">

                <button
                  type="button"
                  onClick={() =>
                    router.push("/admin/settings")
                  }
                >
                  <Settings size={16} />
                  Profile Settings
                </button>

                <button
                  type="button"
                  className="admin-logout-item"
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
          BODY
      ================================================= */}

      <div className="admin-body">


        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="admin-sidebar">

          {/* SIDEBAR TITLE */}

          <p className="admin-sidebar-title">
            HOSPITAL ADMIN
          </p>


          {/* =================================================
              SIDEBAR NAVIGATION

              IMPORTANT:
              All menu items are inside this wrapper.
          ================================================= */}

          <nav className="admin-sidebar-nav">


            {/* DASHBOARD */}

            <a
              href="/admin"
              className={`admin-menu ${
                isActive("/admin")
                  ? "active"
                  : ""
              }`}
            >

              <LayoutDashboard size={21} />

              <span>
                Dashboard
              </span>

            </a>


            {/* HOSPITAL ANALYTICS */}

            <a
              href="/admin/analytics"
              className={`admin-menu ${
                isActive("/admin/analytics")
                  ? "active"
                  : ""
              }`}
            >

              <BarChart3 size={21} />

              <span>
                Hospital Analytics
              </span>

            </a>


            {/* REPORTS */}

            <a
              href="/admin/reports"
              className={`admin-menu ${
                isActive("/admin/reports")
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


          {/* SIDEBAR BOTTOM */}

          

        </aside>


        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main className="admin-content">

          {children}

        </main>

      </div>

    </div>
  );
}