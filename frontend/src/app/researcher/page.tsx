"use client";

const researchMetrics = [
  {
    title: "Patient Records",
    value: "1,248",
    description: "Anonymized records available",
    change: "+12.4%",
    icon: "♙",
    type: "blue",
  },
  {
    title: "Readmission Rate",
    value: "10.8%",
    description: "Across available datasets",
    change: "-2.1%",
    icon: "↗",
    type: "orange",
  },
  {
    title: "Treatment Success",
    value: "87.6%",
    description: "Average observed outcome",
    change: "+4.8%",
    icon: "✓",
    type: "green",
  },
  {
    title: "Research Datasets",
    value: "24",
    description: "Datasets available for analysis",
    change: "Active",
    icon: "▣",
    type: "purple",
  },
];

const trends = [
  { month: "Mar", value: 55 },
  { month: "Apr", value: 63 },
  { month: "May", value: 58 },
  { month: "Jun", value: 71 },
  { month: "Jul", value: 76 },
  { month: "Aug", value: 84 },
];

const datasets = [
  {
    name: "Hospital Readmission Study",
    records: "482",
    updated: "Today",
    status: "Available",
  },
  {
    name: "Treatment Outcomes 2026",
    records: "326",
    updated: "Yesterday",
    status: "Available",
  },
  {
    name: "Chronic Disease Analysis",
    records: "275",
    updated: "2 days ago",
    status: "Processing",
  },
  {
    name: "Patient Recovery Trends",
    records: "165",
    updated: "4 days ago",
    status: "Available",
  },
];

