"use client";

import {
  Activity,
  Server,
  Database,
  BrainCircuit,
  Cpu,
  HardDrive,
  MemoryStick,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from "lucide-react";

import "./monitoring.css";


const services = [
  {
    name: "System Status",
    description: "HealthForecast AI platform",
    status: "Operational",
    icon: <Server size={20} />,
  },
  {
    name: "API Services",
    description: "Application API connectivity",
    status: "Operational",
    icon: <Activity size={20} />,
  },
  {
    name: "Database",
    description: "Primary database connection",
    status: "Operational",
    icon: <Database size={20} />,
  },
  {
    name: "AI Services",
    description: "Prediction and ML services",
    status: "Operational",
    icon: <BrainCircuit size={20} />,
  },
];


const resources = [
  {
    name: "CPU Usage",
    value: 32,
    icon: <Cpu size={19} />,
  },
  {
    name: "Memory Usage",
    value: 48,
    icon: <MemoryStick size={19} />,
  },
  {
    name: "Storage Usage",
    value: 61,
    icon: <HardDrive size={19} />,
  },
];


const errors = [
  {
    title: "API response delay detected",
    module: "Prediction API",
    time: "10:18 AM",
    severity: "Warning",
  },
  {
    title: "Failed login attempt",
    module: "Authentication",
    time: "09:47 AM",
    severity: "Info",
  },
  {
    title: "Database connection retry",
    module: "Database",
    time: "08:32 AM",
    severity: "Warning",
  },
];


const activities = [
  {
    action: "System health check completed",
    user: "System Monitor",
    time: "10:42 AM",
  },
  {
    action: "AI service status verified",
    user: "System Monitor",
    time: "10:30 AM",
  },
  {
    action: "Database connection checked",
    user: "System Monitor",
    time: "10:15 AM",
  },
  {
    action: "API services restarted",
    user: "System Administrator",
    time: "09:55 AM",
  },
];


export default function SystemMonitoringPage() {

  return (
    <div className="monitoring-page">

      {/* HEADER */}

      <div className="monitoring-page-header">

        <div>

          <p className="monitoring-eyebrow">
            SYSTEM ADMINISTRATION
          </p>

          <h1>
            System Monitoring
          </h1>

          <p className="monitoring-description">
            Monitor platform health, services, resources and system activity.
          </p>

        </div>


        <button className="monitoring-refresh">
          <RefreshCw size={16} />
          Refresh Status
        </button>

      </div>


      {/* OVERALL STATUS */}

      <div className="overall-status">

        <div className="overall-status-icon">
          <CheckCircle2 size={25} />
        </div>

        <div>

          <strong>
            All Systems Operational
          </strong>

          <p>
            HealthForecast AI platform is running normally.
          </p>

        </div>

        <span>
          Updated just now
        </span>

      </div>


      {/* SERVICE STATUS */}

      <section className="monitoring-section">

        <div className="monitoring-section-header">

          <div>
            <h2>
              Service Status
            </h2>

            <p>
              Current status of critical platform services.
            </p>
          </div>

        </div>


        <div className="service-grid">

          {services.map((service) => (

            <div
              className="monitoring-service-card"
              key={service.name}
            >

              <div className="service-card-top">

                <div className="monitoring-service-icon">
                  {service.icon}
                </div>

                <span className="operational-badge">
                  <span />
                  Operational
                </span>

              </div>


              <h3>
                {service.name}
              </h3>

              <p>
                {service.description}
              </p>

            </div>

          ))}

        </div>

      </section>


      {/* RESOURCES */}

      <section className="monitoring-section">

        <div className="monitoring-section-header">

          <div>
            <h2>
              System Resources
            </h2>

            <p>
              Current infrastructure resource utilization.
            </p>
          </div>

        </div>


        <div className="resource-grid">

          {resources.map((resource) => (

            <div
              className="monitoring-resource-card"
              key={resource.name}
            >

              <div className="resource-card-header">

                <div className="resource-icon">
                  {resource.icon}
                </div>

                <span>
                  {resource.value}%
                </span>

              </div>


              <div className="resource-name">
                {resource.name}
              </div>


              <div className="monitoring-progress">

                <div
                  className="monitoring-progress-value"
                  style={{
                    width: `${resource.value}%`,
                  }}
                />

              </div>


              <small>
                Current usage
              </small>

            </div>

          ))}

        </div>

      </section>


      {/* LOWER GRID */}

      <div className="monitoring-lower-grid">


        {/* RECENT ERRORS */}

        <section className="monitoring-card">

          <div className="monitoring-card-header">

            <div>

              <h2>
                Recent System Events
              </h2>

              <p>
                Recent warnings and system events.
              </p>

            </div>

            <AlertTriangle
              size={19}
              className="warning-header-icon"
            />

          </div>


          <div className="error-list">

            {errors.map((error, index) => (

              <div
                className="error-row"
                key={index}
              >

                <div className="error-icon">
                  <AlertTriangle size={15} />
                </div>

                <div className="error-info">

                  <strong>
                    {error.title}
                  </strong>

                  <span>
                    {error.module}
                  </span>

                </div>

                <div className="error-time">

                  <strong>
                    {error.time}
                  </strong>

                  <span className={error.severity === "Warning"
                    ? "severity-warning"
                    : "severity-info"}
                  >
                    {error.severity}
                  </span>

                </div>

              </div>

            ))}

          </div>

        </section>


        {/* ACTIVITY */}

        <section className="monitoring-card">

          <div className="monitoring-card-header">

            <div>

              <h2>
                Monitoring Activity
              </h2>

              <p>
                Recent system monitoring actions.
              </p>

            </div>

            <Clock3 size={19} />

          </div>


          <div className="monitoring-activity-list">

            {activities.map((activity, index) => (

              <div
                className="monitoring-activity-row"
                key={index}
              >

                <div className="activity-status-icon">
                  <CheckCircle2 size={15} />
                </div>

                <div className="monitoring-activity-info">

                  <strong>
                    {activity.action}
                  </strong>

                  <span>
                    {activity.user}
                  </span>

                </div>

                <time>
                  {activity.time}
                </time>

              </div>

            ))}

          </div>

        </section>

      </div>


      {/* FOOTER */}

      <footer className="monitoring-footer">

        <span>
          © 2026 HealthForecast AI
        </span>

        <span>
          Last system check: Just now
        </span>

        <span className="footer-operational">
          <span />
          Platform Operational
        </span>

      </footer>

    </div>
  );
}