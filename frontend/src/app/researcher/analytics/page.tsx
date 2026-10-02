"use client";

import {
  Users,
  Activity,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Filter,
  Download,
} from "lucide-react";

import "./analytics.css";


const populationData = [
  { name: "18–30", value: 18 },
  { name: "31–45", value: 27 },
  { name: "46–60", value: 31 },
  { name: "61–75", value: 18 },
  { name: "76+", value: 6 },
];


const treatmentData = [
  {
    name: "Treatment A",
    effectiveness: 91,
    recovery: 88,
  },
  {
    name: "Treatment B",
    effectiveness: 86,
    recovery: 82,
  },
  {
    name: "Treatment C",
    effectiveness: 94,
    recovery: 91,
  },
  {
    name: "Treatment D",
    effectiveness: 81,
    recovery: 77,
  },
];


const readmissionData = [
  { month: "May", value: 12.4 },
  { month: "Jun", value: 11.8 },
  { month: "Jul", value: 11.2 },
  { month: "Aug", value: 10.7 },
  { month: "Sep", value: 10.2 },
];


const conditionData = [
  {
    condition: "Cardiovascular",
    percentage: 28,
  },
  {
    condition: "Diabetes",
    percentage: 22,
  },
  {
    condition: "Respiratory",
    percentage: 18,
  },
  {
    condition: "Neurological",
    percentage: 14,
  },
  {
    condition: "Other",
    percentage: 18,
  },
];


