"use client";

import {
  Database,
  Users,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  FileText,
} from "lucide-react";

import "./researcher.css";


const stats = [
  {
    title: "Research Records",
    value: "18,420",
    description: "Anonymized records",
    change: "+8.4%",
    icon: Database,
    changeType: "positive",
  },
  {
    title: "Active Datasets",
    value: "12",
    description: "Available datasets",
    change: "+2 this month",
    icon: Database,
    changeType: "positive",
  },
  {
    title: "Readmission Rate",
    value: "10.2%",
    description: "Research population",
    change: "-1.4%",
    icon: TrendingDown,
    changeType: "positive",
  },
  {
    title: "Treatment Effectiveness",
    value: "91%",
    description: "Overall effectiveness",
    change: "+5.1%",
    icon: Activity,
    changeType: "positive",
  },
];


const populationData = [
  {
    name: "Cardiology",
    percentage: 28,
  },
  {
    name: "General Medicine",
    percentage: 34,
  },
  {
    name: "Neurology",
    percentage: 18,
  },
  {
    name: "Orthopedics",
    percentage: 12,
  },
  {
    name: "Other",
    percentage: 8,
  },
];


const researchInsights = [
  {
    title: "Readmission rate is decreasing",
    description:
      "Overall readmission rate decreased by 1.4% compared with the previous period.",
  },
  {
    title: "Treatment effectiveness improved",
    description:
      "Overall treatment effectiveness increased to 91% across the research population.",
  },
  {
    title: "General Medicine has the largest population",
    description:
      "General Medicine represents 34% of current anonymized research records.",
  },
];


const recentActivity = [
  {
    title: "Readmission dataset updated",
    description: "12,450 anonymized records",
    time: "Today, 10:42 AM",
    icon: Database,
  },
  {
    title: "Treatment analysis completed",
    description: "Treatment outcome analysis",
    time: "Today, 09:55 AM",
    icon: Activity,
  },
  {
    title: "Population analysis updated",
    description: "Population health analysis",
    time: "Yesterday, 04:20 PM",
    icon: Users,
  },
  {
    title: "Research report generated",
    description: "September 2026 analysis",
    time: "Yesterday, 02:15 PM",
    icon: FileText,
  },
];


export default function ResearcherDashboard() {
  return (
    <div className="researcher-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="researcher-page-header">

        <div>

          <p className="researcher-eyebrow">
            RESEARCH INTELLIGENCE
          </p>

          <h2>
            Research Dashboard
          </h2>

          <p className="researcher-page-description">
            Overview of healthcare research data, outcomes and trends.
          </p>

        </div>


        <button
          type="button"
          className="researcher-date-button"
        >
          September 2026
        </button>

      </div>


      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <div className="researcher-stats">

        {stats.map((stat) => {

          const Icon = stat.icon;

          return (
            <div
              className="researcher-stat-card"
              key={stat.title}
            >

              <div className="researcher-stat-top">

                <div className="researcher-stat-icon">
                  <Icon size={20} />
                </div>


                <span
                  className={`researcher-stat-change ${stat.changeType}`}
                >

                  {stat.title === "Readmission Rate" ? (
                    <ArrowDownRight size={14} />
                  ) : (
                    <ArrowUpRight size={14} />
                  )}

                  {stat.change}

                </span>

              </div>


              <p className="researcher-stat-title">
                {stat.title}
              </p>

              <strong className="researcher-stat-value">
                {stat.value}
              </strong>

              <span className="researcher-stat-description">
                {stat.description}
              </span>

            </div>
          );

        })}

      </div>


      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="researcher-main-grid">


        {/* =================================================
            RESEARCH POPULATION
        ================================================= */}

        <section className="researcher-card">

          <div className="researcher-card-header">

            <div>

              <h3>
                Research Population
              </h3>

              <p>
                Distribution of anonymized research records.
              </p>

            </div>

            <BarChart3 size={19} />

          </div>


          <div className="researcher-population">

            {/* DONUT */}

            <div className="researcher-donut">

              <div className="researcher-donut-center">

                <strong>
                  18.4K
                </strong>

                <span>
                  Records
                </span>

              </div>

            </div>


            {/* POPULATION LIST */}

            <div className="researcher-population-list">

              {populationData.map((item) => (

                <div
                  className="researcher-population-row"
                  key={item.name}
                >

                  <div className="researcher-population-name">

                    <span className="researcher-population-dot" />

                    <span>
                      {item.name}
                    </span>

                  </div>


                  <strong>
                    {item.percentage}%
                  </strong>

                </div>

              ))}

            </div>

          </div>

        </section>


        {/* =================================================
            RESEARCH INSIGHTS
        ================================================= */}

        <section className="researcher-card">

          <div className="researcher-card-header">

            <div>

              <h3>
                Research Insights
              </h3>

              <p>
                Key observations from current data.
              </p>

            </div>

          </div>


          <div className="researcher-insights">

            {researchInsights.map(
              (insight, index) => (

                <div
                  className="researcher-insight"
                  key={insight.title}
                >

                  <div className="researcher-insight-number">
                    0{index + 1}
                  </div>


                  <div>

                    <strong>
                      {insight.title}
                    </strong>

                    <p>
                      {insight.description}
                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        </section>

      </div>


      {/* =====================================================
          RECENT ACTIVITY
      ===================================================== */}

      <section className="researcher-card researcher-activity-card">

        <div className="researcher-card-header">

          <div>

            <h3>
              Recent Research Activity
            </h3>

            <p>
              Latest updates across datasets and research analysis.
            </p>

          </div>


          <button
            type="button"
            className="researcher-view-button"
          >
            View Reports
          </button>

        </div>


        <div className="researcher-activity-list">

          {recentActivity.map((item) => {

            const Icon = item.icon;

            return (

              <div
                className="researcher-activity-row"
                key={item.title}
              >

                <div className="researcher-activity-icon">
                  <Icon size={17} />
                </div>


                <div className="researcher-activity-info">

                  <strong>
                    {item.title}
                  </strong>

                  <span>
                    {item.description}
                  </span>

                </div>


                <time>
                  {item.time}
                </time>

              </div>

            );

          })}

        </div>

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="researcher-footer">

        <span>
          © 2026 HealthForecast AI
        </span>

        <span>
          Healthcare Research Intelligence
        </span>

        <span>
          Research Data: Anonymized
        </span>

      </footer>

    </div>
  );
}