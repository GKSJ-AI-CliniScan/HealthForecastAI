"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  HeartPulse,
  Hospital,
  Users,
} from "lucide-react";

import "./analytics.css";

const outcomeData = [
  {
    label: "Recovered",
    value: 62,
    count: 774,
    className: "recovered",
  },
  {
    label: "Improving",
    value: 20,
    count: 250,
    className: "improving",
  },
  {
    label: "Stable",
    value: 12,
    count: 150,
    className: "stable",
  },
  {
    label: "Readmitted",
    value: 6,
    count: 74,
    className: "readmitted",
  },
];

const hospitalPerformance = [
  {
    metric: "Patient Volume",
    current: "1,248",
    previous: "1,180",
    change: "+5.7%",
    positive: true,
  },
  {
    metric: "Readmission Rate",
    current: "10.2%",
    previous: "12.6%",
    change: "-19.0%",
    positive: true,
  },
  {
    metric: "Recovery Rate",
    current: "82%",
    previous: "77%",
    change: "+6.5%",
    positive: true,
  },
  {
    metric: "Average Length of Stay",
    current: "5.2 days",
    previous: "5.8 days",
    change: "-10.3%",
    positive: true,
  },
  {
    metric: "Patient Satisfaction",
    current: "88%",
    previous: "84%",
    change: "+4.8%",
    positive: true,
  },
  {
    metric: "Bed Utilization",
    current: "76%",
    previous: "71%",
    change: "+7.0%",
    positive: true,
  },
];

const monthlyReadmissions = [
  { month: "Jan", value: 72 },
  { month: "Feb", value: 84 },
  { month: "Mar", value: 108 },
  { month: "Apr", value: 82 },
  { month: "May", value: 58 },
  { month: "Jun", value: 66 },
  { month: "Jul", value: 72 },
  { month: "Aug", value: 78 },
  { month: "Sep", value: 76 },
];

const patientVolume = [
  760,
  830,
  900,
  980,
  1040,
  1090,
  1180,
  1240,
  1280,
];

const trendData = [
  {
    label: "Recovery Rate",
    values: [73, 74, 75, 81, 76, 82, 88, 88, 89],
    className: "trend-green",
  },
  {
    label: "Readmission Rate",
    values: [28, 24, 20, 22, 19, 18, 17, 16, 15],
    className: "trend-blue",
  },
  {
    label: "Avg. Length of Stay",
    values: [58, 57, 57, 47, 49, 46, 44, 43, 41],
    className: "trend-orange",
  },
];

const departmentData = [
  {
    name: "Cardiology",
    value: 88,
    className: "department-blue",
  },
  {
    name: "Orthopedics",
    value: 84,
    className: "department-green",
  },
  {
    name: "General Medicine",
    value: 78,
    className: "department-purple",
  },
  {
    name: "Respiratory",
    value: 76,
    className: "department-orange",
  },
  {
    name: "Neurology",
    value: 72,
    className: "department-red",
  },
];

