"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  User,
  FileText,
  Pill,
  Calendar,
  HeartPulse,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Building2,
  Eye,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "./admissions.css";

/* =====================================================
   PATIENT DATA
===================================================== */

const patients = [
  {
    id: "P001",
    name: "Ananya Sharma",
    age: 45,
    gender: "Female",
    condition: "Diabetes",
    contact: "9876543210",
    email: "ananya@example.com",
    address: "123 Green Park, Bangalore",
    status: "Active",
  },
  {
    id: "P002",
    name: "Rahul Kumar",
    age: 62,
    gender: "Male",
    condition: "Heart Disease",
    contact: "9876543211",
    email: "rahul@example.com",
    address: "45 MG Road, Bangalore",
    status: "High Risk",
  },
  {
    id: "P003",
    name: "Priya Reddy",
    age: 38,
    gender: "Female",
    condition: "Hypertension",
    contact: "9876543212",
    email: "priya@example.com",
    address: "78 Indiranagar, Bangalore",
    status: "Active",
  },
  {
    id: "P004",
    name: "Arjun Patel",
    age: 55,
    gender: "Male",
    condition: "Diabetes",
    contact: "9876543213",
    email: "arjun@example.com",
    address: "21 Whitefield, Bangalore",
    status: "Monitoring",
  },
];

/* =====================================================
   ADMISSION DATA
===================================================== */

const admissions = [
  {
    id: "ADM001",
    admissionDate: "10 Dec 2023",
    dischargeDate: "15 Dec 2023",
    hospital: "Apollo Hospital",
    reason: "High blood sugar",
    duration: "5 days",
    status: "Discharged",
  },
  {
    id: "ADM002",
    admissionDate: "22 Aug 2022",
    dischargeDate: "28 Aug 2022",
    hospital: "Manipal Hospital",
    reason: "Hypertension",
    duration: "6 days",
    status: "Discharged",
  },
  {
    id: "ADM003",
    admissionDate: "05 Jan 2021",
    dischargeDate: "10 Jan 2021",
    hospital: "Fortis Hospital",
    reason: "Chest pain",
    duration: "5 days",
    status: "Discharged",
  },
  {
    id: "ADM004",
    admissionDate: "18 Mar 2020",
    dischargeDate: "22 Mar 2020",
    hospital: "Narayana Health",
    reason: "Diabetic complication",
    duration: "4 days",
    status: "Discharged",
  },
  {
    id: "ADM005",
    admissionDate: "10 Nov 2019",
    dischargeDate: "14 Nov 2019",
    hospital: "Apollo Hospital",
    reason: "Routine checkup",
    duration: "4 days",
    status: "Discharged",
  },
];

/* =====================================================
   PAGE
===================================================== */

