"use client";

import { useRouter } from "next/navigation";

import PatientSelector, {
  Patient,
} from "../components/PatientSelector/PatientSelector";

import "./readmission-forecast.css";

export default function ReadmissionForecastPage() {
  const router = useRouter();

  const handlePatientSelect = (patient: Patient) => {
    router.push(
      `/doctor/readmission-forecast/${patient.id}`
    );
  };

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
          PATIENT SELECTOR
      ================================================= */}

      <PatientSelector
        onSelect={handlePatientSelect}
      />

    </div>
  );
}