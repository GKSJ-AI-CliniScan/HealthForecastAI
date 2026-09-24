"use client";

import { useState } from "react";

import {
  FileText,
  ClipboardCheck,
  Users,
  Hospital,
  Activity,
  TrendingUp,
  CalendarDays,
  Download,
  Eye,
  X,
  ArrowUp,
  Clock3,
  BarChart3,
  ShieldAlert,
} from "lucide-react";

import "./reports.css";

type Report = {
  id: number;
  title: string;
  description: string;
  type: string;
  date: string;
  status: "Ready" | "Generated";
  icon: "treatment" | "outcome" | "hospital" | "readmission";
};

const reports: Report[] = [
  {
    id: 1,
    title: "Treatment Effectiveness Report",
    description:
      "Treatment outcomes, recovery performance and medication effectiveness analysis.",
    type: "Treatment Analysis",
    date: "Sep 24, 2026",
    status: "Ready",
    icon: "treatment",
  },
  {
    id: 2,
    title: "Patient Outcome Report",
    description:
      "Patient recovery, improvement, stability and readmission outcome analysis.",
    type: "Patient Analytics",
    date: "Sep 24, 2026",
    status: "Ready",
    icon: "outcome",
  },
  {
    id: 3,
    title: "Hospital Performance Report",
    description:
      "Hospital-level performance, patient volume, recovery and operational metrics.",
    type: "Performance",
    date: "Sep 23, 2026",
    status: "Generated",
    icon: "hospital",
  },
  {
    id: 4,
    title: "Readmission Analytics Report",
    description:
      "Readmission rates, 30-day readmissions and readmission trends.",
    type: "Readmission Analytics",
    date: "Sep 22, 2026",
    status: "Ready",
    icon: "readmission",
  },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] =
    useState<Report | null>(null);

  const [reportType, setReportType] =
    useState("All Reports");

  const [dateRange, setDateRange] =
    useState("Last 6 Months");

  const filteredReports =
    reportType === "All Reports"
      ? reports
      : reports.filter(
          (report) => report.type === reportType
        );

  const getReportIcon = (icon: Report["icon"]) => {
    if (icon === "treatment") {
      return <ClipboardCheck size={21} />;
    }

    if (icon === "outcome") {
      return <Users size={21} />;
    }

    if (icon === "hospital") {
      return <Hospital size={21} />;
    }

    return <ShieldAlert size={21} />;
  };

  return (
    <div className="reports-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="reports-header">

        <div>
          <p className="reports-eyebrow">
            ANALYTICS
          </p>

          <h1>
            Reports
          </h1>

          <p className="reports-description">
            View and review healthcare analytics,
            treatment outcomes and hospital performance
            reports.
          </p>
        </div>

        <div className="reports-header-actions">

          <button className="report-date-filter">
            <CalendarDays size={16} />

            <select
              value={dateRange}
              onChange={(event) =>
                setDateRange(event.target.value)
              }
            >
              <option>
                Last 6 Months
              </option>

              <option>
                Last 3 Months
              </option>

              <option>
                This Year
              </option>
            </select>
          </button>

          <button className="generate-report-button">
            <FileText size={16} />
            Generate Report
          </button>

        </div>

      </div>

      {/* =================================================
          REPORT OVERVIEW
      ================================================= */}

      <section className="report-overview-grid">

        <div className="report-overview-card">

          <div className="report-overview-icon blue">
            <FileText size={20} />
          </div>

          <div>
            <span>
              Total Reports
            </span>

            <strong>
              24
            </strong>

            <small>
              Available reports
            </small>
          </div>

        </div>

        <div className="report-overview-card">

          <div className="report-overview-icon green">
            <ClipboardCheck size={20} />
          </div>

          <div>
            <span>
              Generated
            </span>

            <strong>
              18
            </strong>

            <small>
              Completed reports
            </small>
          </div>

        </div>

        <div className="report-overview-card">

          <div className="report-overview-icon purple">
            <Clock3 size={20} />
          </div>

          <div>
            <span>
              This Month
            </span>

            <strong>
              8
            </strong>

            <small>
              Reports generated
            </small>
          </div>

        </div>

        <div className="report-overview-card">

          <div className="report-overview-icon orange">
            <TrendingUp size={20} />
          </div>

          <div>
            <span>
              Analytics Reports
            </span>

            <strong>
              12
            </strong>

            <small>
              Performance reports
            </small>
          </div>

        </div>

      </section>

      {/* =================================================
          AVAILABLE REPORTS
      ================================================= */}

      <section className="reports-section">

        <div className="reports-section-header">

          <div>
            <p className="section-eyebrow">
              REPORT LIBRARY
            </p>

            <h2>
              Available Reports
            </h2>

            <p>
              Review healthcare analytics and
              performance reports.
            </p>
          </div>

          <div className="report-filters">

            <select
              value={reportType}
              onChange={(event) =>
                setReportType(event.target.value)
              }
            >
              <option>
                All Reports
              </option>

              <option>
                Treatment Analysis
              </option>

              <option>
                Patient Analytics
              </option>

              <option>
                Performance
              </option>

              <option>
                Readmission Analytics
              </option>
            </select>

          </div>

        </div>

        {/* REPORT CARDS */}

        <div className="reports-grid">

          {filteredReports.map((report) => (

            <div
              className="report-card"
              key={report.id}
            >

              <div className="report-card-top">

                <div
                  className={`report-icon ${report.icon}`}
                >
                  {getReportIcon(report.icon)}
                </div>

                <span className="report-status">
                  {report.status}
                </span>

              </div>

              <div className="report-card-content">

                <h3>
                  {report.title}
                </h3>

                <p>
                  {report.description}
                </p>

              </div>

              <div className="report-card-meta">

                <span>
                  <CalendarDays size={13} />
                  {report.date}
                </span>

                <span>
                  {report.type}
                </span>

              </div>

              <div className="report-card-actions">

                <button
                  type="button"
                  className="view-report-button"
                  onClick={() =>
                    setSelectedReport(report)
                  }
                >
                  <Eye size={15} />
                  View Report
                </button>

                <button
                  type="button"
                  className="download-report-button"
                >
                  <Download size={15} />
                </button>

              </div>

            </div>

          ))}

        </div>

      </section>

      {/* =================================================
          RECENT REPORT ACTIVITY
      ================================================= */}

      <section className="recent-reports-section">

        <div className="recent-reports-header">

          <div>
            <p className="section-eyebrow">
              REPORT ACTIVITY
            </p>

            <h2>
              Recent Reports
            </h2>

            <p>
              Recently generated healthcare reports.
            </p>
          </div>

          <button className="view-all-button">
            View All
          </button>

        </div>

        <div className="recent-reports-table-wrapper">

          <table className="recent-reports-table">

            <thead>

              <tr>
                <th>REPORT</th>
                <th>TYPE</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>

            </thead>

            <tbody>

              {reports.map((report) => (

                <tr key={report.id}>

                  <td>

                    <div className="table-report-name">

                      <div
                        className={`table-report-icon ${report.icon}`}
                      >
                        {getReportIcon(
                          report.icon
                        )}
                      </div>

                      <div>
                        <strong>
                          {report.title}
                        </strong>

                        <span>
                          HealthForecast AI
                        </span>
                      </div>

                    </div>

                  </td>

                  <td>
                    {report.type}
                  </td>

                  <td>
                    {report.date}
                  </td>

                  <td>

                    <span className="table-status">
                      {report.status}
                    </span>

                  </td>

                  <td>

                    <button
                      className="table-view-button"
                      onClick={() =>
                        setSelectedReport(report)
                      }
                    >
                      View
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>

      {/* =================================================
          REPORT PREVIEW MODAL
      ================================================= */}

      {selectedReport && (

        <div
          className="report-modal-overlay"
          onClick={() =>
            setSelectedReport(null)
          }
        >

          <div
            className="report-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="report-modal-header">

              <div>

                <p>
                  HEALTHFORECAST AI
                </p>

                <h2>
                  {selectedReport.title}
                </h2>

                <span>
                  Reporting Period:{" "}
                  {dateRange}
                </span>

              </div>

              <button
                className="close-modal-button"
                onClick={() =>
                  setSelectedReport(null)
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="report-modal-body">

              {/* SUMMARY */}

              <div className="modal-summary-grid">

                <div>
                  <span>
                    Total Patients
                  </span>

                  <strong>
                    1,248
                  </strong>
                </div>

                <div>
                  <span>
                    Recovery Rate
                  </span>

                  <strong>
                    82%
                  </strong>
                </div>

                <div>
                  <span>
                    Readmission Rate
                  </span>

                  <strong>
                    10.2%
                  </strong>
                </div>

                <div>
                  <span>
                    Avg. Recovery
                  </span>

                  <strong>
                    18 days
                  </strong>
                </div>

              </div>

              {/* REPORT SUMMARY */}

              <div className="modal-report-section">

                <div className="modal-section-title">

                  <BarChart3 size={17} />

                  <div>
                    <h3>
                      Report Summary
                    </h3>

                    <p>
                      Key findings from the selected
                      healthcare data.
                    </p>
                  </div>

                </div>

                <div className="modal-summary-list">

                  <div>
                    <span>
                      Patient outcomes
                    </span>

                    <strong>
                      62% recovered
                    </strong>
                  </div>

                  <div>
                    <span>
                      Treatment effectiveness
                    </span>

                    <strong>
                      82%
                    </strong>
                  </div>

                  <div>
                    <span>
                      Readmission trend
                    </span>

                    <strong className="positive-value">
                      ↓ 2.4%
                    </strong>
                  </div>

                  <div>
                    <span>
                      Patient volume
                    </span>

                    <strong className="positive-value">
                      ↑ 5.6%
                    </strong>
                  </div>

                </div>

              </div>

              {/* INSIGHT */}

              <div className="modal-insight">

                <div className="modal-insight-icon">
                  <ArrowUp size={16} />
                </div>

                <div>

                  <strong>
                    Key Insight
                  </strong>

                  <p>
                    Overall patient recovery has
                    improved compared with the
                    previous reporting period,
                    while readmission rates have
                    decreased.
                  </p>

                </div>

              </div>

            </div>

            <div className="report-modal-footer">

              <button
                className="modal-secondary-button"
                onClick={() =>
                  setSelectedReport(null)
                }
              >
                Close
              </button>

              <button className="modal-download-button">
                <Download size={15} />
                Export Report
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          NOTE
      ================================================= */}

      <div className="reports-note">

        <Activity size={15} />

        <span>
          Reports are generated from available
          healthcare analytics and are intended to
          support clinical and operational decision-making.
        </span>

      </div>

    </div>
  );
}