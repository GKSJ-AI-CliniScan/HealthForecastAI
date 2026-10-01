"use client";

import Link from "next/link";

import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  HeartPulse,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";


/* =========================================================
   MOCK DATA
========================================================= */

const departments = [
  {
    name: "Cardiology",
    patients: 38,
    highRisk: 4,
    recovery: 92,
  },
  {
    name: "General Medicine",
    patients: 46,
    highRisk: 3,
    recovery: 88,
  },
  {
    name: "Neurology",
    patients: 21,
    highRisk: 2,
    recovery: 94,
  },
  {
    name: "Orthopedics",
    patients: 15,
    highRisk: 3,
    recovery: 84,
  },
];


const activities = [
  {
    title: "Patient outcome report generated",
    department: "Hospital Analytics",
    time: "10 min ago",
    icon: <FileText size={16} />,
  },
  {
    title: "Readmission analysis updated",
    department: "Hospital Analytics",
    time: "35 min ago",
    icon: <BarChart3 size={16} />,
  },
  {
    title: "Treatment effectiveness reviewed",
    department: "Clinical Operations",
    time: "1 hour ago",
    icon: <HeartPulse size={16} />,
  },
  {
    title: "Hospital performance data updated",
    department: "Administration",
    time: "2 hours ago",
    icon: <Activity size={16} />,
  },
];


