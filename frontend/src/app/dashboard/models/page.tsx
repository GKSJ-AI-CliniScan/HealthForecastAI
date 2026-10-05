"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Database,
  ServerCog,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { P } from "@/lib/permissions";
import type {
  ActiveModel,
  ModelMetrics,
  RegisteredModel,
} from "@/types";

import {
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  SectionCard,
  StatusPill,
  TableSkeleton,
} from "@/components/ui";

const metricNames = [
  "accuracy",
  "precision",
  "recall",
  "f1",
  "roc_auc",
] as const;

type MetricName = (typeof metricNames)[number];

function formatMetric(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "Not reported";
  }

  return value.toFixed(3);
}

function modelDisplayName(
  model: RegisteredModel,
): string {
  const value = model as RegisteredModel & {
    name?: string;
    model_name?: string;
    filename?: string;
  };

  return (
    value.name ||
    value.model_name ||
    value.filename ||
    "Unnamed model"
  );
}

function modelSize(
  model: RegisteredModel,
): string {
  const value = model as RegisteredModel & {
    size_kb?: number;
    size_mb?: number;
  };

  if (
    value.size_kb !== undefined &&
    value.size_kb !== null
  ) {
    return `${value.size_kb.toLocaleString()} KB`;
  }

  if (
    value.size_mb !== undefined &&
    value.size_mb !== null
  ) {
    return `${value.size_mb.toFixed(2)} MB`;
  }

  return "—";
}

function getActiveName(
  active: ActiveModel | null,
): string {
  if (!active) return "—";

  const value = active as ActiveModel & {
    name?: string;
    model_name?: string;
    filename?: string;
  };

  return (
    value.name ||
    value.model_name ||
    value.filename ||
    "—"
  );
}


function getActiveStatus(
  active: ActiveModel | null,
): string {
  if (!active) return "—";

  const value = active as ActiveModel & {
    status?: string;
  };

  return value.status || "—";
}

