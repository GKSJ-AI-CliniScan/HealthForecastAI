"use client";

import "./system-admin.css";

import {
  HeartPulse,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  LogOut,
} from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [showProfile, setShowProfile] = useState(false);

  const isActive = (path: string) => {
    if (path === "/system-admin") {
      return pathname === "/system-admin";
    }

    return pathname.startsWith(path);
  };

  const handleSignOut = () => {
    window.location.href = "/login";
  };

  return (
    <div className="sysadmin-layout">

      {/* HEADER */}
      <header className="sysadmin-header">

        <div className="sysadmin-brand">

          <div className="sysadmin-logo">
            <HeartPulse size={27} strokeWidth={2.5} />
          </div>

          <div className="sysadmin-brand-text">
            <h1>
              HealthForecast <span>AI</span>
            </h1>

            <p>HEALTHCARE INTELLIGENCE</p>
          </div>

        </div>


        <div className="sysadmin-header-right">

          <button
            type="button"
            className="sysadmin-notification"
          >
            <Bell size={21} />

            <span className="sysadmin-notification-dot" />
          </button>


          <div className="sysadmin-header-divider" />


          <div className="sysadmin-profile-wrapper">

            <button
              type="button"
              className="sysadmin-profile-button"
              onClick={() => setShowProfile(!showProfile)}
            >

              <div className="sysadmin-avatar">
                SA
              </div>

              <div className="sysadmin-profile-info">
                <strong>System Administrator</strong>
                <small>System Admin</small>
              </div>

              <ChevronDown
                size={17}
                className={
                  showProfile
                    ? "sysadmin-profile-arrow open"
                    : "sysadmin-profile-arrow"
                }
              />

            </button>


            {showProfile && (
              <div className="sysadmin-profile-menu">

                <button
                  type="button"
                  onClick={() =>
                    router.push("/system-admin/settings")
                  }
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>


                <button
                  type="button"
                  className="sysadmin-logout"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>

              </div>
            )}

          </div>

        </div>

      </header>


      {/* BODY */}
      <div className="sysadmin-body">

        {/* SIDEBAR */}
        <aside className="sysadmin-sidebar">

          <p className="sysadmin-sidebar-title">
            SYSTEM ADMIN
          </p>


          <nav className="sysadmin-sidebar-nav">

            <a
              href="/system-admin"
              className={`sysadmin-menu ${
                isActive("/system-admin")
                  ? "active"
                  : ""
              }`}
            >
              <LayoutDashboard size={21} />
              <span>Dashboard</span>
            </a>


            <a
              href="/system-admin/users"
              className={`sysadmin-menu ${
                isActive("/system-admin/users")
                  ? "active"
                  : ""
              }`}
            >
              <Users size={21} />
              <span>Users & Roles</span>
            </a>


            <a
              href="/system-admin/monitoring"
              className={`sysadmin-menu ${
                isActive("/system-admin/monitoring")
                  ? "active"
                  : ""
              }`}
            >
              <Activity size={21} />
              <span>System Monitoring</span>
            </a>

          </nav>


          {/* BOTTOM SECURITY */}
          <div className="sysadmin-sidebar-bottom">

            <div className="sysadmin-security-icon">
              ✓
            </div>

            <div>
              <strong>System Secure</strong>

              <p>
                All systems are running smoothly
              </p>
            </div>

          </div>

        </aside>


        {/* PAGE CONTENT */}
        <main className="sysadmin-content">
          {children}
        </main>

      </div>

    </div>
  );
}