"use client";

import {
  Database,
  Download,
  Eye,
  Filter,
  Search,
  X,
  FileText,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { useMemo, useState } from "react";

import "./datasets.css";

type DatasetStatus = "Available" | "Processing";

type Dataset = {
  id: string;
  name: string;
  description: string;
  records: string;
  size: string;
  updated: string;
  status: DatasetStatus;
};

const datasets: Dataset[] = [
  {
    id: "DS-001",
    name: "Readmission Dataset",
    description: "Anonymized hospital readmission records",
    records: "12,450",
    size: "18.4 MB",
    updated: "Sep 28, 2026",
    status: "Available",
  },
  {
    id: "DS-002",
    name: "Treatment Outcomes",
    description: "Treatment effectiveness and recovery outcomes",
    records: "8,920",
    size: "14.7 MB",
    updated: "Sep 26, 2026",
    status: "Available",
  },
  {
    id: "DS-003",
    name: "Population Health",
    description: "Anonymized population health information",
    records: "18,420",
    size: "26.2 MB",
    updated: "Sep 25, 2026",
    status: "Available",
  },
  {
    id: "DS-004",
    name: "Recovery Outcomes",
    description: "Patient recovery and outcome patterns",
    records: "7,640",
    size: "11.8 MB",
    updated: "Sep 22, 2026",
    status: "Available",
  },
  {
    id: "DS-005",
    name: "Clinical Trends",
    description: "Aggregated clinical trend information",
    records: "15,280",
    size: "21.5 MB",
    updated: "Sep 20, 2026",
    status: "Available",
  },
  {
    id: "DS-006",
    name: "Healthcare Utilization",
    description: "Anonymized healthcare utilization patterns",
    records: "9,840",
    size: "16.1 MB",
    updated: "Sep 18, 2026",
    status: "Processing",
  },
];

export default function ResearchDatasetsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | DatasetStatus
  >("All");

  const [showFilter, setShowFilter] = useState(false);
  const [selectedDataset, setSelectedDataset] =
    useState<Dataset | null>(null);

  const filteredDatasets = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return datasets.filter((dataset) => {
      const matchesSearch =
        search === "" ||
        dataset.name.toLowerCase().includes(search) ||
        dataset.id.toLowerCase().includes(search) ||
        dataset.description.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        dataset.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const handleDownload = (dataset: Dataset) => {
    if (dataset.status === "Processing") {
      return;
    }

    alert(
      `Download requested for ${dataset.name} (${dataset.id})`
    );
  };

  return (
    <div className="datasets-page">

      {/* =====================================================
          BREADCRUMB
      ===================================================== */}

      <div className="datasets-breadcrumb">
        <span>Healthcare Researcher</span>
        <span>/</span>
        <span>Research Datasets</span>
      </div>

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="datasets-header">

        <div className="datasets-header-left">
          <p className="datasets-eyebrow">
            RESEARCH DATA
          </p>

          <h1 className="datasets-title">
            Research Datasets
          </h1>

          <p className="datasets-description">
            Access approved anonymized datasets for healthcare
            research and analysis.
          </p>
        </div>

        <button
          type="button"
          className="datasets-export-button"
          onClick={() =>
            alert("Dataset export request created.")
          }
        >
          <Download size={17} />
          Export Data
        </button>

      </div>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div className="datasets-summary-grid">

        <div className="datasets-summary-card">
          <p className="datasets-summary-label">
            Total Datasets
          </p>

          <h2 className="datasets-summary-value">
            12
          </h2>

          <p className="datasets-summary-meta">
            Research datasets
          </p>
        </div>

        <div className="datasets-summary-card">
          <p className="datasets-summary-label">
            Total Records
          </p>

          <h2 className="datasets-summary-value">
            18,420
          </h2>

          <p className="datasets-summary-meta">
            Anonymized records
          </p>
        </div>

        <div className="datasets-summary-card">
          <p className="datasets-summary-label">
            Available
          </p>

          <h2 className="datasets-summary-value">
            11
          </h2>

          <p className="datasets-summary-meta">
            Ready for research
          </p>
        </div>

        <div className="datasets-summary-card">
          <p className="datasets-summary-label">
            Processing
          </p>

          <h2 className="datasets-summary-value">
            1
          </h2>

          <p className="datasets-summary-meta">
            Currently updating
          </p>
        </div>

      </div>

      {/* =====================================================
          DATASET CARD
      ===================================================== */}

      <section className="datasets-card">

        {/* Card heading */}

        <div className="datasets-card-header">

          <div className="datasets-card-heading">

            <h2 className="datasets-card-title">
              Available Datasets
            </h2>

            <p className="datasets-card-subtitle">
              Browse approved datasets available for research.
            </p>

          </div>

        </div>

        {/* ===================================================
            SEARCH / FILTER
        =================================================== */}

        <div className="datasets-toolbar">

          <div className="datasets-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />

          </div>

          <div className="datasets-filter-wrapper">

            <button
              type="button"
              className="datasets-filter-button"
              onClick={() =>
                setShowFilter(!showFilter)
              }
            >
              <Filter size={16} />
              Filter
            </button>

            {showFilter && (
              <div className="datasets-filter-menu">

                <button
                  type="button"
                  className={
                    statusFilter === "All"
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setStatusFilter("All");
                    setShowFilter(false);
                  }}
                >
                  All Datasets
                </button>

                <button
                  type="button"
                  className={
                    statusFilter === "Available"
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setStatusFilter("Available");
                    setShowFilter(false);
                  }}
                >
                  Available
                </button>

                <button
                  type="button"
                  className={
                    statusFilter === "Processing"
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setStatusFilter("Processing");
                    setShowFilter(false);
                  }}
                >
                  Processing
                </button>

              </div>
            )}

          </div>

        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        <div className="datasets-table-wrapper">

          <table className="datasets-table">

            <thead>
              <tr>
                <th>Dataset</th>
                <th>Records</th>
                <th>Size</th>
                <th>Last Updated</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredDatasets.length > 0 ? (
                filteredDatasets.map((dataset) => (
                  <tr key={dataset.id}>

                    {/* =====================================
                        DATASET
                    ====================================== */}

                    <td>

                      <div className="dataset-info">

                        <div className="dataset-icon">
                          <Database size={20} />
                        </div>

                        <div className="dataset-details">

                          <p className="dataset-name">
                            {dataset.name}
                          </p>

                          <p className="dataset-description">
                            {dataset.description}
                          </p>

                          <span className="dataset-id">
                            {dataset.id}
                          </span>

                        </div>

                      </div>

                    </td>

                    {/* =====================================
                        RECORDS
                    ====================================== */}

                    <td>
                      <span className="datasets-records">
                        {dataset.records}
                      </span>
                    </td>

                    {/* =====================================
                        SIZE
                    ====================================== */}

                    <td>
                      <span className="datasets-size">
                        {dataset.size}
                      </span>
                    </td>

                    {/* =====================================
                        DATE
                    ====================================== */}

                    <td>
                      <span className="datasets-date">
                        {dataset.updated}
                      </span>
                    </td>

                    {/* =====================================
                        STATUS
                    ====================================== */}

                    <td>

                      <span
                        className={`dataset-status ${
                          dataset.status === "Available"
                            ? "available"
                            : "processing"
                        }`}
                      >

                        <span className="dataset-status-dot" />

                        {dataset.status}

                      </span>

                    </td>

                    {/* =====================================
                        ACTIONS
                    ====================================== */}

                    <td>

                      <div className="dataset-actions">

                        <button
                          type="button"
                          className="dataset-action-button"
                          title="View dataset"
                          onClick={() =>
                            setSelectedDataset(dataset)
                          }
                        >
                          <Eye size={20} />
                        </button>

                        <button
                          type="button"
                          className="dataset-action-button"
                          title={
                            dataset.status === "Processing"
                              ? "Dataset is still processing"
                              : "Download dataset"
                          }
                          disabled={
                            dataset.status === "Processing"
                          }
                          onClick={() =>
                            handleDownload(dataset)
                          }
                        >
                          <Download size={20} />
                        </button>

                      </div>

                    </td>

                  </tr>
                ))
              ) : (

                <tr>
                  <td
                    colSpan={6}
                    className="datasets-empty"
                  >
                    <Database size={28} />

                    <strong>
                      No datasets found
                    </strong>

                    <span>
                      Try changing your search or filter.
                    </span>
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* =====================================================
          DATA ACCESS NOTICE
      ===================================================== */}

      <div className="datasets-notice">

        <div className="datasets-notice-icon">
          <CheckCircle2 size={17} />
        </div>

        <div className="datasets-notice-content">

          <p className="datasets-notice-title">
            Research Data Access
          </p>

          <p className="datasets-notice-text">
            All datasets are anonymized and available only
            for approved healthcare research purposes.
          </p>

        </div>

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="datasets-footer">

        <span>
          © 2026 <strong>HealthForecast AI</strong>
        </span>

        <span>
          Research Data Platform
        </span>

      </footer>

      {/* =====================================================
          VIEW DATASET MODAL
      ===================================================== */}

      {selectedDataset && (
        <div
          className="dataset-modal-overlay"
          onClick={() => setSelectedDataset(null)}
        >

          <div
            className="dataset-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="dataset-modal-header">

              <div className="dataset-modal-title-area">

                <div className="dataset-modal-icon">
                  <FileText size={21} />
                </div>

                <div>

                  <p className="dataset-modal-eyebrow">
                    DATASET DETAILS
                  </p>

                  <h2>
                    {selectedDataset.name}
                  </h2>

                </div>

              </div>

              <button
                type="button"
                className="dataset-modal-close"
                onClick={() =>
                  setSelectedDataset(null)
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="dataset-modal-body">

              <div className="dataset-modal-description">
                {selectedDataset.description}
              </div>

              <div className="dataset-modal-grid">

                <div className="dataset-modal-item">
                  <span>Dataset ID</span>
                  <strong>
                    {selectedDataset.id}
                  </strong>
                </div>

                <div className="dataset-modal-item">
                  <span>Records</span>
                  <strong>
                    {selectedDataset.records}
                  </strong>
                </div>

                <div className="dataset-modal-item">
                  <span>Dataset Size</span>
                  <strong>
                    {selectedDataset.size}
                  </strong>
                </div>

                <div className="dataset-modal-item">
                  <span>Last Updated</span>
                  <strong>
                    {selectedDataset.updated}
                  </strong>
                </div>

              </div>

              <div className="dataset-modal-status">

                {selectedDataset.status === "Available" ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      Dataset is available for research.
                    </span>
                  </>
                ) : (
                  <>
                    <Clock3 size={18} />
                    <span>
                      Dataset is currently being processed.
                    </span>
                  </>
                )}

              </div>

            </div>

            <div className="dataset-modal-footer">

              <button
                type="button"
                className="dataset-modal-secondary"
                onClick={() =>
                  setSelectedDataset(null)
                }
              >
                Close
              </button>

              <button
                type="button"
                className="dataset-modal-primary"
                disabled={
                  selectedDataset.status === "Processing"
                }
                onClick={() => {
                  handleDownload(selectedDataset);
                  setSelectedDataset(null);
                }}
              >
                <Download size={16} />
                Download Dataset
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}