export default function Models() {
  const {
    token,
    permissions,
  } = useAuth();

  const allowed =
    permissions.includes(P.models);

  const [models, setModels] = useState<
    RegisteredModel[]
  >([]);

  const [active, setActive] =
    useState<ActiveModel | null>(null);

  const [metrics, setMetrics] =
    useState<ModelMetrics | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!token || !allowed) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadModels() {
      setLoading(true);
      setError("");

      try {
        const [
          registeredModels,
          activeModel,
          modelMetrics,
        ] = await Promise.all([
          apiFetch<RegisteredModel[]>(
            "/models",
            {},
            token ?? undefined,
          ),

          apiFetch<ActiveModel>(
            "/models/active",
            {},
            token ?? undefined,
          ),

          apiFetch<ModelMetrics>(
            "/models/metrics",
            {},
            token ?? undefined,
          ),
        ]);

        if (cancelled) return;

        setModels(
          Array.isArray(registeredModels)
            ? registeredModels
            : [],
        );

        setActive(activeModel ?? null);

        setMetrics(modelMetrics ?? null);
      } catch (err) {
        console.error(
          "Model management request failed:",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load model management data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, [token, allowed]);

  if (!allowed) {
    return (
      <div>
        <PageHeader
          eyebrow="Administration"
          title="Model management"
          description="System administrators only."
        />

        <SectionCard>
          <EmptyState
            title="Model access required"
            message="The current backend exposes model-management endpoints only with model:manage."
            icon={
              <BrainCircuit className="h-5 w-5" />
            }
          />
        </SectionCard>
      </div>
    );
  }

  const activeName = getActiveName(active);
  const activeStatus = getActiveStatus(active);
  
  return (
    <div>
      <PageHeader
        eyebrow="AI model management"
        title="Risk model registry"
        description="View the active serving model, registered model artifacts, and evaluation metrics currently exposed by the backend."
      />

      {error && (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Active model"
          value={
            loading ? "—" : activeName
          }
          detail={
            loading
              ? undefined
              : activeStatus !== "—"
                ? activeStatus
                : "No active model reported"
          }
          icon={
            <BrainCircuit className="h-5 w-5" />
          }
        />

        <KpiCard
          label="Registry entries"
          value={
            loading
              ? "—"
              : models.length
          }
          detail="Model artifacts returned by the registry"
          icon={
            <Database className="h-5 w-5" />
          }
          accent="teal"
        />

        <KpiCard
          label="Serving model"
          value={
            loading ? "—" : activeName
          }
          detail={
            activeStatus !== "—"
              ? `Status: ${activeStatus}`
              : "Version is returned with each risk result"
          }
          icon={
            <ServerCog className="h-5 w-5" />
          }
          accent="navy"
        />
      </div>

      {/* ACTIVE MODEL + METRICS */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard
  title="Active serving model"
  description="Returned by /models/active."
>
  {loading ? (
    <TableSkeleton columns={2} rows={4} />
  ) : (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-sm text-slate-500">
          Name
        </dt>

        <dd className="text-right font-semibold text-slate-900">
          {active?.model_name ?? "—"}
        </dd>
      </div>

      <div className="flex items-center justify-between gap-4">
        <dt className="text-sm text-slate-500">
          Version
        </dt>

        <dd className="text-right font-mono text-sm font-semibold text-slate-900">
          {active?.model_version ?? "—"}
        </dd>
      </div>

      <div className="flex items-start justify-between gap-4">
        <dt className="text-sm text-slate-500">
          Artifact
        </dt>

        <dd className="max-w-[65%] break-all text-right font-mono text-xs text-slate-700">
          {active?.artifact_path ?? "—"}
        </dd>
      </div>

      <div className="flex items-center justify-between gap-4">
        <dt className="text-sm text-slate-500">
          Status
        </dt>

        <dd>
          <StatusPill
            label={active?.status ?? "—"}
            tone={
              active?.status === "loaded"
                ? "success"
                : "neutral"
            }
          />
        </dd>
      </div>
    </div>
  )}
</SectionCard>

        <SectionCard
          title="Evaluation metrics"
          description="The backend currently returns null until evaluation output is populated."
        >
          {loading ? (
            <TableSkeleton
              columns={2}
              rows={5}
            />
          ) : (
            <div className="space-y-3">
              {metricNames.map(
                (metric: MetricName) => {
                  const value =
                    metrics?.[metric];

                  return (
                    <div
                      key={metric}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {metric.replace(
                          "_",
                          " ",
                        )}
                      </span>

                      <span className="font-mono text-sm font-bold text-slate-900">
                        {formatMetric(value)}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* REGISTERED MODELS */}
      <SectionCard
        title="Registered models"
        description="Model artifacts currently returned by the backend registry."
        className="mt-6"
      >
        {loading ? (
          <TableSkeleton
            columns={3}
            rows={3}
          />
        ) : models.length === 0 ? (
          <EmptyState
            title="No registered models"
            message="No model registry records are currently exposed by the backend. The active model remains available above."
            icon={
              <Database className="h-5 w-5" />
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Model artifact
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Size
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Registry status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {models.map(
                  (
                    model,
                    index,
                  ) => {
                    const name =
                      modelDisplayName(
                        model,
                      );

                    const isActive =
                      activeName !== "—" &&
                      name ===
                        activeName;

                    return (
                      <tr
                        key={`${name}-${index}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <BrainCircuit className="h-4 w-4" />
                            </div>

                            <div>
                              <p className="font-mono text-sm font-semibold text-slate-900">
                                {name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Model artifact
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {modelSize(model)}
                        </td>

                        <td className="px-4 py-4">
                          {isActive ? (
                            <StatusPill
                              label="Active"
                              tone="success"
                            />
                          ) : (
                            <StatusPill
                              label="Registered"
                              tone="neutral"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}