export default function AdmissionsPage() {
  const params = useParams();
  const router = useRouter();

  /* Get patient ID from URL */
  const patientId = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId;

  /* Find patient */
  const patient = patients.find(
    (item) =>
      item.id.toLowerCase() ===
      String(patientId || "").toLowerCase()
  );

  /* =====================================================
     PATIENT NOT FOUND
  ===================================================== */

  if (!patient) {
    return (
      <div className="admission-not-found">
        <h2>Patient Not Found</h2>

        <p>
          Patient ID: {patientId || "Missing"}
        </p>

        <button
          onClick={() => router.push("/doctor/patients")}
        >
          <ArrowLeft size={16} />
          Back to Patients
        </button>
      </div>
    );
  }

  /* Initials */
  const initials = patient.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  /* Status */
  const statusClass =
    patient.status === "High Risk"
      ? "risk"
      : patient.status === "Monitoring"
      ? "monitoring"
      : "active";

  return (
    <div className="admissions-page">

      {/* =================================================
          BACK TO PATIENTS
      ================================================= */}

      <button
        className="admissions-back"
        onClick={() =>
          router.push("/doctor/patients")
        }
      >
        <ArrowLeft size={17} />
        <span>Back to Patients</span>
      </button>


      {/* =================================================
          PATIENT HEADER
      ================================================= */}

      <section className="admissions-patient-header">

        <div className="admissions-patient-left">

          {/* Avatar */}

          <div className="admissions-avatar">
            {initials}
          </div>


          {/* Patient details */}

          <div className="admissions-patient-details">

            <div className="admissions-name-row">

              <h1>{patient.name}</h1>

              <span
                className={`admissions-status ${statusClass}`}
              >
                <span className="admissions-status-dot" />
                {patient.status}
              </span>

            </div>


            <div className="admissions-basic-info">

              <span>{patient.id}</span>

              <span>•</span>

              <span>
                {patient.age} years
              </span>

              <span>•</span>

              <span>
                {patient.gender}
              </span>

            </div>


            <div className="admissions-contact">

              <span>
                <HeartPulse size={15} />
                {patient.condition}
              </span>

              <span>
                <Phone size={15} />
                {patient.contact}
              </span>

              <span>
                <Mail size={15} />
                {patient.email}
              </span>

              <span>
                <MapPin size={15} />
                {patient.address}
              </span>

            </div>

          </div>

        </div>


        {/* Edit button */}

        <button className="admissions-edit">

          <Edit3 size={16} />

          Edit Details

        </button>

      </section>


      {/* =================================================
          PATIENT TABS
      ================================================= */}

      <nav className="admissions-tabs">

        <Link
          href={`/doctor/patients/${patient.id}`}
          className="admissions-tab"
        >
          <User size={18} />
          Overview
        </Link>


        <Link
          href={`/doctor/patients/${patient.id}/medical-history`}
          className="admissions-tab"
        >
          <FileText size={18} />
          Medical History
        </Link>


        <Link
          href={`/doctor/patients/${patient.id}/treatments`}
          className="admissions-tab"
        >
          <Pill size={18} />
          Treatments
        </Link>


        <Link
          href={`/doctor/patients/${patient.id}/admissions`}
          className="admissions-tab active"
        >
          <Calendar size={18} />
          Admissions
        </Link>

      </nav>


      {/* =================================================
          ADMISSIONS CONTENT
      ================================================= */}

      <main className="admissions-content">

        {/* Admissions card */}

        <section className="admissions-card">

          {/* Card header */}

          <div className="admissions-card-header">

            <div className="admissions-title-area">

              <div className="admissions-title-icon">
                <Building2 size={20} />
              </div>

              <div>
                <h2>Hospital Admissions</h2>

                <p>
                  View complete history of patient hospital admissions
                </p>
              </div>

            </div>

          </div>


          {/* =================================================
              TABLE
          ================================================= */}

          <div className="admissions-table-wrapper">

            <table className="admissions-table">

              <thead>

                <tr>

                  <th>#</th>

                  <th>Admission ID</th>

                  <th>Admission Date</th>

                  <th>Discharge Date</th>

                  <th>Hospital</th>

                  <th>Reason</th>

                  <th>Duration</th>

                  <th>Status</th>

                  <th>Actions</th>

                </tr>

              </thead>


              <tbody>

                {admissions.map((admission, index) => (

                  <tr key={admission.id}>

                    <td>
                      {index + 1}
                    </td>

                    <td>
                      <strong>
                        {admission.id}
                      </strong>
                    </td>

                    <td>
                      {admission.admissionDate}
                    </td>

                    <td>
                      {admission.dischargeDate}
                    </td>

                    <td>
                      {admission.hospital}
                    </td>

                    <td>
                      {admission.reason}
                    </td>

                    <td>
                      {admission.duration}
                    </td>

                    <td>

                      <span className="discharged-badge">

                        <span className="discharged-dot" />

                        {admission.status}

                      </span>

                    </td>

                    <td>

                      <button
                        className="view-admission"
                        title="View admission"
                      >
                        <Eye size={16} />
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>


          {/* =================================================
              TABLE FOOTER
          ================================================= */}

          <div className="admissions-table-footer">

            <span>
              Showing {admissions.length} admissions
            </span>


            <div className="admissions-pagination">

              <button>
                <ChevronLeft size={17} />
              </button>

              <button className="pagination-active">
                1
              </button>

              <button>
                2
              </button>

              <button>
                <ChevronRight size={17} />
              </button>

            </div>

          </div>

        </section>


        {/* =================================================
            BOTTOM SUMMARY
        ================================================= */}

        <div className="admissions-summary-grid">

          {/* Summary */}

          <section className="summary-card">

            <div className="summary-icon">
              <BarChart3 size={20} />
            </div>

            <div className="summary-content">

              <h3>
                Admission Summary
              </h3>

              <div className="summary-stats">

                <div>
                  <strong>5</strong>
                  <span>Total Admissions</span>
                </div>

                <div>
                  <strong>0</strong>
                  <span>Current Admission</span>
                </div>

                <div>
                  <strong>5</strong>
                  <span>Discharged</span>
                </div>

              </div>

            </div>

          </section>


          {/* Last admission */}

          <section className="summary-card last-admission">

            <div className="summary-icon">
              <Calendar size={20} />
            </div>

            <div className="summary-content">

              <h3>
                Last Admission
              </h3>

              <strong className="last-admission-date">
                10 Dec 2023 – 15 Dec 2023
              </strong>

              <p>
                Apollo Hospital
              </p>

              <p>
                Reason: High blood sugar
              </p>

              <span className="last-admission-duration">
                Duration: 5 days
              </span>

            </div>


            <span className="discharged-badge last-status">

              <span className="discharged-dot" />

              Discharged

            </span>

          </section>

        </div>

      </main>

    </div>
  );
}