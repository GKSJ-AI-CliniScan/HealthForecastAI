"use client";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  ShieldAlert,
  Utensils,
  CalendarCheck,
  ClipboardCheck,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

import "./../clinical-insights.css";

/* =====================================================
   MOCK PATIENT DATA
===================================================== */

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  status: string;
};

const patients: Patient[] = [
  {
    id: "P001",
    name: "Ananya Sharma",
    age: 45,
    gender: "Female",
    condition: "Diabetes",
    status: "High Risk",
  },

  {
    id: "P002",
    name: "Rahul Kumar",
    age: 62,
    gender: "Male",
    condition: "Heart Disease",
    status: "High Risk",
  },

  {
    id: "P003",
    name: "Priya Reddy",
    age: 38,
    gender: "Female",
    condition: "Hypertension",
    status: "Monitoring",
  },

  {
    id: "P004",
    name: "Arjun Patel",
    age: 55,
    gender: "Male",
    condition: "Diabetes",
    status: "Active",
  },

  {
    id: "P005",
    name: "Sneha Rao",
    age: 41,
    gender: "Female",
    condition: "Asthma",
    status: "Active",
  },
];

/* =====================================================
   MOCK CLINICAL INSIGHT DATA
   Frontend only - no backend/API
===================================================== */

type ClinicalInsightData = {
  riskMitigation: string;
  careDiet: string;
  followUp: string;
  discharge: string;
};

const clinicalInsights: Record<
  string,
  ClinicalInsightData
> = {
  P001: {
    riskMitigation:
      "Monitor blood glucose regularly and maintain adherence to the prescribed diabetes management plan.",

    careDiet:
      "Maintain a balanced diet with controlled carbohydrate intake and adequate hydration.",

    followUp:
      "Schedule a primary care follow-up within 2 weeks and review glucose readings.",

    discharge:
      "Continue prescribed medications and monitor for changes in glucose levels or other symptoms.",
  },

  P002: {
    riskMitigation:
      "Monitor cardiovascular symptoms and ensure adherence to prescribed cardiac medications.",

    careDiet:
      "Follow a heart-healthy diet with reduced sodium intake and appropriate fluid management.",

    followUp:
      "Schedule a cardiology follow-up and review medication response during the next visit.",

    discharge:
      "Continue cardiac medications as prescribed and seek medical attention if symptoms worsen.",
  },

  P003: {
    riskMitigation:
      "Monitor blood pressure regularly and maintain adherence to the prescribed hypertension treatment plan.",

    careDiet:
      "Follow a balanced, low-sodium diet and maintain adequate hydration.",

    followUp:
      "Review blood pressure readings with the primary care team within 2 to 4 weeks.",

    discharge:
      "Continue prescribed medication and monitor blood pressure consistently after discharge.",
  },

  P004: {
    riskMitigation:
      "Continue monitoring the patient's condition and maintain adherence to the current treatment plan.",

    careDiet:
      "Maintain a balanced diet and adequate hydration according to the patient's clinical needs.",

    followUp:
      "Schedule routine follow-up to evaluate treatment response and overall recovery.",

    discharge:
      "Continue current medications and follow the recommended monitoring schedule.",
  },

  P005: {
    riskMitigation:
      "Monitor respiratory symptoms and avoid known asthma triggers whenever possible.",

    careDiet:
      "Maintain a balanced diet and adequate hydration while following the existing care plan.",

    followUp:
      "Schedule a routine follow-up to review respiratory symptoms and treatment response.",

    discharge:
      "Continue prescribed respiratory medications and follow the recommended action plan.",
  },
};

/* =====================================================
   PAGE
===================================================== */

