"use client";

import { useState } from "react";

import {
  FileText,
  Download,
  Eye,
  Calendar,
  BarChart3,
  Users,
  Activity,
  CheckCircle2,
  X,
} from "lucide-react";

import "./reports.css";

type ReportType =
  | "All"
  | "Treatment Effectiveness"
  | "Patient Outcomes"
  | "Hospital Performance"
  | "Readmission Analytics";

const reports = [
  {
    id: "R001",
    name: "Hospital Performance Report",
    type: "Hospital Performance",
    date: "Sep 28, 2026",
    status: "Generated",
    period: "Last 30 Days",
  },
  {
    id: "R002",
    name: "Treatment Effectiveness Report",
    type: "Treatment Effectiveness",
    date: "Sep 26, 2026",
    status: "Generated",
    period: "Last 30 Days",
  },
  {
    id: "R003",
    name: "Patient Outcome Report",
    type: "Patient Outcomes",
    date: "Sep 24, 2026",
    status: "Generated",
    period: "Last 30 Days",
  },
  {
    id: "R004",
    name: "Readmission Analytics Report",
    type: "Readmission Analytics",
    date: "Sep 22, 2026",
    status: "Generated",
    period: "Last 30 Days",
  },
];

const reportTypes = [
  {
    title: "Hospital Performance Report",
    description:
      "Hospital-wide performance, recovery, treatment effectiveness, and operational indicators.",
    icon: BarChart3,
    type: "Hospital Performance",
  },
  {
    title: "Treatment Effectiveness Report",
    description:
      "Treatment outcomes and effectiveness across hospital departments.",
    icon: Activity,
    type: "Treatment Effectiveness",
  },
  {
    title: "Patient Outcome Report",
    description:
      "Patient recovery, improvement, stability, and overall outcome analysis.",
    icon: Users,
    type: "Patient Outcomes",
  },
  {
    title: "Readmission Analytics Report",
    description:
      "Hospital readmission rates and recent readmission trends.",
    icon: CheckCircle2,
    type: "Readmission Analytics",
  },
];

