"use client";

const metrics = [
  {
    title: "Total Users",
    value: "124",
    subtitle: "Registered platform users",
    change: "+12% this month",
    icon: "👥",
    color: "green",
  },
  {
    title: "Roles",
    value: "4",
    subtitle: "Active system roles",
    change: "All active",
    icon: "🛡",
    color: "purple",
  },
  {
    title: "Audit Logs",
    value: "1,284",
    subtitle: "System activities",
    change: "+8% this week",
    icon: "▤",
    color: "orange",
  },
  {
    title: "AI Models",
    value: "6",
    subtitle: "Deployed models",
    change: "All operational",
    icon: "✦",
    color: "blue",
  },
];

const activities = [
  {
    initials: "DR",
    user: "Dr. Ananya Sharma",
    role: "Doctor",
    action: "Login",
    module: "Authentication",
    time: "10:42 AM",
    date: "Today",
    ip: "192.168.1.45",
  },
  {
    initials: "HA",
    user: "Hospital Admin",
    role: "Administrator",
    action: "Dataset Update",
    module: "Datasets",
    time: "10:21 AM",
    date: "Today",
    ip: "192.168.1.12",
  },
  {
    initials: "HR",
    user: "Priya Reddy",
    role: "Researcher",
    action: "Model Access",
    module: "AI Models",
    time: "09:54 AM",
    date: "Today",
    ip: "192.168.1.78",
  },
  {
    initials: "SA",
    user: "System Admin",
    role: "Administrator",
    action: "User Created",
    module: "Users",
    time: "09:31 AM",
    date: "Today",
    ip: "192.168.1.10",
  },
  {
    initials: "DR",
    user: "Rahul Kumar",
    role: "Doctor",
    action: "Data Export",
    module: "Reports",
    time: "09:15 AM",
    date: "Today",
    ip: "192.168.1.33",
  },
];

const security = [
  {
    icon: "🔒",
    title: "Authentication Service",
    description: "All authentication systems operational",
  },
  {
    icon: "▤",
    title: "Database",
    description: "Primary database connection stable",
  },
  {
    icon: "✦",
    title: "AI Services",
    description: "ML models and prediction services active",
  },
];

const resources = [
  {
    name: "CPU Usage",
    value: 32,
  },
  {
    name: "Memory Usage",
    value: 48,
  },
  {
    name: "Storage Usage",
    value: 61,
  },
];