export default function ClinicalInsightsPatientPage() {
  const params = useParams();

  const router = useRouter();

  const searchParams = useSearchParams();

  /* =====================================================
     CHECK ENTRY POINT
  ===================================================== */

  const fromOverview =
    searchParams.get("from") === "overview";

  /* =====================================================
     GET PATIENT ID
  ===================================================== */

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
     GET INSIGHTS
  ===================================================== */

  const selectedInsights =
    clinicalInsights[patientId];

  /* =====================================================
     PATIENT NOT FOUND
  ===================================================== */

  if (!patient || !selectedInsights) {
    return (
      <div className="clinical-insights-page">

        <div className="clinical-not-found">

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
                "/doctor/clinical-insights"
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
    status: string
  ) => {
    if (status === "High Risk") {
      return "insight-risk-high";
    }

    if (status === "Monitoring") {
      return "insight-risk-medium";
    }

    return "insight-risk-active";
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="clinical-insights-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="clinical-insights-header">

        <p className="clinical-insights-eyebrow">
          AI INTELLIGENCE
        </p>

        <h1>
          Clinical Insights
        </h1>

        <p className="clinical-insights-description">
          AI-generated recommendations based on patient
          clinical and historical data.
        </p>

      </div>

      {/* =================================================
          BACK BUTTON
      ================================================= */}

      <button
        type="button"
        className="clinical-back-button"
        onClick={() => {
          if (fromOverview) {
            router.push(
              `/doctor/patients/${patient.id}`
            );
          } else {
            router.push(
              "/doctor/clinical-insights"
            );
          }
        }}
      >

        <ArrowLeft size={17} />

        {fromOverview
          ? "Back to Patient Overview"
          : "Back to Clinical Insights"}

      </button>

      {/* =================================================
          PATIENT CARD
      ================================================= */}

      <div className="clinical-patient-card">

        <div className="clinical-patient-left">

          <div className="clinical-patient-avatar">

            {patient.name
              .split(" ")
              .map(
                (word) => word[0]
              )
              .join("")
              .slice(0, 2)}

          </div>

          <div className="clinical-patient-info">

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

            <span className="clinical-condition">
              {patient.condition}
            </span>

          </div>

        </div>

        {/* =================================================
            RISK STATUS
        ================================================= */}

        <div
          className={`clinical-risk-badge ${getRiskClass(
            patient.status
          )}`}
        >

          <span />

          {patient.status}

        </div>

      </div>

      {/* =================================================
          INSIGHTS HEADING
      ================================================= */}

      <div className="clinical-section-heading">

        <div>

          <p className="clinical-insights-eyebrow">
            PATIENT-SPECIFIC INSIGHTS
          </p>

          <h2>
            Clinical Recommendations
          </h2>

          <p>
            Suggested actions based on the available
            patient information.
          </p>

        </div>

      </div>

      {/* =================================================
          INSIGHT CARDS
      ================================================= */}

      <div className="clinical-insights-grid">

        {/* =================================================
            RISK MITIGATION
        ================================================= */}

        <div className="clinical-insight-card">

          <div className="clinical-card-header">

            <div className="clinical-card-icon blue">
              <ShieldAlert size={18} />
            </div>

            <div>

              <h3>
                Risk Mitigation Plan
              </h3>

              <span>
                Reduce potential clinical risks
              </span>

            </div>

          </div>

          <div className="clinical-recommendation">

            <CheckCircle2 size={17} />

            <p>
              {selectedInsights.riskMitigation}
            </p>

          </div>

        </div>

        {/* =================================================
            CARE & DIET
        ================================================= */}

        <div className="clinical-insight-card">

          <div className="clinical-card-header">

            <div className="clinical-card-icon green">
              <Utensils size={18} />
            </div>

            <div>

              <h3>
                Care & Diet Recommendation
              </h3>

              <span>
                Support ongoing patient care
              </span>

            </div>

          </div>

          <div className="clinical-recommendation">

            <CheckCircle2 size={17} />

            <p>
              {selectedInsights.careDiet}
            </p>

          </div>

        </div>

        {/* =================================================
            FOLLOW-UP
        ================================================= */}

        <div className="clinical-insight-card">

          <div className="clinical-card-header">

            <div className="clinical-card-icon purple">
              <CalendarCheck size={18} />
            </div>

            <div>

              <h3>
                Follow-up Action Plan
              </h3>

              <span>
                Recommended next steps
              </span>

            </div>

          </div>

          <div className="clinical-recommendation">

            <CheckCircle2 size={17} />

            <p>
              {selectedInsights.followUp}
            </p>

          </div>

        </div>

        {/* =================================================
            DISCHARGE
        ================================================= */}

        <div className="clinical-insight-card">

          <div className="clinical-card-header">

            <div className="clinical-card-icon orange">
              <ClipboardCheck size={18} />
            </div>

            <div>

              <h3>
                Discharge Protocols
              </h3>

              <span>
                Important discharge guidance
              </span>

            </div>

          </div>

          <div className="clinical-recommendation">

            <CheckCircle2 size={17} />

            <p>
              {selectedInsights.discharge}
            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          AI NOTE
      ================================================= */}

      <div className="clinical-ai-note">

        <div className="clinical-ai-note-icon">
          <Lightbulb size={16} />
        </div>

        <div>

          <strong>
            Clinical Decision Support
          </strong>

          <p>
            These insights are generated from available
            patient information and are intended to support
            clinical decision-making. They should not replace
            professional medical judgment.
          </p>

        </div>

      </div>

    </div>
  );
}