export default function ResearcherDashboard() {
  return (
    <main className="research-page">

      {/* HEADER */}
      <header className="research-header">
        <div className="research-brand">
          <div className="research-logo">+</div>

          <div>
            <h1>
              HealthForecast <span>AI</span>
            </h1>

            <p>Predictive Healthcare Intelligence</p>
          </div>
        </div>

        <div className="research-header-right">
          <button className="research-icon-button">
            🔔
            <span />
          </button>

          <div className="research-header-line" />

          <div className="research-profile">
            <div className="research-avatar">R</div>

            <div>
              <strong>Researcher</strong>
              <small>Healthcare Research</small>
            </div>
          </div>
        </div>
      </header>

      <div className="research-layout">

        {/* SIDEBAR */}
        <aside className="research-sidebar">

          <div>
            <p className="research-menu-title">
              Research Workspace
            </p>

            <nav className="research-nav">

              <a href="#" className="research-nav-item active">
                <span>⌂</span>
                Research Overview
              </a>

              <a href="#" className="research-nav-item">
                <span>◒</span>
                Population Analytics
              </a>

              <a href="#" className="research-nav-item">
                <span>↗</span>
                Readmission Trends
              </a>

              <a href="#" className="research-nav-item">
                <span>✓</span>
                Treatment Analysis
              </a>

              <a href="#" className="research-nav-item">
                <span>▣</span>
                Research Datasets
              </a>

              <a href="#" className="research-nav-item">
                <span>▤</span>
                Reports
              </a>

            </nav>

            <div className="research-sidebar-divider" />

            <p className="research-menu-title">
              Workspace
            </p>

            <nav className="research-nav">

              <a href="#" className="research-nav-item">
                <span>⚙</span>
                Settings
              </a>

              <a href="#" className="research-nav-item">
                <span>?</span>
                Help & Support
              </a>

            </nav>
          </div>

          <div className="research-sidebar-bottom">

            <div className="research-anonymous-card">
              <div>✓</div>

              <section>
                <strong>Privacy Protected</strong>

                <p>
                  Research data is anonymized
                  and aggregated.
                </p>
              </section>
            </div>

            <small>
              HealthForecast AI · v1.0
            </small>

          </div>

        </aside>

        {/* MAIN */}
        <section className="research-main">

          <div className="research-content">

            {/* BREADCRUMB */}
            <div className="research-breadcrumb">
              <span>Research Workspace</span>
              <span>/</span>
              <strong>Overview</strong>
            </div>

            {/* HEADING */}
            <div className="research-heading">

              <div>
                <div className="research-status">
                  <span />
                  Research environment operational
                </div>

                <h2>
                  Research Intelligence
                </h2>

                <p>
                  Explore population trends, treatment outcomes
                  and aggregated healthcare insights.
                </p>
              </div>

              <div className="research-heading-buttons">

                <button className="research-secondary">
                  ↻ Refresh
                </button>

                <button className="research-primary">
                  + New Analysis
                </button>

              </div>

            </div>

            {/* METRICS */}
            <div className="research-metric-grid">

              {researchMetrics.map((metric) => (
                <div
                  className="research-metric"
                  key={metric.title}
                >

                  <div className="research-metric-top">

                    <div
                      className={`research-metric-icon ${metric.type}`}
                    >
                      {metric.icon}
                    </div>

                    <span
                      className={
                        metric.change.startsWith("-")
                          ? "research-down"
                          : "research-up"
                      }
                    >
                      {metric.change}
                    </span>

                  </div>

                  <p>{metric.title}</p>

                  <strong>{metric.value}</strong>

                  <small>{metric.description}</small>

                </div>
              ))}

            </div>

            {/* ANALYTICS */}
            <div className="research-two-column">

              {/* Population */}
              <div className="research-card">

                <div className="research-card-header">

                  <div>
                    <h3>Population Health Trends</h3>

                    <p>
                      Aggregated patient population activity
                    </p>
                  </div>

                  <button>Last 6 months ▾</button>

                </div>

                <div className="research-chart">

                  {trends.map((trend) => (
                    <div
                      className="research-chart-column"
                      key={trend.month}
                    >

                      <span>
                        {trend.value}%
                      </span>

                      <div
                        className="research-chart-bar"
                        style={{
                          height: `${trend.value}%`,
                        }}
                      />

                      <small>
                        {trend.month}
                      </small>

                    </div>
                  ))}

                </div>

              </div>

              {/* Insights */}
              <div className="research-card">

                <div className="research-card-header">

                  <div>
                    <h3>Research Insights</h3>

                    <p>
                      Key observations from current datasets
                    </p>
                  </div>

                </div>

                <div className="research-insights">

                  <div className="research-insight green">
                    <span>↗</span>

                    <div>
                      <strong>
                        Treatment outcomes improving
                      </strong>

                      <p>
                        Average positive outcomes increased
                        by 4.8% this period.
                      </p>
                    </div>
                  </div>

                  <div className="research-insight orange">
                    <span>!</span>

                    <div>
                      <strong>
                        Readmission trend declining
                      </strong>

                      <p>
                        Observed readmission rate decreased
                        by 2.1%.
                      </p>
                    </div>
                  </div>

                  <div className="research-insight blue">
                    <span>✦</span>

                    <div>
                      <strong>
                        New research data available
                      </strong>

                      <p>
                        3 datasets were updated recently.
                      </p>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* DATASETS */}
            <div className="research-card research-dataset-card">

              <div className="research-card-header">

                <div>
                  <h3>Research Datasets</h3>

                  <p>
                    Aggregated datasets available for research
                  </p>
                </div>

                <button className="research-secondary">
                  View all datasets →
                </button>

              </div>

              <div className="research-table-wrapper">

                <table className="research-table">

                  <thead>
                    <tr>
                      <th>Dataset</th>
                      <th>Records</th>
                      <th>Last Updated</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>

                    {datasets.map((dataset) => (
                      <tr key={dataset.name}>

                        <td>
                          <div className="dataset-name">
                            <div>▣</div>

                            <section>
                              <strong>
                                {dataset.name}
                              </strong>

                              <small>
                                Anonymized dataset
                              </small>
                            </section>
                          </div>
                        </td>

                        <td>
                          {dataset.records}
                        </td>

                        <td>
                          {dataset.updated}
                        </td>

                        <td>

                          <span
                            className={
                              dataset.status === "Available"
                                ? "dataset-status available"
                                : "dataset-status processing"
                            }
                          >
                            {dataset.status}
                          </span>

                        </td>

                        <td>
                          <button className="dataset-action">
                            →
                          </button>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>

            {/* QUICK ACTIONS */}
            <div className="research-quick-section">

              <div>
                <h3>Research Tools</h3>

                <p>
                  Frequently used research workflows
                </p>
              </div>

              <div className="research-quick-grid">

                <button>
                  <span className="research-tool blue">
                    ◒
                  </span>

                  <div>
                    <strong>Population Analytics</strong>
                    <small>
                      Analyze population trends
                    </small>
                  </div>

                  <b>→</b>
                </button>

                <button>
                  <span className="research-tool purple">
                    ↗
                  </span>

                  <div>
                    <strong>Readmission Analysis</strong>
                    <small>
                      Study readmission patterns
                    </small>
                  </div>

                  <b>→</b>
                </button>

                <button>
                  <span className="research-tool orange">
                    ✓
                  </span>

                  <div>
                    <strong>Treatment Analysis</strong>
                    <small>
                      Compare treatment outcomes
                    </small>
                  </div>

                  <b>→</b>
                </button>

                <button>
                  <span className="research-tool green">
                    ▤
                  </span>

                  <div>
                    <strong>Research Reports</strong>
                    <small>
                      Generate research reports
                    </small>
                  </div>

                  <b>→</b>
                </button>

              </div>

            </div>

            <footer className="research-footer">

              <span>
                © 2026 HealthForecast AI · Research Workspace
              </span>

              <span>
                Privacy-protected research environment
              </span>

            </footer>

          </div>

        </section>

      </div>

    </main>
  );
}