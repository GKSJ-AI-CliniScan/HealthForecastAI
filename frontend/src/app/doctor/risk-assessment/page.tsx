"use client";

import { useRouter } from "next/navigation";

import PatientSelector, {
  Patient,
} from "../components/PatientSelector/PatientSelector";

import "./risk-assessment.css";


export default function RiskAssessmentPage() {

  const router = useRouter();


  /* =====================================================
     SELECT PATIENT
  ===================================================== */

  const handlePatientSelect = (patient: Patient) => {

    router.push(
      `/doctor/risk-assessment/${patient.id}`
    );

  };


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
          SHARED PATIENT SELECTOR
      ================================================= */}

      <PatientSelector
        onSelect={handlePatientSelect}
      />

    </div>
  );
}