export default function AdminDashboard() {

  return (
    <div className="admin-dashboard">


      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <div className="admin-breadcrumb">

        <span>
          Hospital Admin
        </span>

        <span>/</span>

        <strong>
          Dashboard
        </strong>

      </div>


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="admin-page-header">

        <div>

          <p className="admin-eyebrow">
            HOSPITAL OVERVIEW
          </p>

          <h1>
            Hospital Dashboard
          </h1>

          <p>
            Monitor hospital performance, patient outcomes,
            and readmission trends.
          </p>

        </div>


        <div className="admin-header-actions">

          <button
            type="button"
            className="admin-secondary-button"
          >
            <RefreshCw size={15} />

            Refresh
          </button>


          <Link
            href="/admin/reports"
            className="admin-primary-button"
          >
            <FileText size={15} />

            Generate Report
          </Link>

        </div>

      </div>


      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div className="admin-stats">


        {/* TOTAL PATIENTS */}

        <div className="admin-stat-card">

          <div className="admin-stat-card-content">

            <div className="admin-stat-icon">
              <Users size={21} />
            </div>

            <div>

              <p>
                Total Patients
              </p>

              <h2>
                1,248
              </h2>

              <span>
                +8.4% this month
              </span>

            </div>

          </div>

        </div>


        {/* HIGH RISK */}

        <div className="admin-stat-card">

          <div className="admin-stat-card-content">

            <div className="admin-stat-icon">
              <ShieldAlert size={21} />
            </div>

            <div>

              <p>
                High Risk Patients
              </p>

              <h2>
                84
              </h2>

              <span>
                6.7% of total patients
              </span>

            </div>

          </div>

        </div>


        {/* READMISSION */}

        <div className="admin-stat-card">

          <div className="admin-stat-card-content">

            <div className="admin-stat-icon">
              <Activity size={21} />
            </div>

            <div>

              <p>
                Readmission Rate
              </p>

              <h2>
                10.2%
              </h2>

              <span>
                Based on recent admissions
              </span>

            </div>

          </div>

        </div>


        {/* RECOVERY */}

        <div className="admin-stat-card">

          <div className="admin-stat-card-content">

            <div className="admin-stat-icon">
              <CheckCircle2 size={21} />
            </div>

            <div>

              <p>
                Recovery Rate
              </p>

              <h2>
                82%
              </h2>

              <span>
                Across hospital departments
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          PERFORMANCE + READMISSION
      ================================================= */}

      <div className="admin-dashboard-grid">


        {/* ================= PERFORMANCE ================= */}

        <div className="admin-card">

          <div className="admin-card-header">

            <div>

              <h2>
                Hospital Performance
              </h2>

              <p>
                Current hospital-wide performance indicators
              </p>

            </div>

            <Link href="/admin/analytics">

              View Analytics

              <ArrowRight size={14} />

            </Link>

          </div>


          <div className="admin-performance-content">


            <div className="admin-performance-main">


              {/* CIRCLE */}

              <div className="admin-performance-circle">

                <div className="admin-performance-circle-inner">

                  <strong>
                    86%
                  </strong>

                  <span>
                    Overall
                  </span>

                </div>

              </div>


              {/* DESCRIPTION */}

              <div className="admin-performance-summary">

                <h3>
                  Hospital Performance
                </h3>

                <p>
                  Overall performance based on patient outcomes,
                  recovery, readmission, and treatment effectiveness.
                </p>

                <div className="admin-performance-status">

                  <span className="admin-status-dot"></span>

                  Performance is stable

                </div>

              </div>

            </div>


            {/* METRICS */}

            <div className="admin-performance-metrics">

              <div className="admin-performance-metric">

                <span>
                  Patient Outcomes
                </span>

                <strong>
                  88%
                </strong>

              </div>


              <div className="admin-performance-metric">

                <span>
                  Treatment Effectiveness
                </span>

                <strong>
                  91%
                </strong>

              </div>


              <div className="admin-performance-metric">

                <span>
                  Recovery Rate
                </span>

                <strong>
                  82%
                </strong>

              </div>


              <div className="admin-performance-metric">

                <span>
                  Readmission Control
                </span>

                <strong>
                  79%
                </strong>

              </div>

            </div>

          </div>

        </div>


        {/* ================= READMISSION ================= */}

        <div className="admin-card">

          <div className="admin-card-header">

            <div>

              <h2>
                Readmission Overview
              </h2>

              <p>
                Recent hospital readmission trend
              </p>

            </div>

            <BarChart3
              size={19}
              color="#092957"
            />

          </div>


          <div className="admin-readmission-summary">

            <div>

              <span>
                Current Rate
              </span>

              <strong>
                10.2%
              </strong>

            </div>


            <div className="admin-readmission-change">

              <span>
                Compared to last month
              </span>

              <strong>
                ↓ 1.4%
              </strong>

            </div>

          </div>


          <div className="admin-readmission-chart">

            <div className="admin-chart-y-axis">

              <span>15%</span>
              <span>10%</span>
              <span>5%</span>
              <span>0%</span>

            </div>


            <div className="admin-chart-area">

              <div
                className="admin-chart-bar-wrapper"
              >

                <div
                  className="admin-chart-bar"
                  style={{ height: "72%" }}
                />

                <span>
                  May
                </span>

              </div>


              <div
                className="admin-chart-bar-wrapper"
              >

                <div
                  className="admin-chart-bar"
                  style={{ height: "64%" }}
                />

                <span>
                  Jun
                </span>

              </div>


              <div
                className="admin-chart-bar-wrapper"
              >

                <div
                  className="admin-chart-bar"
                  style={{ height: "59%" }}
                />

                <span>
                  Jul
                </span>

              </div>


              <div
                className="admin-chart-bar-wrapper"
              >

                <div
                  className="admin-chart-bar"
                  style={{ height: "53%" }}
                />

                <span>
                  Aug
                </span>

              </div>


              <div
                className="admin-chart-bar-wrapper"
              >

                <div
                  className="admin-chart-bar active"
                  style={{ height: "48%" }}
                />

                <span>
                  Sep
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          DEPARTMENT PERFORMANCE
      ================================================= */}

      <div className="admin-card admin-department-card">

        <div className="admin-card-header">

          <div>

            <h2>
              Department Performance
            </h2>

            <p>
              Overview of patient volume, risk levels,
              and recovery across departments.
            </p>

          </div>

          <Link href="/admin/analytics">

            Full Analytics

            <ArrowRight size={14} />

          </Link>

        </div>


        <div className="admin-department-table-wrapper">

          <table className="admin-department-table">

            <thead>

              <tr>

                <th>
                  Department
                </th>

                <th>
                  Patients
                </th>

                <th>
                  High Risk
                </th>

                <th>
                  Recovery Rate
                </th>

                <th>
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              {departments.map((department) => (

                <tr key={department.name}>

                  <td>

                    <div className="admin-department-name">

                      <div className="admin-department-icon">
                        <HeartPulse size={15} />
                      </div>

                      <strong>
                        {department.name}
                      </strong>

                    </div>

                  </td>


                  <td>
                    {department.patients}
                  </td>


                  <td>

                    <span
                      className={`admin-risk-badge ${
                        department.highRisk >= 3
                          ? "high"
                          : "low"
                      }`}
                    >
                      {department.highRisk}
                    </span>

                  </td>


                  <td>

                    <div className="admin-recovery">

                      <div className="admin-recovery-bar">

                        <span
                          style={{
                            width: `${department.recovery}%`,
                          }}
                        />

                      </div>

                      <strong>
                        {department.recovery}%
                      </strong>

                    </div>

                  </td>


                  <td>

                    <span className="admin-department-status">
                      ● Stable
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>


      {/* =================================================
          BOTTOM SECTION
      ================================================= */}

      <div className="admin-bottom-grid">


        {/* ================= RECENT ACTIVITY ================= */}

        <div className="admin-card">

          <div className="admin-card-header">

            <div>

              <h2>
                Recent Activity
              </h2>

              <p>
                Latest hospital administrative activity
              </p>

            </div>

          </div>


          <div className="admin-activity-list">

            {activities.map((activity, index) => (

              <div
                className="admin-activity-item"
                key={index}
              >

                <div className="admin-activity-icon">
                  {activity.icon}
                </div>

                <div className="admin-activity-content">

                  <strong>
                    {activity.title}
                  </strong>

                  <span>
                    {activity.department}
                  </span>

                </div>

                <time>
                  {activity.time}
                </time>

              </div>

            ))}

          </div>

        </div>


        {/* ================= HOSPITAL SUMMARY ================= */}

        <div className="admin-card">

          <div className="admin-card-header">

            <div>

              <h2>
                Hospital Summary
              </h2>

              <p>
                Current operational overview
              </p>

            </div>

          </div>


          <div className="admin-summary-list">


            <div className="admin-summary-row">

              <div>

                <span>
                  Active Departments
                </span>

                <strong>
                  4
                </strong>

              </div>

              <CheckCircle2 size={18} />

            </div>


            <div className="admin-summary-row">

              <div>

                <span>
                  Patients Under Treatment
                </span>

                <strong>
                  120
                </strong>

              </div>

              <Activity size={18} />

            </div>


            <div className="admin-summary-row">

              <div>

                <span>
                  Patients Requiring Attention
                </span>

                <strong>
                  18
                </strong>

              </div>

              <ShieldAlert size={18} />

            </div>


            <div className="admin-summary-row">

              <div>

                <span>
                  Reports This Month
                </span>

                <strong>
                  8
                </strong>

              </div>

              <FileText size={18} />

            </div>


          </div>

        </div>

      </div>


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="admin-dashboard-footer">

        <span>
          HealthForecast AI
        </span>

        <span>
          Hospital Administration • Secure Healthcare Intelligence
        </span>

      </footer>

    </div>
  );
}