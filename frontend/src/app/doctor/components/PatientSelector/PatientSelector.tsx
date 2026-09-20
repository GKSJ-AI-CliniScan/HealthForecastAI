"use client";

import { useMemo, useState } from "react";
import { Search, UserRound, ArrowRight } from "lucide-react";

import "./PatientSelector.css";

export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  status: "Active" | "High Risk" | "Monitoring";
};

/* =====================================================
   MOCK PATIENT DATA
   No backend/API required
===================================================== */

const mockPatients: Patient[] = [
  {
    id: "P001",
    name: "Ananya Sharma",
    age: 45,
    gender: "Female",
    condition: "Diabetes",
    status: "Active",
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
    status: "Active",
  },
  {
    id: "P004",
    name: "Arjun Patel",
    age: 55,
    gender: "Male",
    condition: "Diabetes",
    status: "Monitoring",
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
   PROPS
===================================================== */

type PatientSelectorProps = {
  onSelect: (patient: Patient) => void;
};

/* =====================================================
   COMPONENT
===================================================== */

export default function PatientSelector({
  onSelect,
}: PatientSelectorProps) {
  const [search, setSearch] = useState("");

  /* =====================================================
     FILTER PATIENTS
  ===================================================== */

  const filteredPatients = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    if (!searchValue) {
      return mockPatients;
    }

    return mockPatients.filter((patient) => {
      return (
        patient.id.toLowerCase().includes(searchValue) ||
        patient.name.toLowerCase().includes(searchValue) ||
        patient.condition.toLowerCase().includes(searchValue) ||
        patient.status.toLowerCase().includes(searchValue)
      );
    });
  }, [search]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="patient-selector">

      {/* PAGE HEADER */}

      <div className="patient-selector-header">
        <div>
          <p className="patient-selector-label">
            Patient Selection
          </p>

          <h2 className="patient-selector-title">
            Select a Patient
          </h2>

          <p className="patient-selector-description">
            Search and select a patient to continue.
          </p>
        </div>
      </div>


      {/* SEARCH */}

      <div className="patient-selector-search">

        <Search size={19} />

        <input
          type="text"
          placeholder="Search by name, patient ID or condition..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

      </div>


      {/* PATIENT LIST */}

      <div className="patient-selector-list">

        {filteredPatients.map((patient) => (
          <div
            className="patient-selector-row"
            key={patient.id}
          >

            {/* AVATAR */}

            <div className="patient-selector-avatar">
              <UserRound size={20} />
            </div>


            {/* PATIENT INFORMATION */}

            <div className="patient-selector-info">

              <div className="patient-selector-name">
                {patient.name}
              </div>

              <div className="patient-selector-meta">
                <span>{patient.id}</span>
                <span>•</span>
                <span>{patient.age} years</span>
                <span>•</span>
                <span>{patient.gender}</span>
                <span>•</span>
                <span>{patient.condition}</span>
              </div>

            </div>


            {/* STATUS */}

            <div className="patient-selector-status-wrapper">

              <span
                className={
                  patient.status === "High Risk"
                    ? "patient-selector-status risk"
                    : patient.status === "Monitoring"
                    ? "patient-selector-status monitoring"
                    : "patient-selector-status active"
                }
              >
                {patient.status}
              </span>

            </div>


            {/* SELECT BUTTON */}

            <button
              type="button"
              className="patient-selector-button"
              onClick={() => onSelect(patient)}
            >
              <span>Select Patient</span>
              <ArrowRight size={17} />
            </button>

          </div>
        ))}


        {/* NO PATIENTS */}

        {filteredPatients.length === 0 && (
          <div className="patient-selector-empty">

            <UserRound size={30} />

            <p>No patients found.</p>

            <span>
              Try another name, patient ID or condition.
            </span>

          </div>
        )}

      </div>

    </div>
  );
}