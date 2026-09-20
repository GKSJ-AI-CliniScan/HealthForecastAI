"use client";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  Activity,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import "./../readmission-forecast.css";


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
   MOCK READMISSION DATA
===================================================== */

const readmissionResults: Record<
  string,
  {
    probability: number;
    level: "Low Risk" | "Medium Risk" | "High Risk";
    period: string;
    factors: string[];
  }
> = {

  P001: {
    probability: 78,
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
    probability: 71,
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
    probability: 48,
    level: "Medium Risk",
    period: "30 days",

    factors: [
      "Hypertension",
      "Recent medication changes",
      "Previous outpatient visits",
    ],
  },

  P004: {
    probability: 21,
    level: "Low Risk",
    period: "30 days",

    factors: [
      "Stable condition",
      "No recent admission",
      "Responding to current treatment",
    ],
  },

  P005: {
    probability: 27,
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

export default function ReadmissionForecastPatientPage() {

  const params = useParams();

  const router = useRouter();

  const searchParams = useSearchParams();

  /*
   * Checks where the doctor came from.
   *
   * From Patient Overview:
   * /doctor/readmission-forecast/P001?from=overview
   *
   * Independently:
   * /doctor/readmission-forecast/P001
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
     FIND READMISSION RESULT
  ===================================================== */

  const result =
    readmissionResults[patientId];


  /* =====================================================
     PATIENT NOT FOUND
  ===================================================== */

  if (!patient || !result) {

    return (
      <div className="readmission-page">

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
              router.push(
                "/doctor/readmission-forecast"
              )
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

    <div className="readmission-page">


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="readmission-header">

        <p className="readmission-eyebrow">
          AI INTELLIGENCE
        </p>

        <h1>
          Readmission Forecast
        </h1>

        <p className="readmission-description">
          Predict the likelihood of patient readmission
          using clinical and historical data.
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

            // Doctor came from Patient Overview
            router.push(
              `/doctor/patients/${patient.id}`
            );

          } else {

            // Doctor came independently
            router.push(
              "/doctor/readmission-forecast"
            );

          }

        }}
      >

        <ArrowLeft size={17} />

        {fromOverview
          ? "Back to Patient Overview"
          : "Back to Readmission Forecast"}

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
          FORECAST TITLE
      ================================================= */}

      <div className="assessment-title">

        <div>

          <p className="readmission-eyebrow">
            PATIENT READMISSION FORECAST
          </p>

          <h2>
            Current Readmission Forecast
          </h2>

          <p>
            Predicted readmission probability based on
            available patient data.
          </p>

        </div>


        <div className="assessment-period">

          <CalendarDays size={17} />

          <span>
            {result.period}
          </span>

        </div>

      </div>


      {/* =================================================
          FORECAST RESULT
      ================================================= */}

      <div className="risk-result-grid">


        {/* =================================================
            READMISSION PROBABILITY
        ================================================= */}

        <div className="risk-score-card">

          <div className="result-card-header">

            <div className="result-icon blue">
              <Activity size={20} />
            </div>

            <span>
              Readmission Probability
            </span>

          </div>


          <div className="risk-score">

            <strong>
              {result.probability}%
            </strong>

            <div className="score-bar">

              <div
                className={`score-fill ${getRiskClass(
                  result.level
                )}`}
                style={{
                  width: `${result.probability}%`,
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
              Forecast Risk
            </span>

          </div>


          <div
            className={`risk-level ${getRiskClass(
              result.level
            )}`}
          >

            <span className="risk-dot" />

            {result.level}

          </div>


          <p>
            Estimated likelihood of readmission
            within the forecast period.
          </p>

        </div>

      </div>


      {/* =================================================
          READMISSION FACTORS
      ================================================= */}

      <div className="risk-factors-card">

        <div className="factors-header">

          <div className="result-icon orange">

            <AlertTriangle size={19} />

          </div>

          <div>

            <h2>
              Readmission Risk Factors
            </h2>

            <p>
              Factors contributing to the predicted
              readmission probability.
            </p>

          </div>

        </div>


        <div className="risk-factors-list">

          {result.factors.map(
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

        <Activity size={15} />

        <p>
          This forecast is generated from available
          patient data and should support, not replace,
          clinical decision-making.
        </p>

      </div>


    </div>
  );
}