export default function SystemAdminDashboard() {
  return (
    <main className="sysadmin-page">

      {/* HEADER */}
      <header className="sysadmin-header">

        <div className="sysadmin-brand">

          <div className="sysadmin-logo">
            ♥
          </div>

          <div>
            <h1>
              HealthForecast <span>AI</span>
            </h1>

            <p>Predictive Healthcare Intelligence</p>
          </div>

        </div>

        <div className="sysadmin-header-right">

          <button className="notification-btn">
            🔔
            <span className="notification-dot" />
          </button>

          <div className="header-divider" />

          <div className="admin-profile">

            <div className="admin-avatar">
              SA
            </div>

            <div>
              <strong>System Administrator</strong>
              <small>System Admin</small>
            </div>

            <span className="profile-arrow">
              ▾
            </span>

          </div>

        </div>

      </header>

      <div className="sysadmin-layout">

        {/* SIDEBAR */}
        <aside className="sysadmin-sidebar">

          <div>

            <p className="sidebar-heading">
              MAIN MENU
            </p>

            <nav className="sysadmin-nav">

              <a href="#" className="sysadmin-nav-item active">
                <span>⌂</span>
                Dashboard
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>♙</span>
                Users
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>♢</span>
                Roles
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>⚿</span>
                Permissions
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>▤</span>
                Audit Logs
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>▣</span>
                Datasets
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>✦</span>
                AI Models
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>⚙</span>
                System Settings
              </a>

            </nav>

            <div className="sidebar-divider" />

            <p className="sidebar-heading">
              SYSTEM
            </p>

            <nav className="sysadmin-nav">

              <a href="#" className="sysadmin-nav-item">
                <span>♢</span>
                Security
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>↗</span>
                Integrations
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>☁</span>
                Backup & Restore
              </a>

              <a href="#" className="sysadmin-nav-item">
                <span>♧</span>
                Notifications
              </a>

            </nav>

          </div>

          {/* SECURITY CARD */}
          <div className="sidebar-security">

            <div className="security-icon">
              ✓
            </div>

            <div>
              <strong>System Secure</strong>

              <p>
                All systems are running
                smoothly
              </p>
            </div>

          </div>

        </aside>

        {/* MAIN CONTENT */}
        <section className="sysadmin-main">

          <div className="sysadmin-content">

            {/* TITLE */}
            <div className="sysadmin-title">

              <div>

                <p className="eyebrow">
                  ADMINISTRATION
                </p>

                <h2>
                  System Overview
                </h2>

                <p className="title-description">
                  Monitor and manage your healthcare
                  intelligence platform.
                </p>

              </div>

              <div className="title-actions">

                <button className="sys-secondary">
                  ↻ Refresh
                </button>

                <button className="sys-primary">
                  + Add User
                </button>

              </div>

            </div>

            {/* METRICS */}
            <div className="sysadmin-metrics">

              {metrics.map((metric) => (

                <div
                  className="sysadmin-metric"
                  key={metric.title}
                >

                  <div className="metric-top">

                    <div
                      className={`metric-icon ${metric.color}`}
                    >
                      {metric.icon}
                    </div>

                    <span className="metric-change">
                      {metric.change}
                    </span>

                  </div>

                  <p>{metric.title}</p>

                  <strong>{metric.value}</strong>

                  <small>{metric.subtitle}</small>

                </div>

              ))}

            </div>

            {/* TWO COLUMN */}
            <div className="sysadmin-grid">

              {/* ACTIVITY */}
              <div className="sysadmin-card activity-card">

                <div className="card-header">

                  <div>
                    <h3>
                      Recent System Activity
                    </h3>

                    <p>
                      Latest actions across the platform
                    </p>
                  </div>

                  <button className="view-button">
                    View All Logs
                  </button>

                </div>

                <div className="activity-table">

                  <div className="table-header">
                    <span>User</span>
                    <span>Action</span>
                    <span>Module</span>
                    <span>Time</span>
                    <span>IP Address</span>
                  </div>

                  {activities.map((activity) => (

                    <div
                      className="activity-row"
                      key={`${activity.user}-${activity.time}`}
                    >

                      <div className="activity-user">

                        <div className="activity-avatar">
                          {activity.initials}
                        </div>

                        <div>
                          <strong>
                            {activity.user}
                          </strong>

                          <small>
                            {activity.role}
                          </small>
                        </div>

                      </div>

                      <span>
                        {activity.action}
                      </span>

                      <span>
                        {activity.module}
                      </span>

                      <div className="activity-time">
                        <strong>
                          {activity.time}
                        </strong>

                        <small>
                          {activity.date}
                        </small>
                      </div>

                      <span className="ip">
                        {activity.ip}
                      </span>

                    </div>

                  ))}

                </div>

                <button className="load-more">
                  Load More
                </button>

              </div>

              {/* RIGHT COLUMN */}
              <div className="right-column">

                {/* SECURITY */}
                <div className="sysadmin-card">

                  <div className="card-header">

                    <div>
                      <h3>
                        🛡 Security Status
                      </h3>

                      <p>
                        Platform services health
                      </p>
                    </div>

                  </div>

                  <div className="security-list">

                    {security.map((item) => (

                      <div
                        className="security-row"
                        key={item.title}
                      >

                        <div className="service-icon">
                          {item.icon}
                        </div>

                        <div className="service-info">

                          <strong>
                            {item.title}
                          </strong>

                          <p>
                            {item.description}
                          </p>

                        </div>

                        <span className="healthy">
                          Healthy
                        </span>

                      </div>

                    ))}

                  </div>

                </div>

                {/* RESOURCES */}
                <div className="sysadmin-card resources-card">

                  <div className="card-header">

                    <div>
                      <h3>
                        System Resources
                      </h3>

                      <p>
                        Current infrastructure usage
                      </p>
                    </div>

                  </div>

                  <div className="resources">

                    {resources.map((resource) => (

                      <div
                        className="resource-row"
                        key={resource.name}
                      >

                        <div className="resource-title">

                          <strong>
                            {resource.name}
                          </strong>

                          <span>
                            {resource.value}%
                          </span>

                        </div>

                        <div className="progress-track">

                          <div
                            className="progress-value"
                            style={{
                              width: `${resource.value}%`,
                            }}
                          />

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

              </div>

            </div>

            {/* MANAGEMENT CARDS */}
            <section className="management-section">

              <div className="section-heading">
                <h3>Administration Tools</h3>

                <p>
                  Manage platform configuration and resources
                </p>
              </div>

              <div className="management-grid">

                <button className="management-card">
                  <div className="management-icon green">
                    ♙
                  </div>

                  <div>
                    <strong>User Management</strong>
                    <small>
                      Create and manage platform users
                    </small>
                  </div>

                  <span>→</span>
                </button>

                <button className="management-card">
                  <div className="management-icon purple">
                    🛡
                  </div>

                  <div>
                    <strong>Roles & Permissions</strong>
                    <small>
                      Configure access control
                    </small>
                  </div>

                  <span>→</span>
                </button>

                <button className="management-card">
                  <div className="management-icon orange">
                    ▤
                  </div>

                  <div>
                    <strong>Audit Logs</strong>
                    <small>
                      Review system activities
                    </small>
                  </div>

                  <span>→</span>
                </button>

                <button className="management-card">
                  <div className="management-icon blue">
                    ✦
                  </div>

                  <div>
                    <strong>AI Model Management</strong>
                    <small>
                      Monitor deployed AI models
                    </small>
                  </div>

                  <span>→</span>
                </button>

              </div>

            </section>

            <footer className="sysadmin-footer">

              <span>
                © 2026 HealthForecast AI
              </span>

              <span>
                System Administration Console
              </span>

              <span>
                Platform Status: Operational
              </span>

            </footer>

          </div>

        </section>

      </div>

    </main>
  );
}