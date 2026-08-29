"use client";

const departments = [
  {
    name: "Cardiology",
    patients: 38,
    readmissions: 4,
    performance: 92,
  },
  {
    name: "General Medicine",
    patients: 46,
    readmissions: 3,
    performance: 88,
  },
  {
    name: "Neurology",
    patients: 21,
    readmissions: 2,
    performance: 94,
  },
  {
    name: "Orthopedics",
    patients: 15,
    readmissions: 3,
    performance: 84,
  },
];

const recentActivity = [
  {
    title: "Monthly hospital report generated",
    description: "August 2026 performance report",
    time: "10 min ago",
    icon: "▤",
  },
  {
    title: "Readmission rate updated",
    description: "Current rate: 10.0%",
    time: "32 min ago",
    icon: "↗",
  },
  {
    title: "Department metrics updated",
    description: "General Medicine",
    time: "1 hour ago",
    icon: "▣",
  },
  {
    title: "Treatment outcomes reviewed",
    description: "34 active treatment records",
    time: "2 hours ago",
    icon: "✓",
  },
];

export default function AdminDashboard() {
  return (
    <main className="admin-page">
      {/* ================= HEADER ================= */}
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-logo">+</div>

          <div>
            <h1>
              HealthForecast <span>AI</span>
            </h1>
            <p>Predictive Healthcare Intelligence</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <button className="admin-icon-button">
            🔔
            <span className="admin-notification-dot" />
          </button>

          <div className="admin-header-divider" />

          <div className="admin-profile">
            <div className="admin-avatar">A</div>

            <div>
              <strong>Hospital Admin</strong>
              <span>Administrator</span>
            </div>

            <span className="admin-chevron">⌄</span>
          </div>
        </div>
      </header>

      <div className="admin-layout">
        {/* ================= SIDEBAR ================= */}
        <aside className="admin-sidebar">
          <div>
            <p className="admin-menu-title">Hospital Management</p>

            <nav className="admin-navigation">
              <a href="#" className="admin-nav active">
                <span>⌂</span>
                Dashboard
              </a>

              <a href="#" className="admin-nav">
                <span>♙</span>
                Patients
                <b>120</b>
              </a>

              <a href="#" className="admin-nav">
                <span>▣</span>
                Departments
              </a>

              <a href="#" className="admin-nav">
                <span>⌂</span>
                Admissions
              </a>

              <a href="#" className="admin-nav">
                <span>↗</span>
                Readmissions
              </a>

              <a href="#" className="admin-nav">
                <span>✓</span>
                Treatments
              </a>

              <a href="#" className="admin-nav">
                <span>◒</span>
                Analytics
              </a>

              <a href="#" className="admin-nav">
                <span>▤</span>
                Reports
              </a>
            </nav>

            <div className="admin-sidebar-line" />

            <p className="admin-menu-title">System</p>

            <nav className="admin-navigation">
              <a href="#" className="admin-nav">
                <span>⚙</span>
                Settings
              </a>

              <a href="#" className="admin-nav">
                <span>?</span>
                Help & Support
              </a>
            </nav>
          </div>

          <div className="admin-sidebar-footer">
            <div className="admin-secure-card">
              <div className="admin-secure-icon">✓</div>

              <div>
                <strong>Secure Workspace</strong>
                <p>Hospital administration portal</p>
              </div>
            </div>

            <p>HealthForecast AI · v1.0</p>
          </div>
        </aside>

        {/* ================= MAIN ================= */}
        <section className="admin-main">
          <div className="admin-content">
            {/* Breadcrumb */}
            <div className="admin-breadcrumb">
              <span>Hospital Management</span>
              <span>/</span>
              <strong>Dashboard</strong>
            </div>

            {/* Heading */}
            <div className="admin-heading-row">
              <div>
                <div className="admin-online">
                  <span />
                  Hospital system operational
                </div>

                <h2>Hospital Overview</h2>

                <p>
                  Monitor hospital performance, patient outcomes and
                  operational activity.
                </p>
              </div>

              <div className="admin-heading-actions">
                <button className="admin-secondary-button">
                  ↻ Refresh
                </button>

                <button className="admin-primary-button">
                  + Generate Report
                </button>
              </div>
            </div>

            {/* ================= STATISTICS ================= */}
            <div className="admin-stat-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <div className="admin-stat-icon blue">♙</div>
                  <span className="admin-positive">+8.2%</span>
                </div>

                <p>Total Patients</p>

                <strong>120</strong>

                <span>Patients currently under care</span>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <div className="admin-stat-icon red">↗</div>
                  <span className="admin-negative">10.0%</span>
                </div>

                <p>Readmission Rate</p>

                <strong>12</strong>

                <span>Readmissions this period</span>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <div className="admin-stat-icon green">✓</div>
                  <span className="admin-positive">94%</span>
                </div>

                <p>Patient Outcomes</p>

                <strong>94%</strong>

                <span>Positive treatment outcomes</span>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <div className="admin-stat-icon orange">▣</div>
                  <span className="admin-neutral">4</span>
                </div>

                <p>Departments</p>

                <strong>4</strong>

                <span>Departments being monitored</span>
              </div>
            </div>

            {/* ================= ANALYTICS ================= */}
            <div className="admin-grid-two">
              {/* Hospital performance */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h3>Hospital Performance</h3>
                    <p>Key operational metrics</p>
                  </div>

                  <button className="admin-more">•••</button>
                </div>

                <div className="admin-performance-body">
                  <div className="admin-performance-item">
                    <div>
                      <span>Patient satisfaction</span>
                      <strong>91%</strong>
                    </div>

                    <div className="admin-progress">
                      <span
                        style={{
                          width: "91%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="admin-performance-item">
                    <div>
                      <span>Treatment effectiveness</span>
                      <strong>88%</strong>
                    </div>

                    <div className="admin-progress">
                      <span
                        style={{
                          width: "88%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="admin-performance-item">
                    <div>
                      <span>Discharge efficiency</span>
                      <strong>84%</strong>
                    </div>

                    <div className="admin-progress">
                      <span
                        style={{
                          width: "84%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="admin-performance-item">
                    <div>
                      <span>Follow-up completion</span>
                      <strong>96%</strong>
                    </div>

                    <div className="admin-progress">
                      <span
                        style={{
                          width: "96%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Readmission */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h3>Readmission Overview</h3>
                    <p>Recent hospital readmissions</p>
                  </div>

                  <button className="admin-outline-small">
                    View Details
                  </button>
                </div>

                <div className="readmission-body">
                  <div className="readmission-number">
                    <strong>12</strong>
                    <span>readmissions</span>
                  </div>

                  <div className="readmission-change">
                    <span>↓ 4.5%</span>
                    <p>Compared with previous period</p>
                  </div>

                  <div className="readmission-chart">
                    <div style={{ height: "45%" }} />
                    <div style={{ height: "65%" }} />
                    <div style={{ height: "50%" }} />
                    <div style={{ height: "75%" }} />
                    <div style={{ height: "58%" }} />
                    <div style={{ height: "42%" }} />
                    <div style={{ height: "35%" }} />
                    <div style={{ height: "28%" }} />
                  </div>

                  <div className="chart-labels">
                    <span>Week 1</span>
                    <span>Week 2</span>
                    <span>Week 3</span>
                    <span>Week 4</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= DEPARTMENTS ================= */}
            <div className="admin-card admin-department-card">
              <div className="admin-card-header">
                <div>
                  <h3>Department Performance</h3>
                  <p>
                    Patient activity and performance across departments
                  </p>
                </div>

                <button className="admin-secondary-button">
                  View all departments →
                </button>
              </div>

              <div className="admin-department-grid">
                {departments.map((department) => (
                  <div
                    className="admin-department"
                    key={department.name}
                  >
                    <div className="department-icon">▣</div>

                    <div className="department-title">
                      <strong>{department.name}</strong>
                      <span>
                        {department.patients} active patients
                      </span>
                    </div>

                    <div className="department-metric">
                      <span>Readmissions</span>
                      <strong>{department.readmissions}</strong>
                    </div>

                    <div className="department-metric">
                      <span>Performance</span>
                      <strong>{department.performance}%</strong>
                    </div>

                    <button className="department-arrow">
                      →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ================= BOTTOM ROW ================= */}
            <div className="admin-grid-two">
              {/* Treatment effectiveness */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h3>Treatment Effectiveness</h3>
                    <p>Current treatment outcome summary</p>
                  </div>
                </div>

                <div className="treatment-summary">
                  <div className="treatment-circle">
                    <div>
                      <strong>88%</strong>
                      <span>Effective</span>
                    </div>
                  </div>

                  <div className="treatment-legend">
                    <div>
                      <span className="legend-dot effective" />
                      <p>Effective</p>
                      <strong>88%</strong>
                    </div>

                    <div>
                      <span className="legend-dot monitoring" />
                      <p>Monitoring</p>
                      <strong>8%</strong>
                    </div>

                    <div>
                      <span className="legend-dot review" />
                      <p>Needs review</p>
                      <strong>4%</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h3>Recent Activity</h3>
                    <p>Latest administrative updates</p>
                  </div>

                  <button className="admin-more">•••</button>
                </div>

                <div className="activity-list">
                  {recentActivity.map((activity) => (
                    <div className="activity-item" key={activity.title}>
                      <div className="activity-icon">
                        {activity.icon}
                      </div>

                      <div>
                        <strong>{activity.title}</strong>
                        <p>{activity.description}</p>
                      </div>

                      <time>{activity.time}</time>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ================= QUICK ACTIONS ================= */}
            <div className="admin-quick-section">
              <div>
                <h3>Quick Actions</h3>
                <p>Frequently used hospital management tools</p>
              </div>

              <div className="admin-quick-grid">
                <button>
                  <span className="quick-action-icon blue">▤</span>
                  <div>
                    <strong>Generate Report</strong>
                    <small>Create hospital performance report</small>
                  </div>
                  <b>→</b>
                </button>

                <button>
                  <span className="quick-action-icon purple">◒</span>
                  <div>
                    <strong>View Analytics</strong>
                    <small>Explore hospital analytics</small>
                  </div>
                  <b>→</b>
                </button>

                <button>
                  <span className="quick-action-icon orange">▣</span>
                  <div>
                    <strong>Departments</strong>
                    <small>Manage department metrics</small>
                  </div>
                  <b>→</b>
                </button>

                <button>
                  <span className="quick-action-icon green">↗</span>
                  <div>
                    <strong>Readmissions</strong>
                    <small>Review readmission trends</small>
                  </div>
                  <b>→</b>
                </button>
              </div>
            </div>

            <footer className="admin-footer">
              <span>
                © 2026 HealthForecast AI · Hospital Administration
              </span>

              <span>Secure clinical workspace</span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}