export default function HospitalReportsPage() {
  const [selectedFilter, setSelectedFilter] =
    useState<ReportType>("All");

  const [selectedReport, setSelectedReport] =
    useState<(typeof reports)[number] | null>(null);

  const filteredReports =
    selectedFilter === "All"
      ? reports
      : reports.filter(
          (report) => report.type === selectedFilter
        );

  return (
    <div className="reports-page">

      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <div className="reports-breadcrumb">

        <span>
          Hospital Admin
        </span>

        <span>
          /
        </span>

        <strong>
          Reports
        </strong>

      </div>


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="reports-page-header">

        <div>

          <p className="reports-eyebrow">
            HOSPITAL REPORTING
          </p>

          <h1>
            Reports
          </h1>

          <p>
            Generate, view, and export hospital performance
            and analytics reports.
          </p>

        </div>


        <button
          type="button"
          className="reports-generate-button"
        >

          <FileText size={16} />

          Generate Report

        </button>

      </div>


      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="reports-summary-grid">

        <div className="reports-summary-card">

          <div className="reports-summary-icon blue">
            <FileText size={20} />
          </div>

          <div>

            <span>
              Total Reports
            </span>

            <strong>
              24
            </strong>

          </div>

        </div>


        <div className="reports-summary-card">

          <div className="reports-summary-icon green">
            <CheckCircle2 size={20} />
          </div>

          <div>

            <span>
              Generated
            </span>

            <strong>
              18
            </strong>

          </div>

        </div>


        <div className="reports-summary-card">

          <div className="reports-summary-icon purple">
            <Calendar size={20} />
          </div>

          <div>

            <span>
              This Month
            </span>

            <strong>
              8
            </strong>

          </div>

        </div>


        <div className="reports-summary-card">

          <div className="reports-summary-icon orange">
            <BarChart3 size={20} />
          </div>

          <div>

            <span>
              Analytics Reports
            </span>

            <strong>
              12
            </strong>

          </div>

        </div>

      </div>


      {/* =================================================
          AVAILABLE REPORTS
      ================================================= */}

      <section className="reports-card">

        <div className="reports-card-header">

          <div>

            <h2>
              Available Reports
            </h2>

            <p>
              Select a report type to view hospital-level
              analytics and summaries.
            </p>

          </div>

        </div>


        <div className="reports-type-grid">

          {reportTypes.map((report) => {

            const Icon = report.icon;

            return (
              <div
                className="reports-type-card"
                key={report.title}
              >

                <div className="reports-type-icon">
                  <Icon size={21} />
                </div>


                <div className="reports-type-content">

                  <h3>
                    {report.title}
                  </h3>

                  <p>
                    {report.description}
                  </p>


                  <button
                    type="button"
                    onClick={() => {
                      const found = reports.find(
                        (item) =>
                          item.type === report.type
                      );

                      if (found) {
                        setSelectedReport(found);
                      }
                    }}
                  >
                    View Report

                    <Eye size={14} />

                  </button>

                </div>

              </div>
            );

          })}

        </div>

      </section>


      {/* =================================================
          REPORT HISTORY
      ================================================= */}

      <section className="reports-card">

        <div className="reports-history-header">

          <div>

            <h2>
              Recent Reports
            </h2>

            <p>
              Previously generated hospital reports.
            </p>

          </div>


          <select
            value={selectedFilter}
            onChange={(event) =>
              setSelectedFilter(
                event.target.value as ReportType
              )
            }
            className="reports-filter"
          >

            <option value="All">
              All Reports
            </option>

            <option value="Hospital Performance">
              Hospital Performance
            </option>

            <option value="Treatment Effectiveness">
              Treatment Effectiveness
            </option>

            <option value="Patient Outcomes">
              Patient Outcomes
            </option>

            <option value="Readmission Analytics">
              Readmission Analytics
            </option>

          </select>

        </div>


        <div className="reports-table-wrapper">

          <table className="reports-table">

            <thead>

              <tr>

                <th>
                  REPORT
                </th>

                <th>
                  TYPE
                </th>

                <th>
                  PERIOD
                </th>

                <th>
                  GENERATED
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  ACTION
                </th>

              </tr>

            </thead>


            <tbody>

              {filteredReports.map((report) => (

                <tr key={report.id}>

                  <td>

                    <div className="report-name">

                      <div className="report-file-icon">
                        <FileText size={16} />
                      </div>

                      <div>

                        <strong>
                          {report.name}
                        </strong>

                        <span>
                          {report.id}
                        </span>

                      </div>

                    </div>

                  </td>


                  <td>
                    {report.type}
                  </td>


                  <td>
                    {report.period}
                  </td>


                  <td>
                    {report.date}
                  </td>


                  <td>

                    <span className="report-status">
                      {report.status}
                    </span>

                  </td>


                  <td>

                    <div className="report-actions">

                      <button
                        type="button"
                        title="View report"
                        onClick={() =>
                          setSelectedReport(report)
                        }
                      >
                        <Eye size={15} />
                      </button>


                      <button
                        type="button"
                        title="Download report"
                      >
                        <Download size={15} />
                      </button>

                    </div>

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

        <div className="report-modal-overlay">

          <div className="report-modal">

            <div className="report-modal-header">

              <div>

                <p>
                  REPORT PREVIEW
                </p>

                <h2>
                  {selectedReport.name}
                </h2>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelectedReport(null)
                }
                className="report-modal-close"
              >
                <X size={18} />
              </button>

            </div>


            <div className="report-modal-body">

              <div className="report-preview-info">

                <div>
                  <span>
                    Report ID
                  </span>

                  <strong>
                    {selectedReport.id}
                  </strong>
                </div>


                <div>
                  <span>
                    Period
                  </span>

                  <strong>
                    {selectedReport.period}
                  </strong>
                </div>


                <div>
                  <span>
                    Generated
                  </span>

                  <strong>
                    {selectedReport.date}
                  </strong>
                </div>

              </div>


              <div className="report-preview-summary">

                <h3>
                  Report Summary
                </h3>

                <p>
                  This report provides a structured summary
                  of hospital-level {selectedReport.type.toLowerCase()}
                  metrics and recent performance indicators.
                </p>

              </div>


              <div className="report-preview-metrics">

                <div>

                  <span>
                    Patient Outcomes
                  </span>

                  <strong>
                    93%
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
                    Treatment Effectiveness
                  </span>

                  <strong>
                    91%
                  </strong>

                </div>

              </div>

            </div>


            <div className="report-modal-footer">

              <button
                type="button"
                className="report-modal-secondary"
                onClick={() =>
                  setSelectedReport(null)
                }
              >
                Close
              </button>


              <button
                type="button"
                className="report-modal-primary"
              >

                <Download size={15} />

                Export Report

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="reports-footer">

        <span>
          HealthForecast AI
        </span>

        <span>
          Hospital Reports
        </span>

      </div>

    </div>
  );
}