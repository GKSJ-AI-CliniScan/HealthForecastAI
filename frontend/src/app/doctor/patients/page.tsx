"use client";

import { useState } from "react";
import { Search, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

import "./patient.css";

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  contact: string;
  status: string;
};

export default function PatientsPage() {
  const router = useRouter();

  /* =====================================================
     PATIENT DATA
  ===================================================== */

  const [patients] = useState<Patient[]>([
    {
      id: "P001",
      name: "Ananya Sharma",
      age: 45,
      gender: "Female",
      condition: "Diabetes",
      contact: "9876543210",
      status: "Active",
    },
    {
      id: "P002",
      name: "Rahul Kumar",
      age: 62,
      gender: "Male",
      condition: "Heart Disease",
      contact: "9876543211",
      status: "High Risk",
    },
    {
      id: "P003",
      name: "Priya Reddy",
      age: 38,
      gender: "Female",
      condition: "Hypertension",
      contact: "9876543212",
      status: "Active",
    },
    {
      id: "P004",
      name: "Arjun Patel",
      age: 55,
      gender: "Male",
      condition: "Diabetes",
      contact: "9876543213",
      status: "Monitoring",
    },
    {
      id: "P005",
      name: "Sneha Rao",
      age: 41,
      gender: "Female",
      condition: "Asthma",
      contact: "9876543214",
      status: "Active",
    },
  ]);

  /* =====================================================
     SEARCH
  ===================================================== */

  const [search, setSearch] = useState("");

  /* =====================================================
     OPEN PATIENT OVERVIEW
  ===================================================== */

  const openPatient = (patient: Patient) => {
    router.push(`/doctor/patients/${patient.id}`);
  };

  /* =====================================================
     SEARCH FILTER
  ===================================================== */

  const filteredPatients = patients.filter((patient) => {
    const searchValue = search.toLowerCase().trim();

    return (
      patient.id.toLowerCase().includes(searchValue) ||
      patient.name.toLowerCase().includes(searchValue) ||
      patient.condition.toLowerCase().includes(searchValue) ||
      patient.status.toLowerCase().includes(searchValue)
    );
  });

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="patients-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="patients-page-header">

        <div>
          <p className="patients-page-label">
            Patient Management
          </p>

          <h1 className="patients-page-title">
            Patients
          </h1>

          <p className="patients-page-description">
            View patients under your care and access their
            medical records.
          </p>
        </div>

      </div>


      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="patients-search">

        <Search size={19} />

        <input
          type="text"
          placeholder="Search by name, patient ID or condition..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

      </div>


      {/* =================================================
          PATIENT TABLE
      ================================================= */}

      <div className="patients-card">

        {/* TABLE HEADER */}

        <div className="patients-table-header">

          <div>PATIENT ID</div>

          <div>NAME</div>

          <div>AGE</div>

          <div>STATUS</div>

          <div>ACTIONS</div>

        </div>


        {/* PATIENT ROWS */}

        {filteredPatients.map((patient) => (
          <div
            className="patients-table-row"
            key={patient.id}
          >

            {/* PATIENT ID */}

            <div className="patient-id">
              {patient.id}
            </div>


            {/* PATIENT NAME */}

            <div
              className="patient-name"
              onClick={() => openPatient(patient)}
            >
              {patient.name}
            </div>


            {/* AGE */}

            <div>
              {patient.age}
            </div>


            {/* STATUS */}

            <div>

              <span
                className={
                  patient.status === "High Risk"
                    ? "patient-status risk"
                    : patient.status === "Monitoring"
                    ? "patient-status monitoring"
                    : "patient-status active"
                }
              >
                {patient.status}
              </span>

            </div>


            {/* ACTION */}

            <div className="patient-actions">

              <button
                type="button"
                title="View patient overview"
                onClick={() => openPatient(patient)}
              >
                <Eye size={17} />
              </button>

            </div>

          </div>
        ))}


        {/* NO RESULTS */}

        {filteredPatients.length === 0 && (
          <div className="no-patients">
            No patients found.
          </div>
        )}

      </div>

    </div>
  );
}