export default function ResearchAnalyticsPage() {

  return (
    <div className="research-analytics-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="research-analytics-header">

        <div>

          <p className="research-analytics-eyebrow">
            RESEARCH INTELLIGENCE
          </p>

          <h1>
            Research Analytics
          </h1>

          <p>
            Analyze population health, treatment outcomes,
            readmission patterns and healthcare trends.
          </p>

        </div>


        <div className="research-analytics-actions">

          <button
            type="button"
            className="research-filter-button"
          >
            <Filter size={16} />
            September 2026
          </button>

          <button
            type="button"
            className="research-export-button"
          >
            <Download size={16} />
            Export
          </button>

        </div>

      </div>


      {/* =====================================================
          ANALYTICS SUMMARY
      ===================================================== */}

      <div className="research-analytics-stats">

        <div className="research-analytics-stat">

          <div className="research-analytics-stat-icon">
            <Users size={20} />
          </div>

          <div>

            <span>
              Research Population
            </span>

            <strong>
              18,420
            </strong>

            <small>
              Anonymized records
            </small>

          </div>

        </div>


        <div className="research-analytics-stat">

          <div className="research-analytics-stat-icon">
            <Activity size={20} />
          </div>

          <div>

            <span>
              Treatment Effectiveness
            </span>

            <strong>
              91%
            </strong>

            <small className="analytics-positive">
              +5.1% from previous period
            </small>

          </div>

        </div>


        <div className="research-analytics-stat">

          <div className="research-analytics-stat-icon">
            <TrendingDown size={20} />
          </div>

          <div>

            <span>
              Readmission Rate
            </span>

            <strong>
              10.2%
            </strong>

            <small className="analytics-positive">
              -1.4% from previous period
            </small>

          </div>

        </div>


        <div className="research-analytics-stat">

          <div className="research-analytics-stat-icon">
            <TrendingUp size={20} />
          </div>

          <div>

            <span>
              Recovery Rate
            </span>

            <strong>
              82%
            </strong>

            <small className="analytics-positive">
              +3.2% from previous period
            </small>

          </div>

        </div>

      </div>


      {/* =====================================================
          POPULATION + CONDITIONS
      ===================================================== */}

      <div className="research-analytics-grid">


        {/* POPULATION HEALTH */}

        <section className="research-analytics-card">

          <div className="research-card-title">

            <div>

              <h2>
                Population Health
              </h2>

              <p>
                Research population by age group.
              </p>

            </div>

            <Users size={19} />

          </div>


          <div className="age-chart">

            {populationData.map((item) => (

              <div
                className="age-column"
                key={item.name}
              >

                <div className="age-value">
                  {item.value}%
                </div>

                <div className="age-bar-wrapper">

                  <div
                    className="age-bar"
                    style={{
                      height: `${item.value * 2.4}px`,
                    }}
                  />

                </div>

                <span>
                  {item.name}
                </span>

              </div>

            ))}

          </div>

        </section>


        {/* CONDITIONS */}

        <section className="research-analytics-card">

          <div className="research-card-title">

            <div>

              <h2>
                Disease Distribution
              </h2>

              <p>
                Major conditions in the research population.
              </p>

            </div>

            <BarChart3 size={19} />

          </div>


          <div className="condition-list">

            {conditionData.map((item) => (

              <div
                className="condition-row"
                key={item.condition}
              >

                <div className="condition-label">

                  <span className="condition-dot" />

                  <span>
                    {item.condition}
                  </span>

                </div>

                <strong>
                  {item.percentage}%
                </strong>

              </div>

            ))}

          </div>

        </section>

      </div>


      {/* =====================================================
          TREATMENT EFFECTIVENESS
      ===================================================== */}

      <section className="research-analytics-card treatment-section">

        <div className="research-card-title">

          <div>

            <h2>
              Treatment Effectiveness
            </h2>

            <p>
              Comparison of treatment outcomes across the research population.
            </p>

          </div>

          <Activity size={19} />

        </div>


        <div className="treatment-table">

          <div className="treatment-table-header">

            <span>
              Treatment
            </span>

            <span>
              Effectiveness
            </span>

            <span>
              Recovery Rate
            </span>

          </div>


          {treatmentData.map((treatment) => (

            <div
              className="treatment-row"
              key={treatment.name}
            >

              <strong>
                {treatment.name}
              </strong>


              <div className="treatment-progress-cell">

                <div className="treatment-progress">

                  <div
                    className="treatment-progress-value"
                    style={{
                      width: `${treatment.effectiveness}%`,
                    }}
                  />

                </div>

                <span>
                  {treatment.effectiveness}%
                </span>

              </div>


              <div className="recovery-value">
                {treatment.recovery}%
              </div>

            </div>

          ))}

        </div>

      </section>


      {/* =====================================================
          READMISSION TREND
      ===================================================== */}

      <section className="research-analytics-card readmission-section">

        <div className="research-card-title">

          <div>

            <h2>
              Readmission Trends
            </h2>

            <p>
              Monthly readmission rate across the research population.
            </p>

          </div>

          <TrendingDown
            size={19}
            className="trend-icon"
          />

        </div>


        <div className="readmission-chart">

          {readmissionData.map((item) => (

            <div
              className="readmission-column"
              key={item.month}
            >

              <span className="readmission-value">
                {item.value}%
              </span>

              <div className="readmission-bar-wrapper">

                <div
                  className="readmission-bar"
                  style={{
                    height: `${item.value * 12}px`,
                  }}
                />

              </div>

              <span className="readmission-month">
                {item.month}
              </span>

            </div>

          ))}

        </div>

      </section>


      {/* =====================================================
          RESEARCH TRENDS
      ===================================================== */}

      <section className="research-analytics-card">

        <div className="research-card-title">

          <div>

            <h2>
              Research Trends
            </h2>

            <p>
              Key observations from the current research period.
            </p>

          </div>

        </div>


        <div className="research-trends-grid">

          <div className="research-trend-item">

            <div className="research-trend-number">
              01
            </div>

            <div>

              <strong>
                Readmissions are declining
              </strong>

              <p>
                The research population shows a consistent
                reduction in monthly readmission rates.
              </p>

            </div>

          </div>


          <div className="research-trend-item">

            <div className="research-trend-number">
              02
            </div>

            <div>

              <strong>
                Treatment outcomes improving
              </strong>

              <p>
                Overall treatment effectiveness increased
                during the current research period.
              </p>

            </div>

          </div>


          <div className="research-trend-item">

            <div className="research-trend-number">
              03
            </div>

            <div>

              <strong>
                Recovery rate improving
              </strong>

              <p>
                Recovery outcomes show positive movement
                across the analyzed population.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="research-analytics-footer">

        <span>
          © 2026 HealthForecast AI
        </span>

        <span>
          Research Analytics
        </span>

        <span>
          Data: Anonymized
        </span>

      </footer>

    </div>
  );
}