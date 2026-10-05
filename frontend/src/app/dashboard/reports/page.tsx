"use client";

import {
  Activity,
  BarChart3,
  Download,
  FileText,
  HeartPulse,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type ReportType = "hospital" | "treatment" | "readmission" | "forecast";

interface AnalyticsSummary {
  total_patients: number;
  total_predictions_made: number;
  average_readmission_risk: number;
}

interface ReadmissionAnalytics {
  current_distribution: {
    risk_category: string;
    count: number;
  }[];
  total_predictions_ever_run: number;
}

interface ForecastResponse {
  scope: string;
  horizon_days: number;
  predicted_readmissions: number;
  predicted_rate: number;
}

interface TreatmentSummary {
  treatment_type: string | null;
  total_cases: number;
  improved_rate: number;
  avg_recovery_days: number | null;
}

interface RecoveryTrendPoint {
  month: string;
  avg_effectiveness: number | null;
  case_count: number;
}

interface ReportItem {
  id: ReportType;
  title: string;
  description: string;
  icon: ComponentType<{
    size?: string | number;
    className?: string;
  }>;
}

const REPORTS: ReportItem[] = [
  {
    id: "hospital",
    title: "Hospital Performance",
    description:
      "Overall patient volume, prediction activity, and average readmission risk.",
    icon: BarChart3,
  },
  {
    id: "treatment",
    title: "Treatment Effectiveness",
    description:
      "Real treatment outcomes, improvement rate, recovery time, and effectiveness trends.",
    icon: HeartPulse,
  },
  {
    id: "readmission",
    title: "Readmission Analytics",
    description:
      "Current distribution of patients across low, medium, and high risk.",
    icon: Activity,
  },
  {
    id: "forecast",
    title: "Readmission Forecast",
    description:
      "Hospital-level predicted readmissions for the selected forecast horizon.",
    icon: TrendingUp,
  },
];

function formatPercent(value: number | null | undefined): string {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null | undefined): string {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return value.toLocaleString();
}

function formatDateLabel(value: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function riskLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function riskColor(category: string): string {
  switch (category.toLowerCase()) {
    case "low":
      return "bg-emerald-500";

    case "medium":
      return "bg-amber-500";

    case "high":
      return "bg-rose-500";

    default:
      return "bg-blue-500";
  }
}

function riskTextColor(category: string): string {
  switch (category.toLowerCase()) {
    case "low":
      return "text-emerald-700";

    case "medium":
      return "text-amber-700";

    case "high":
      return "text-rose-700";

    default:
      return "text-slate-700";
  }
}

export default function ReportsPage() {
  const { token, permissions, isLoading: authLoading } = useAuth();

  const [summary, setSummary] =
    useState<AnalyticsSummary | null>(null);

  const [readmissions, setReadmissions] =
    useState<ReadmissionAnalytics | null>(null);

  const [forecast, setForecast] =
    useState<ForecastResponse | null>(null);

  const [treatment, setTreatment] =
    useState<TreatmentSummary | null>(null);

  const [treatmentTrends, setTreatmentTrends] =
    useState<RecoveryTrendPoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedReport, setSelectedReport] =
    useState<ReportType | null>(null);

  /*
   * IMPORTANT:
   * Reading analytics requires hospital_analytics:read.
   * analytics:export is NOT treated as read permission.
   */
  const canHospital =
    permissions.includes("hospital_analytics:read");

  const canTreatment =
    permissions.includes("treatment_report:read");

  
  /*
   * Forecast endpoint specifically requires:
   * readmission_forecast:read
   */
  const canForecast =
    permissions.includes("readmission_forecast:read");

  const canExport =
    permissions.includes("analytics:export");

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError("");

      const errors: string[] = [];

      /*
       * Hospital analytics
       */
      if (canHospital) {
        try {
          const result = await apiFetch<AnalyticsSummary>(
            "/analytics/summary",
            {},
            token ?? undefined,
          );

          if (!cancelled) {
            setSummary(result);
          }
        } catch (err) {
          console.error("Hospital summary failed:", err);
          errors.push("Hospital performance");
        }

        /*
         * Readmission analytics
         */
        try {
          const result =
            await apiFetch<ReadmissionAnalytics>(
              "/analytics/readmissions",
              {},
              token ?? undefined,
            );

          if (!cancelled) {
            setReadmissions(result);
          }
        } catch (err) {
          console.error(
            "Readmission analytics failed:",
            err,
          );

          errors.push("Readmission analytics");
        }
      }

      /*
       * Treatment effectiveness
       */
      if (canTreatment) {
        try {
          const result =
            await apiFetch<TreatmentSummary>(
              "/treatment",
              {},
              token ?? undefined,
            );

          if (!cancelled) {
            setTreatment(result);
          }
        } catch (err) {
          console.error(
            "Treatment effectiveness failed:",
            err,
          );

          errors.push("Treatment effectiveness");
        }

        /*
         * Treatment recovery trends
         */
        try {
          const result =
            await apiFetch<RecoveryTrendPoint[]>(
              "/treatment/recovery-trends",
              {},
              token ?? undefined,
            );

          if (!cancelled) {
            setTreatmentTrends(
              Array.isArray(result) ? result : [],
            );
          }
        } catch (err) {
          console.error(
            "Treatment recovery trends failed:",
            err,
          );

          if (!cancelled) {
            setTreatmentTrends([]);
          }
        }
      }

      /*
       * Readmission forecast
       */
      if (canForecast) {
        try {
          const result =
            await apiFetch<ForecastResponse>(
              "/risk/forecast?horizon_days=30",
              {},
              token ?? undefined,
            );

          if (!cancelled) {
            setForecast(result);
          }
        } catch (err) {
          console.error(
            "Readmission forecast failed:",
            err,
          );

          errors.push("Readmission forecast");
        }
      }

      if (!cancelled) {
        if (errors.length > 0) {
          setError(
            `Some report data could not be loaded: ${errors.join(
              ", ",
            )}.`,
          );
        }

        setLoading(false);
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    token,
    canHospital,
    canTreatment,
    canForecast,
  ]);

  /*
   * Current risk distribution
   */
  const riskDistribution = ["low", "medium", "high"].map(
    (category) => {
      const found =
        readmissions?.current_distribution.find(
          (row) =>
            row.risk_category?.toLowerCase() === category,
        );

      return {
        category,
        count: found?.count ?? 0,
      };
    },
  );

  /*
   * IMPORTANT:
   *
   * Do not use:
   *
   * fetch("/api/v1...")
   *
   * because that sends the request to Next.js.
   *
   * The API URL should point to FastAPI.
   *
   * If NEXT_PUBLIC_API_URL is:
   *
   * http://127.0.0.1:8000/api/v1
   *
   * then exports go directly to FastAPI.
   */
  function getApiBaseUrl(): string {
    const configuredUrl =
      process.env.NEXT_PUBLIC_API_URL?.trim();

    if (configuredUrl) {
      return configuredUrl.replace(/\/$/, "");
    }

    /*
     * Local FastAPI fallback.
     *
     * Change this only if your backend is running
     * on another host/port.
     */
    return "http://127.0.0.1:8000/api/v1";
  }

  async function downloadCsv(
    url: string,
    filename: string,
  ) {
    if (!token) {
      setError("Please sign in again before downloading.");
      return;
    }

    try {
      setError("");

      const baseUrl = getApiBaseUrl();

      const response = await fetch(
        `${baseUrl}${url}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/csv",
          },
        },
      );

      if (!response.ok) {
        const responseText =
          await response.text().catch(() => "");

        console.error(
          "Export request failed:",
          response.status,
          responseText,
        );

        throw new Error(
          `Export failed: ${response.status}`,
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error(
          "The server returned an empty report.",
        );
      }

      const objectUrl =
        window.URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (err) {
      console.error("Export failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not download the report.",
      );
    }
  }

  function renderTreatmentReport() {
    if (!canTreatment) {
      return (
        <EmptyState
          title="Treatment report access is limited"
          description="Your current role does not have permission to read the treatment effectiveness report."
        />
      );
    }

    if (!treatment) {
      return (
        <EmptyState
          title="No treatment effectiveness data"
          description="No treatment effectiveness summary was returned by the backend."
        />
      );
    }

    return (
      <div className="space-y-6">
        {/* Treatment KPI cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            icon={HeartPulse}
            label="Total treatment cases"
            value={formatNumber(
              treatment.total_cases,
            )}
            description="Stored treatment outcomes"
          />

          <MetricCard
            icon={TrendingUp}
            label="Improved rate"
            value={formatPercent(
              treatment.improved_rate,
            )}
            description="Patients marked as improved"
          />

          <MetricCard
            icon={TrendingDown}
            label="Average recovery"
            value={
              treatment.avg_recovery_days !== null
                ? `${treatment.avg_recovery_days.toFixed(
                    1,
                  )} days`
                : "—"
            }
            description="Average recorded recovery time"
          />
        </div>

        {/* Treatment summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Treatment Effectiveness Summary
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Calculated directly from stored treatment
                outcomes.
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {treatment.treatment_type ||
                "All treatments"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryRow
              label="Treatment cases"
              value={formatNumber(
                treatment.total_cases,
              )}
            />

            <SummaryRow
              label="Improved"
              value={formatPercent(
                treatment.improved_rate,
              )}
            />

            <SummaryRow
              label="Recovery time"
              value={
                treatment.avg_recovery_days !== null
                  ? `${treatment.avg_recovery_days.toFixed(
                      1,
                    )} days`
                  : "Not available"
              }
            />
          </div>
        </div>

        {/* Treatment trend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900">
              Treatment Effectiveness Trend
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Average effectiveness and number of
              recorded cases over time.
            </p>
          </div>

          {treatmentTrends.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
              No treatment trend data available.
            </div>
          ) : (
            <div className="space-y-4">
              {treatmentTrends.map(
                (item, index) => {
                  const effectiveness =
                    item.avg_effectiveness ?? 0;

                  const width = Math.min(
                    Math.max(effectiveness * 100, 3),
                    100,
                  );

                  return (
                    <div
                      key={`${item.month}-${index}`}
                    >
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">
                          {formatDateLabel(
                            item.month,
                          )}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {formatPercent(
                            effectiveness,
                          )}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all"
                          style={{
                            width: `${width}%`,
                          }}
                        />
                      </div>

                      <div className="mt-1 text-right text-xs text-slate-400">
                        {formatNumber(
                          item.case_count,
                        )}{" "}
                        cases
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        {canExport && (
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "/treatment/export/effectiveness.csv",
                "treatment_effectiveness_report.csv",
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Download size={16} />
            Export Treatment Report
          </button>
        )}
      </div>
    );
  }

  function renderHospitalReport() {
    if (!canHospital) {
      return (
        <EmptyState
          title="Hospital analytics unavailable"
          description="Your current role does not have permission to view hospital analytics."
        />
      );
    }

    if (!summary) {
      return (
        <EmptyState
          title="No hospital analytics data"
          description="The analytics summary was not returned by the backend."
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            icon={Users}
            label="Patients in scope"
            value={formatNumber(
              summary.total_patients,
            )}
            description="Patients currently available"
          />

          <MetricCard
            icon={Activity}
            label="Predictions made"
            value={formatNumber(
              summary.total_predictions_made,
            )}
            description="Risk predictions stored"
          />

          <MetricCard
            icon={HeartPulse}
            label="Average readmission risk"
            value={formatPercent(
              summary.average_readmission_risk,
            )}
            description="Across stored predictions"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Hospital Overview
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Current hospital-level metrics returned by
            the analytics service.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryRow
              label="Patients"
              value={formatNumber(
                summary.total_patients,
              )}
            />

            <SummaryRow
              label="Predictions"
              value={formatNumber(
                summary.total_predictions_made,
              )}
            />

            <SummaryRow
              label="Average risk"
              value={formatPercent(
                summary.average_readmission_risk,
              )}
            />
          </div>
        </div>

        {canExport && (
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "/analytics/export/readmissions.csv",
                "hospital_analytics_report.csv",
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Download size={16} />
            Export Hospital Report
          </button>
        )}
      </div>
    );
  }

  function renderReadmissionReport() {
    if (!canHospital) {
      return (
        <EmptyState
          title="Readmission analytics unavailable"
          description="Your current role does not have permission to view hospital-level readmission analytics."
        />
      );
    }

    if (!readmissions) {
      return (
        <EmptyState
          title="No readmission analytics data"
          description="The readmission analytics endpoint did not return data."
        />
      );
    }

    const total = riskDistribution.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    const highRisk =
      riskDistribution.find(
        (item) => item.category === "high",
      )?.count ?? 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            icon={Activity}
            label="Patients currently scored"
            value={formatNumber(total)}
            description="Latest risk score per patient"
          />

          <MetricCard
            icon={BarChart3}
            label="Predictions ever run"
            value={formatNumber(
              readmissions.total_predictions_ever_run,
            )}
            description="All stored risk predictions"
          />

          <MetricCard
            icon={HeartPulse}
            label="High-risk patients"
            value={formatNumber(highRisk)}
            description="Currently in the high-risk category"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900">
              Current Risk Distribution
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Latest stored risk category for each
              patient.
            </p>
          </div>

          <div className="space-y-5">
            {riskDistribution.map((item) => {
              const percentage =
                total > 0
                  ? (item.count / total) * 100
                  : 0;

              return (
                <div key={item.category}>
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${riskTextColor(
                        item.category,
                      )}`}
                    >
                      {riskLabel(item.category)}
                    </span>

                    <span className="text-sm font-semibold text-slate-900">
                      {formatNumber(item.count)}{" "}
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${riskColor(
                        item.category,
                      )}`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {canExport && (
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "/analytics/export/readmissions.csv",
                "readmission_report.csv",
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Download size={16} />
            Export Readmission Report
          </button>
        )}
      </div>
    );
  }

  function renderForecastReport() {
    if (!canForecast) {
      return (
        <EmptyState
          title="Forecast unavailable"
          description="Your current role does not have permission to view the readmission forecast."
        />
      );
    }

    if (!forecast) {
      return (
        <EmptyState
          title="No forecast data"
          description="The readmission forecast endpoint did not return data."
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            icon={TrendingUp}
            label="Forecast horizon"
            value={`${forecast.horizon_days} days`}
            description="Prediction window"
          />

          <MetricCard
            icon={Users}
            label="Predicted readmissions"
            value={formatNumber(
              forecast.predicted_readmissions,
            )}
            description="Expected within the horizon"
          />

          <MetricCard
            icon={Activity}
            label="Predicted rate"
            value={formatPercent(
              forecast.predicted_rate,
            )}
            description="Hospital-level forecast"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Readmission Forecast
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Forecast generated for the hospital scope
            using the latest stored risk predictions.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">
                  Predicted readmission rate
                </p>

                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {formatPercent(
                    forecast.predicted_rate,
                  )}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">
                  Expected cases
                </p>

                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {formatNumber(
                    forecast.predicted_readmissions,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(
                    Math.max(
                      forecast.predicted_rate * 100,
                      2,
                    ),
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400">
            Scope: {forecast.scope || "hospital"}
          </div>
        </div>

        {/*
         * No Forecast CSV button here because the backend
         * route supplied for this project does not currently
         * include a forecast CSV export endpoint.
         */}
      </div>
    );
  }

  function renderReport(report: ReportType) {
    switch (report) {
      case "hospital":
        return renderHospitalReport();

      case "treatment":
        return renderTreatmentReport();

      case "readmission":
        return renderReadmissionReport();

      case "forecast":
        return renderForecastReport();

      default:
        return null;
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />

          <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded bg-slate-200" />

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {REPORTS.map((report) => (
              <div
                key={report.id}
                className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <EmptyState
          title="Sign in required"
          description="Please sign in to view HealthForecast reports."
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <FileText size={16} />
              Reports & Exports
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Healthcare Reports
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review live hospital analytics, treatment
              effectiveness, readmission risk distribution,
              and forecast results.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Report cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {REPORTS.map((report) => {
            const Icon = report.icon;

            const available =
              report.id === "hospital"
                ? canHospital
                : report.id === "treatment"
                  ? canTreatment
                  : report.id === "readmission"
                    ? canHospital
                    : canForecast;

            return (
              <div
                key={report.id}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={22} />
                  </div>

                  {!available && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      Restricted
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-lg font-semibold text-slate-900">
                  {report.title}
                </h2>

                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                  {report.description}
                </p>

                <button
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    if (available) {
                      setSelectedReport(
                        report.id,
                      );
                    }
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText size={16} />
                  View Report
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Report modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 sm:p-8">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    HealthForecast AI
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {
                      REPORTS.find(
                        (report) =>
                          report.id ===
                          selectedReport,
                      )?.title
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedReport(null)
                  }
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close report"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 sm:p-6">
                {renderReport(selectedReport)}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<{
    size?: string | number;
    className?: string;
  }>;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <FileText size={20} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}