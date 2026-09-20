"use client";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ShieldAlert,
  CalendarDays,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import "./../risk-assessment.css";


/* =====================================================
   PATIENT MOCK DATA
===================================================== */

const patients = [
  {
    id: "P001",
    name: "Ananya Sharma",
    age: 45,
    gender: "Female",
    condition: "Diabetes",
  },
  {
    id: "P002",
    name: "Rahul Kumar",
    age: 62,
    gender: "Male",
    condition: "Heart Disease",
  },
  {
    id: "P003",
    name: "Priya Reddy",
    age: 38,
    gender: "Female",
    condition: "Hypertension",
  },
  {
    id: "P004",
    name: "Arjun Patel",
    age: 55,
    gender: "Male",
    condition: "Diabetes",
  },
  {
    id: "P005",
    name: "Sneha Rao",
    age: 41,
    gender: "Female",
    condition: "Asthma",
  },
];


/* =====================================================
   MOCK RISK DATA
   Frontend only - no backend/API
===================================================== */

const riskResults: Record<
  string,
  {
    score: number;
    level: "Low Risk" | "Medium Risk" | "High Risk";
    period: string;
    factors: string[];
  }
> = {

  P001: {
    score: 82,
    level: "High Risk",
    period: "30 days",

    factors: [
      "Previous hospital admission",
      "Diabetes",
      "Multiple comorbidities",
      "Recent treatment changes",
    ],
  },

  P002: {
    score: 76,
    level: "High Risk",
    period: "30 days",

    factors: [
      "Previous cardiac admission",
      "Heart disease",
      "Age above 60",
      "Multiple medications",
    ],
  },

  P003: {
    score: 54,
    level: "Medium Risk",
    period: "30 days",

    factors: [
      "Hypertension",
      "Recent medication changes",
      "Previous outpatient visits",
    ],
  },

  P004: {
    score: 23,
    level: "Low Risk",
    period: "30 days",

    factors: [
      "Stable condition",
      "No recent admission",
      "Responding to current treatment",
    ],
  },

  P005: {
    score: 31,
    level: "Low Risk",
    period: "30 days",

    factors: [
      "Stable condition",
      "No recent admission",
      "Regular follow-up",
    ],
  },

};


/* =====================================================
   PAGE
===================================================== */

export default function RiskAssessmentPatientPage() {

  const params = useParams();

  const router = useRouter();

  const searchParams = useSearchParams();

  /*
   * Checks whether the doctor came
   * from Patient Overview.
   *
   * Example:
   * /doctor/risk-assessment/P001?from=overview
   */
  const fromOverview =
    searchParams.get("from") === "overview";

  const patientId = String(
    params.patientId || ""
  ).toUpperCase();


  /* =====================================================
     FIND PATIENT
  ===================================================== */

  const patient = patients.find(
    (item) => item.id === patientId
  );


  /* =====================================================
     FIND RISK RESULT
  ===================================================== */

  const risk = riskResults[patientId];


  /* =====================================================
     PATIENT NOT FOUND
  ===================================================== */

  if (!patient || !risk) {

    return (
      <div className="risk-page">

        <div className="patient-not-found">

          <h1>
            Patient Not Found
          </h1>

          <p>
            The requested patient could not be found.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/doctor/risk-assessment")
            }
          >
            Back to Patient Selection
          </button>

        </div>

      </div>
    );
  }


  /* =====================================================
     RISK CLASS
  ===================================================== */

  const getRiskClass = (
    level: string
  ) => {

    if (level === "High Risk") {
      return "risk-high";
    }

    if (level === "Medium Risk") {
      return "risk-medium";
    }

    return "risk-low";
  };


  /* =====================================================
     RETURN
  ===================================================== */

  return (

    <div className="risk-page">


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="risk-header">

        <p className="risk-eyebrow">
          AI INTELLIGENCE
        </p>

        <h1>
          Risk Assessment
        </h1>

        <p className="risk-description">
          Assess patient risk using clinical and historical data.
        </p>

      </div>


      {/* =================================================
          BACK BUTTON
      ================================================= */}

      <button
        type="button"
        className="back-selection"
        onClick={() => {

          if (fromOverview) {

            router.push(
              `/doctor/patients/${patient.id}`
            );

          } else {

            router.push(
              "/doctor/risk-assessment"
            );

          }

        }}
      >

        <ArrowLeft size={17} />

        {fromOverview
          ? "Back to Patient Overview"
          : "Back to Risk Assessment"}

      </button>


      {/* =================================================
          PATIENT CARD
      ================================================= */}

      <div className="selected-patient-card">

        <div className="selected-patient-left">

          <div className="large-avatar">

            {patient.name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)}

          </div>


          <div>

            <h2>
              {patient.name}
            </h2>

            <p>
              {patient.id}
              {" • "}
              {patient.age} years
              {" • "}
              {patient.gender}
            </p>

            <span className="condition-badge">
              {patient.condition}
            </span>

          </div>

        </div>

      </div>


      {/* =================================================
          ASSESSMENT TITLE
      ================================================= */}

      <div className="assessment-title">

        <div>

          <p className="risk-eyebrow">
            PATIENT RISK ASSESSMENT
          </p>

          <h2>
            Current Risk Assessment
          </h2>

          <p>
            Risk prediction based on available patient data.
          </p>

        </div>


        <div className="assessment-period">

          <CalendarDays size={17} />

          <span>
            {risk.period}
          </span>

        </div>

      </div>


      {/* =================================================
          RESULT CARDS
      ================================================= */}

      <div className="risk-result-grid">


        {/* =================================================
            RISK SCORE
        ================================================= */}

        <div className="risk-score-card">

          <div className="result-card-header">

            <div className="result-icon blue">
              <ShieldAlert size={20} />
            </div>

            <span>
              Risk Score
            </span>

          </div>


          <div className="risk-score">

            <strong>
              {risk.score}%
            </strong>

            <div className="score-bar">

              <div
                className={`score-fill ${getRiskClass(
                  risk.level
                )}`}
                style={{
                  width: `${risk.score}%`,
                }}
              />

            </div>

          </div>

        </div>


        {/* =================================================
            RISK LEVEL
        ================================================= */}

        <div className="risk-level-card">

          <div className="result-card-header">

            <div className="result-icon red">
              <AlertTriangle size={20} />
            </div>

            <span>
              Risk Level
            </span>

          </div>


          <div
            className={`risk-level ${getRiskClass(
              risk.level
            )}`}
          >

            <span className="risk-dot" />

            {risk.level}

          </div>


          <p>
            Requires clinical attention and monitoring.
          </p>

        </div>

      </div>


      {/* =================================================
          RISK FACTORS
      ================================================= */}

      <div className="risk-factors-card">

        <div className="factors-header">

          <div className="result-icon orange">

            <AlertTriangle size={19} />

          </div>


          <div>

            <h2>
              Risk Factors
            </h2>

            <p>
              Factors contributing to the current assessment.
            </p>

          </div>

        </div>


        <div className="risk-factors-list">

          {risk.factors.map(
            (factor, index) => (

              <div
                className="risk-factor"
                key={index}
              >

                <CheckCircle2 size={17} />

                <span>
                  {factor}
                </span>

              </div>

            )
          )}

        </div>

      </div>


      {/* =================================================
          CLINICAL NOTE
      ================================================= */}

      <div className="assessment-note">

        <ShieldAlert size={15} />

        <p>
          This assessment is generated from available
          patient data and should support, not replace,
          clinical decision-making.
        </p>

      </div>


    </div>
  );
}