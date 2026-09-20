"use client";

import { useRouter } from "next/navigation";

import PatientSelector, {
  Patient,
} from "../components/PatientSelector/PatientSelector";

import "./clinical-insights.css";

export default function ClinicalInsightsPage() {
  const router = useRouter();

  const handlePatientSelect = (patient: Patient) => {
    router.push(
      `/doctor/clinical-insights/${patient.id}`
    );
  };

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
          PATIENT SELECTION
      ================================================= */}

      <PatientSelector
        onSelect={handlePatientSelect}
      />

    </div>
  );
}