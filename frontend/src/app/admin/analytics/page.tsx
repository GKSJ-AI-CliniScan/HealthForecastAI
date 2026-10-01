"use client";

import {
  Users,
  Activity,
  CheckCircle2,
  Pill,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";

import "./analytics.css";

const departmentData = [
  {
    name: "Cardiology",
    effectiveness: 91,
  },
  {
    name: "General Medicine",
    effectiveness: 88,
  },
  {
    name: "Neurology",
    effectiveness: 94,
  },
  {
    name: "Orthopedics",
    effectiveness: 84,
  },
];

const performanceData = [
  {
    metric: "Patient Outcomes",
    value: "93%",
    change: "+4.2%",
  },
  {
    metric: "Treatment Effectiveness",
    value: "91%",
    change: "+5.1%",
  },
  {
    metric: "Recovery Rate",
    value: "82%",
    change: "+3.2%",
  },
  {
    metric: "Readmission Control",
    value: "79%",
    change: "+2.1%",
  },
  {
    metric: "Average Length of Stay",
    value: "5.2 days",
    change: "-0.4 days",
  },
];

export default function HospitalAnalyticsPage() {
  return (
    <div className="analytics-page">

      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <div className="analytics-breadcrumb">
        <span>Hospital Admin</span>
        <span>/</span>
        <strong>Hospital Analytics</strong>
      </div>


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="analytics-page-header">

        <div>

          <p className="analytics-eyebrow">
            HOSPITAL ANALYTICS
          </p>

          <h1>
            Hospital Analytics
          </h1>

          <p>
            Analyze hospital-wide patient outcomes,
            readmissions, treatment effectiveness, and performance.
          </p>

        </div>


        <div className="analytics-actions">

          <select className="analytics-date-select">
            <option>Last 30 Days</option>
            <option>Last 3 Months</option>
            <option>Last 6 Months</option>
            <option>Last 12 Months</option>
          </select>


          <button
            type="button"
            className="analytics-export-button"
          >
            <Download size={16} />

            Export Report
          </button>

        </div>

      </div>


      {/* =================================================
          KPI CARDS
      ================================================= */}

      <div className="analytics-kpi-grid">

        {/* TOTAL PATIENTS */}

        <div className="analytics-kpi-card">

          <div className="analytics-kpi-icon blue">
            <Users size={20} />
          </div>

          <div>

            <p>
              Total Patients
            </p>

            <h2>
              1,248
            </h2>

            <span className="analytics-positive">
              <TrendingUp size={13} />
              +8.4% this month
            </span>

          </div>

        </div>


        {/* READMISSION RATE */}

        <div className="analytics-kpi-card">

          <div className="analytics-kpi-icon orange">
            <Activity size={20} />
          </div>

          <div>

            <p>
              Readmission Rate
            </p>

            <h2>
              10.2%
            </h2>

            <span className="analytics-positive">
              <TrendingDown size={13} />
              1.4% improvement
            </span>

          </div>

        </div>


        {/* RECOVERY RATE */}

        <div className="analytics-kpi-card">

          <div className="analytics-kpi-icon green">
            <CheckCircle2 size={20} />
          </div>

          <div>

            <p>
              Recovery Rate
            </p>

            <h2>
              82%
            </h2>

            <span className="analytics-positive">
              <TrendingUp size={13} />
              +3.2% this month
            </span>

          </div>

        </div>


        {/* TREATMENT EFFECTIVENESS */}

        <div className="analytics-kpi-card">

          <div className="analytics-kpi-icon purple">
            <Pill size={20} />
          </div>

          <div>

            <p>
              Treatment Effectiveness
            </p>

            <h2>
              91%
            </h2>

            <span className="analytics-positive">
              <TrendingUp size={13} />
              +5.1% this month
            </span>

          </div>

        </div>

      </div>


      {/* =================================================
          OUTCOME + READMISSION
      ================================================= */}

      <div className="analytics-main-grid">


        {/* =================================================
            PATIENT OUTCOME ANALYSIS
        ================================================= */}

        <section className="analytics-card">

          <div className="analytics-card-header">

            <div>

              <h2>
                Patient Outcome Analysis
              </h2>

              <p>
                Overall patient outcome distribution
              </p>

            </div>

            <BarChart3 size={19} />

          </div>


          <div className="outcome-content">

            {/* DONUT */}

            <div className="outcome-donut">

              <div className="outcome-donut-inner">

                <strong>
                  82%
                </strong>

                <span>
                  Positive
                </span>

              </div>

            </div>


            {/* LEGEND */}

            <div className="outcome-legend">

              <div className="outcome-item">

                <span className="outcome-dot recovered" />

                <div>
                  <strong>Recovered</strong>
                  <span>62%</span>
                </div>

              </div>


              <div className="outcome-item">

                <span className="outcome-dot improving" />

                <div>
                  <strong>Improving</strong>
                  <span>20%</span>
                </div>

              </div>


              <div className="outcome-item">

                <span className="outcome-dot stable" />

                <div>
                  <strong>Stable</strong>
                  <span>12%</span>
                </div>

              </div>


              <div className="outcome-item">

                <span className="outcome-dot readmitted" />

                <div>
                  <strong>Readmitted</strong>
                  <span>6%</span>
                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            READMISSION ANALYTICS
        ================================================= */}

        <section className="analytics-card">

          <div className="analytics-card-header">

            <div>

              <h2>
                Readmission Analytics
              </h2>

              <p>
                Monthly readmission rate
              </p>

            </div>

            <Activity size={19} />

          </div>


          <div className="readmission-chart">

            <div className="chart-y-axis">

              <span>15%</span>
              <span>10%</span>
              <span>5%</span>
              <span>0%</span>

            </div>


            <div className="chart-content">

              <div className="chart-grid-line line-1" />
              <div className="chart-grid-line line-2" />
              <div className="chart-grid-line line-3" />


              <div className="chart-bars">

                <div className="chart-column">
                  <div
                    className="chart-bar"
                    style={{ height: "75%" }}
                  />
                  <span>May</span>
                </div>

                <div className="chart-column">
                  <div
                    className="chart-bar"
                    style={{ height: "64%" }}
                  />
                  <span>Jun</span>
                </div>

                <div className="chart-column">
                  <div
                    className="chart-bar"
                    style={{ height: "58%" }}
                  />
                  <span>Jul</span>
                </div>

                <div className="chart-column">
                  <div
                    className="chart-bar"
                    style={{ height: "52%" }}
                  />
                  <span>Aug</span>
                </div>

                <div className="chart-column">
                  <div
                    className="chart-bar current"
                    style={{ height: "45%" }}
                  />
                  <span>Sep</span>
                </div>

              </div>

            </div>

          </div>

        </section>

      </div>


      {/* =================================================
          TREATMENT EFFECTIVENESS
      ================================================= */}

      <section className="analytics-card treatment-card">

        <div className="analytics-card-header">

          <div>

            <h2>
              Treatment Effectiveness
            </h2>

            <p>
              Treatment performance across hospital departments
            </p>

          </div>

          <Pill size={19} />

        </div>


        <div className="treatment-list">

          {departmentData.map((department) => (

            <div
              className="treatment-row"
              key={department.name}
            >

              <div className="treatment-name">
                {department.name}
              </div>


              <div className="treatment-progress">

                <div className="treatment-progress-track">

                  <div
                    className="treatment-progress-fill"
                    style={{
                      width: `${department.effectiveness}%`,
                    }}
                  />

                </div>

              </div>


              <strong>
                {department.effectiveness}%
              </strong>

            </div>

          ))}

        </div>

      </section>


      {/* =================================================
          RECOVERY TREND
      ================================================= */}

      <section className="analytics-card recovery-card">

        <div className="analytics-card-header">

          <div>

            <h2>
              Patient Recovery Trend
            </h2>

            <p>
              Hospital recovery rate over the last five months
            </p>

          </div>

          <TrendingUp size={19} />

        </div>


        <div className="recovery-chart">

          <div className="recovery-y-axis">
            <span>100%</span>
            <span>90%</span>
            <span>80%</span>
            <span>70%</span>
            <span>60%</span>
          </div>


          <div className="recovery-chart-area">

            <div className="recovery-grid grid-a" />
            <div className="recovery-grid grid-b" />
            <div className="recovery-grid grid-c" />
            <div className="recovery-grid grid-d" />


            <svg
              className="recovery-line"
              viewBox="0 0 800 230"
              preserveAspectRatio="none"
            >

              <polyline
                points="
                  30,180
                  210,150
                  390,125
                  570,85
                  750,55
                "
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx="30" cy="180" r="5" />
              <circle cx="210" cy="150" r="5" />
              <circle cx="390" cy="125" r="5" />
              <circle cx="570" cy="85" r="5" />
              <circle cx="750" cy="55" r="5" />

            </svg>


            <div className="recovery-x-axis">

              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>

            </div>

          </div>

        </div>

      </section>


      {/* =================================================
          HOSPITAL PERFORMANCE
      ================================================= */}

      <section className="analytics-card performance-card">

        <div className="analytics-card-header">

          <div>

            <h2>
              Hospital Performance
            </h2>

            <p>
              Key hospital-wide performance indicators
            </p>

          </div>

        </div>


        <div className="performance-table-wrapper">

          <table className="performance-table">

            <thead>

              <tr>

                <th>
                  METRIC
                </th>

                <th>
                  CURRENT VALUE
                </th>

                <th>
                  CHANGE
                </th>

              </tr>

            </thead>


            <tbody>

              {performanceData.map((item) => (

                <tr key={item.metric}>

                  <td>
                    {item.metric}
                  </td>

                  <td>
                    <strong>
                      {item.value}
                    </strong>
                  </td>

                  <td>

                    <span className="performance-change">

                      <TrendingUp size={13} />

                      {item.change}

                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>


      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="analytics-footer">

        <span>
          HealthForecast AI
        </span>

        <span>
          Hospital Analytics
        </span>

      </div>

    </div>
  );
}