export default function AnalyticsPage() {
  const maxReadmission = Math.max(
    ...monthlyReadmissions.map((item) => item.value)
  );

  const maxVolume = Math.max(...patientVolume);

  return (
    <div className="analytics-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="analytics-header">

        <div>
          <p className="analytics-eyebrow">
            ANALYTICS
          </p>

          <h1>
            Healthcare Analytics
          </h1>

          <p className="analytics-description">
            Analyze patient outcomes, readmissions,
            hospital performance and healthcare trends.
          </p>
        </div>

        <div className="analytics-header-actions">

          <button className="analytics-date-picker">
            <CalendarDays size={16} />
            <span>Last 6 Months</span>
          </button>

          <button className="analytics-filter">
            All Patients
          </button>

        </div>

      </div>

      {/* =================================================
          KPI CARDS
      ================================================= */}

      <section className="analytics-kpi-grid">

        <div className="analytics-kpi-card">

          <div className="kpi-icon blue">
            <Users size={20} />
          </div>

          <div className="kpi-content">

            <span className="kpi-label">
              Total Patients
            </span>

            <strong>
              1,248
            </strong>

            <div className="kpi-change positive">
              <ArrowUp size={13} />
              5.6%
              <span>vs previous period</span>
            </div>

          </div>

        </div>

        <div className="analytics-kpi-card">

          <div className="kpi-icon red">
            <Hospital size={20} />
          </div>

          <div className="kpi-content">

            <span className="kpi-label">
              Readmission Rate
            </span>

            <strong>
              10.2%
            </strong>

            <div className="kpi-change positive">
              <ArrowDown size={13} />
              2.4%
              <span>vs previous period</span>
            </div>

          </div>

        </div>

        <div className="analytics-kpi-card">

          <div className="kpi-icon green">
            <HeartPulse size={20} />
          </div>

          <div className="kpi-content">

            <span className="kpi-label">
              Recovery Rate
            </span>

            <strong>
              82%
            </strong>

            <div className="kpi-change positive">
              <ArrowUp size={13} />
              6.5%
              <span>vs previous period</span>
            </div>

          </div>

        </div>

        <div className="analytics-kpi-card">

          <div className="kpi-icon purple">
            <Activity size={20} />
          </div>

          <div className="kpi-content">

            <span className="kpi-label">
              Avg. Length of Stay
            </span>

            <strong>
              5.2 days
            </strong>

            <div className="kpi-change positive">
              <ArrowDown size={13} />
              10.3%
              <span>vs previous period</span>
            </div>

          </div>

        </div>

        <div className="analytics-kpi-card">

          <div className="kpi-icon orange">
            <AlertTriangle size={20} />
          </div>

          <div className="kpi-content">

            <span className="kpi-label">
              High Risk Patients
            </span>

            <strong>
              84
            </strong>

            <div className="kpi-change warning">
              <ArrowUp size={13} />
              12%
              <span>require attention</span>
            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          FIRST ANALYTICS ROW
      ================================================= */}

      <section className="analytics-grid analytics-grid-three">

        {/* PATIENT OUTCOMES */}

        <div className="analytics-card outcome-card">

          <div className="analytics-card-header">

            <div>
              <h2>
                Patient Outcome Analysis
              </h2>

              <p>
                Distribution of patient outcomes
              </p>
            </div>

            <button className="small-filter">
              Last 6 Months
            </button>

          </div>

          <div className="outcome-body">

            <div className="donut-chart">

              <div className="donut-inner">

                <strong>
                  1,248
                </strong>

                <span>
                  Patients
                </span>

              </div>

            </div>

            <div className="outcome-legend">

              {outcomeData.map((item) => (
                <div
                  className="outcome-item"
                  key={item.label}
                >

                  <div className="outcome-item-name">

                    <span
                      className={`legend-dot ${item.className}`}
                    />

                    <span>
                      {item.label}
                    </span>

                  </div>

                  <strong>
                    {item.value}%
                  </strong>

                  <small>
                    ({item.count})
                  </small>

                </div>
              ))}

            </div>

          </div>

        </div>

        {/* READMISSION ANALYTICS */}

        <div className="analytics-card">

          <div className="analytics-card-header">

            <div>
              <h2>
                Readmission Analytics
              </h2>

              <p>
                Monthly readmission pattern
              </p>
            </div>

            <button className="small-filter">
              6 Months
            </button>

          </div>

          <div className="bar-chart">

            <div className="chart-y-labels">
              <span>160</span>
              <span>120</span>
              <span>80</span>
              <span>40</span>
              <span>0</span>
            </div>

            <div className="bars-area">

              {monthlyReadmissions.map((item) => (
                <div
                  className="bar-column"
                  key={item.month}
                >

                  <div className="bar-wrapper">

                    <div
                      className="readmission-bar"
                      style={{
                        height: `${
                          (item.value / maxReadmission) *
                          100
                        }%`,
                      }}
                    />

                  </div>

                  <span>
                    {item.month}
                  </span>

                </div>
              ))}

            </div>

          </div>

          <div className="mini-stat-row">

            <div>
              <strong>124</strong>
              <span>Total Readmissions</span>
            </div>

            <div>
              <strong>10.2%</strong>
              <span>Readmission Rate</span>
            </div>

            <div>
              <strong>86</strong>
              <span>30-Day Readmissions</span>
            </div>

          </div>

        </div>

        {/* PATIENT VOLUME */}

        <div className="analytics-card">

          <div className="analytics-card-header">

            <div>
              <h2>
                Patient Volume Trend
              </h2>

              <p>
                Patients under care over time
              </p>
            </div>

            <button className="small-filter">
              6 Months
            </button>

          </div>

          <div className="volume-chart">

            <div className="volume-y-axis">
              <span>1,500</span>
              <span>1,200</span>
              <span>900</span>
              <span>600</span>
              <span>0</span>
            </div>

            <div className="volume-bars">

              {patientVolume.map(
                (value, index) => (
                  <div
                    className="volume-column"
                    key={index}
                  >

                    <div
                      className="volume-fill"
                      style={{
                        height: `${
                          (value / maxVolume) *
                          100
                        }%`,
                      }}
                    />

                  </div>
                )
              )}

            </div>

          </div>

          <div className="volume-summary">

            <ArrowUp size={16} />

            <div>
              <strong>
                Patient volume increased by 18%
              </strong>

              <span>
                compared to the previous 6 months.
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          SECOND ROW
      ================================================= */}

      <section className="analytics-grid analytics-grid-three">

        {/* HOSPITAL PERFORMANCE */}

        <div className="analytics-card performance-card">

          <div className="analytics-card-header">

            <div>
              <h2>
                Hospital Performance
              </h2>

              <p>
                Key performance indicators
              </p>
            </div>

          </div>

          <div className="performance-table-wrapper">

            <table className="performance-table">

              <thead>

                <tr>
                  <th>Metric</th>
                  <th>Current</th>
                  <th>Previous</th>
                  <th>Change</th>
                </tr>

              </thead>

              <tbody>

                {hospitalPerformance.map(
                  (item) => (
                    <tr key={item.metric}>

                      <td>
                        {item.metric}
                      </td>

                      <td>
                        {item.current}
                      </td>

                      <td>
                        {item.previous}
                      </td>

                      <td>
                        <span
                          className={
                            item.positive
                              ? "table-positive"
                              : "table-negative"
                          }
                        >
                          {item.change}
                        </span>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* HEALTHCARE TRENDS */}

        <div className="analytics-card trends-card">

          <div className="analytics-card-header">

            <div>
              <h2>
                Healthcare Trends
              </h2>

              <p>
                Trends in key healthcare metrics
              </p>
            </div>

            <button className="small-filter">
              Recovery Rate
            </button>

          </div>

          <div className="trend-chart">

            <div className="trend-grid">

              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>

            </div>

            <div className="trend-lines">

              {trendData.map(
                (trend) => (
                  <div
                    className="trend-row"
                    key={trend.label}
                  >

                    {trend.values.map(
                      (value, index) => (
                        <div
                          className={`trend-point ${trend.className}`}
                          key={index}
                          style={{
                            left: `${
                              (index /
                                (trend.values.length -
                                  1)) *
                              100
                            }%`,
                            bottom: `${value}%`,
                          }}
                        />
                      )
                    )}

                    <div
                      className={`trend-line ${trend.className}`}
                    />

                  </div>
                )
              )}

            </div>

          </div>

          <div className="trend-legend">

            <span>
              <i className="trend-dot green" />
              Recovery Rate
            </span>

            <span>
              <i className="trend-dot blue" />
              Readmission Rate
            </span>

            <span>
              <i className="trend-dot orange" />
              Avg. Length of Stay
            </span>

          </div>

        </div>

        {/* DEPARTMENT PERFORMANCE */}

        <div className="analytics-card">

          <div className="analytics-card-header">

            <div>
              <h2>
                Department Outcomes
              </h2>

              <p>
                Recovery rate by department
              </p>
            </div>

          </div>

          <div className="department-list">

            {departmentData.map(
              (department) => (
                <div
                  className="department-item"
                  key={department.name}
                >

                  <div className="department-top">

                    <span>
                      {department.name}
                    </span>

                    <strong>
                      {department.value}%
                    </strong>

                  </div>

                  <div className="department-track">

                    <div
                      className={`department-progress ${department.className}`}
                      style={{
                        width: `${department.value}%`,
                      }}
                    />

                  </div>

                </div>
              )
            )}

          </div>

        </div>

      </section>

      {/* =================================================
          KEY INSIGHTS
      ================================================= */}

      <section className="analytics-insights">

        <div className="insights-heading">

          <div className="insights-icon">
            <BarChart3 size={18} />
          </div>

          <div>
            <h2>
              Key Insights
            </h2>

            <p>
              Important observations from current
              healthcare analytics.
            </p>
          </div>

        </div>

        <div className="insights-grid">

          <div className="insight-item">

            <div className="insight-status green">
              <ArrowUp size={15} />
            </div>

            <div>
              <strong>
                Recovery rate improved by 6.5%
              </strong>

              <span>
                compared to the previous period.
              </span>
            </div>

          </div>

          <div className="insight-item">

            <div className="insight-status blue">
              <ArrowDown size={15} />
            </div>

            <div>
              <strong>
                Readmission rate decreased by 2.4%
              </strong>

              <span>
                indicating improved care outcomes.
              </span>
            </div>

          </div>

          <div className="insight-item">

            <div className="insight-status purple">
              <Users size={15} />
            </div>

            <div>
              <strong>
                Patient volume increased by 18%
              </strong>

              <span>
                over the selected reporting period.
              </span>
            </div>

          </div>

          <div className="insight-item">

            <div className="insight-status orange">
              <AlertTriangle size={15} />
            </div>

            <div>
              <strong>
                84 patients require closer monitoring
              </strong>

              <span>
                based on current risk indicators.
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          DISCLAIMER
      ================================================= */}

      <div className="analytics-note">

        <Activity size={15} />

        <span>
          Analytics shown here are based on available
          healthcare data and are intended to support
          clinical and operational decision-making.
        </span>

      </div>

    </div>
  );
}