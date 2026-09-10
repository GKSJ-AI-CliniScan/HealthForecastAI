"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

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
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  X,
} from "lucide-react";

import "./treatments.css";

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
   TREATMENT DATA
===================================================== */

const treatments = [
  {
    id: 1,
    medication: "Metformin",
    dosage: "500 mg",
    frequency: "Twice daily",
    startDate: "10 Dec 2023",
    endDate: "Ongoing",
    status: "Active",
    prescribedBy: "Dr. Priya Nair",
    notes: "For blood sugar control.",
  },
  {
    id: 2,
    medication: "Atorvastatin",
    dosage: "10 mg",
    frequency: "Once daily",
    startDate: "15 Nov 2022",
    endDate: "Ongoing",
    status: "Active",
    prescribedBy: "Dr. Priya Nair",
    notes: "For cholesterol management.",
  },
  {
    id: 3,
    medication: "Amlodipine",
    dosage: "5 mg",
    frequency: "Once daily",
    startDate: "28 Aug 2023",
    endDate: "Ongoing",
    status: "Active",
    prescribedBy: "Dr. Ravi Kumar",
    notes: "For blood pressure control.",
  },
  {
    id: 4,
    medication: "Aspirin",
    dosage: "75 mg",
    frequency: "Once daily",
    startDate: "20 Jan 2023",
    endDate: "Ongoing",
    status: "Active",
    prescribedBy: "Dr. Priya Nair",
    notes: "Preventive therapy.",
  },
  {
    id: 5,
    medication: "Vitamin D3",
    dosage: "1000 IU",
    frequency: "Once daily",
    startDate: "10 Mar 2022",
    endDate: "30 Mar 2023",
    status: "Completed",
    prescribedBy: "Dr. Meera Iyer",
    notes: "Course completed.",
  },
  {
    id: 6,
    medication: "Insulin (Lantus)",
    dosage: "10 units",
    frequency: "At bedtime",
    startDate: "05 Feb 2024",
    endDate: "Ongoing",
    status: "Active",
    prescribedBy: "Dr. Priya Nair",
    notes: "For better glucose control.",
  },
];

/* =====================================================
   PAGE
===================================================== */

export default function TreatmentsPage() {
  const params = useParams();
  const router = useRouter();

  /* =====================================================
     ADD TREATMENT MODAL STATE
  ===================================================== */

  const [showAddTreatment, setShowAddTreatment] = useState(false);

  /* =====================================================
     GET PATIENT ID FROM URL
  ===================================================== */

  const patientId = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId;

  /* =====================================================
     FIND PATIENT
  ===================================================== */

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
      <div className="treatment-not-found">
        <h2>Patient Not Found</h2>

        <p>
          Patient ID: {patientId || "Missing"}
        </p>

        <button
          onClick={() =>
            router.push("/doctor/patients")
          }
        >
          <ArrowLeft size={16} />
          Back to Patients
        </button>
      </div>
    );
  }

  /* =====================================================
     INITIALS
  ===================================================== */

  const initials = patient.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  /* =====================================================
     STATUS CLASS
  ===================================================== */

  const statusClass =
    patient.status === "High Risk"
      ? "risk"
      : patient.status === "Monitoring"
      ? "monitoring"
      : "active";

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="treatment-page">

      {/* =================================================
          BACK TO PATIENTS
      ================================================= */}

      <Link
        href="/doctor/patients"
        className="treatment-back"
      >
        <ArrowLeft size={17} />
        <span>Back to Patients</span>
      </Link>


      {/* =================================================
          PATIENT HEADER
      ================================================= */}

      <section className="treatment-patient-header">

        <div className="treatment-header-left">

          {/* Avatar */}

          <div className="treatment-avatar">
            {initials}
          </div>


          {/* Patient details */}

          <div className="treatment-patient-details">

            <div className="treatment-name-line">

              <h1>{patient.name}</h1>

              <span
                className={`treatment-status ${statusClass}`}
              >
                <span className="treatment-status-dot" />
                {patient.status}
              </span>

            </div>


            {/* Basic information */}

            <div className="treatment-basic-info">

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


            {/* Contact */}

            <div className="treatment-contact">

              <span>
                <HeartPulse size={14} />
                {patient.condition}
              </span>

              <span>
                <Phone size={14} />
                {patient.contact}
              </span>

              <span>
                <Mail size={14} />
                {patient.email}
              </span>

              <span>
                <MapPin size={14} />
                {patient.address}
              </span>

            </div>

          </div>

        </div>


        {/* Edit */}

        <button className="treatment-edit">
          <Edit3 size={15} />
          Edit Details
        </button>

      </section>


      {/* =================================================
          PATIENT TABS
      ================================================= */}

      <div className="treatment-tabs">

        <Link
          href={`/doctor/patients/${patient.id}`}
          className="treatment-tab"
        >
          <User size={17} />
          Overview
        </Link>


        <Link
          href={`/doctor/patients/${patient.id}/medical-history`}
          className="treatment-tab"
        >
          <FileText size={17} />
          Medical History
        </Link>


        <Link
          href={`/doctor/patients/${patient.id}/treatments`}
          className="treatment-tab active"
        >
          <Pill size={17} />
          Treatments
        </Link>


        <Link
          href={`/doctor/patients/${patient.id}/admissions`}
          className="treatment-tab"
        >
          <Calendar size={17} />
          Admissions
        </Link>

      </div>


      {/* =================================================
          TREATMENT CONTENT
      ================================================= */}

      <main className="treatment-content">

        <section className="treatment-card">

          {/* Treatment heading */}

          <div className="treatment-heading">

            <div className="treatment-title-left">

              <div className="treatment-title-icon">
                <Pill size={19} />
              </div>

              <h2>
                Current Treatments
              </h2>

            </div>


            {/* ADD TREATMENT BUTTON */}

            <button
              className="add-treatment"
              onClick={() =>
                setShowAddTreatment(true)
              }
            >
              <Plus size={16} />
              Add Treatment
            </button>

          </div>


          {/* =================================================
              TABLE
          ================================================= */}

          <div className="treatment-table-wrapper">

            {/* Header */}

            <div className="treatment-row treatment-table-header">

              <div>#</div>
              <div>Medication</div>
              <div>Dosage</div>
              <div>Frequency</div>
              <div>Start Date</div>
              <div>End Date</div>
              <div>Status</div>
              <div>Prescribed By</div>
              <div>Notes</div>
              <div>Actions</div>

            </div>


            {/* Rows */}

            {treatments.map((treatment) => (

              <div
                className="treatment-row treatment-data-row"
                key={treatment.id}
              >

                <div className="treatment-number">
                  {treatment.id}
                </div>

                <div className="treatment-medication">
                  {treatment.medication}
                </div>

                <div>
                  {treatment.dosage}
                </div>

                <div>
                  {treatment.frequency}
                </div>

                <div>
                  {treatment.startDate}
                </div>

                <div>
                  {treatment.endDate}
                </div>


                {/* Status */}

                <div>

                  <span
                    className={
                      treatment.status === "Active"
                        ? "treatment-badge active-treatment"
                        : "treatment-badge completed-treatment"
                    }
                  >
                    <span className="treatment-badge-dot" />
                    {treatment.status}
                  </span>

                </div>


                <div>
                  {treatment.prescribedBy}
                </div>


                <div className="treatment-notes">
                  {treatment.notes}
                </div>


                {/* Actions */}

                <div className="treatment-actions">

                  <button
                    className="treatment-action edit-action"
                    title="Edit treatment"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    className="treatment-action delete-action"
                    title="Delete treatment"
                  >
                    <Trash2 size={15} />
                  </button>

                </div>

              </div>

            ))}

          </div>


          {/* =================================================
              PAGINATION
          ================================================= */}

          <div className="treatment-footer">

            <span>
              Showing 6 treatments
            </span>

            <div className="treatment-pagination">

              <button>
                <ChevronLeft size={16} />
              </button>

              <button className="active-page">
                1
              </button>

              <button>
                2
              </button>

              <button>
                <ChevronRight size={16} />
              </button>

            </div>

          </div>

        </section>


        {/* =================================================
            BOTTOM INFORMATION CARDS
        ================================================= */}

        <div className="treatment-info-grid">

          <section className="treatment-info-card">

            <div className="treatment-info-icon">
              <ClipboardList size={18} />
            </div>

            <div>

              <h3>
                Treatment Notes
              </h3>

              <p>
                Patient is responding well to the
                current treatment plan. Continue
                regular monitoring and follow-up
                as scheduled.
              </p>

            </div>

          </section>


          <section className="treatment-info-card">

            <div className="treatment-info-icon">
              <Calendar size={18} />
            </div>

            <div>

              <h3>
                Next Review
              </h3>

              <strong>
                20 May 2025
              </strong>

              <p>
                Review treatment effectiveness
                and adjust if necessary.
              </p>

            </div>

          </section>

        </div>

      </main>


      {/* =====================================================
          ADD TREATMENT DIALOG
      ===================================================== */}

      {showAddTreatment && (

        <div
          className="treatment-modal-overlay"
          onClick={() =>
            setShowAddTreatment(false)
          }
        >

          <div
            className="treatment-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* =================================================
                MODAL HEADER
            ================================================= */}

            <div className="treatment-modal-header">

              <div className="treatment-modal-title">

                <div className="treatment-modal-icon">
                  <Pill size={22} />
                </div>

                <div>

                  <h2>
                    Add Treatment
                  </h2>

                  <p>
                    Add a new treatment for this patient
                  </p>

                </div>

              </div>


              <button
                className="treatment-modal-close"
                onClick={() =>
                  setShowAddTreatment(false)
                }
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>

            </div>


            {/* =================================================
                FORM
            ================================================= */}

            <div className="treatment-form">

              {/* Medication */}

              <div className="treatment-form-group">

                <label>
                  Medication Name <span>*</span>
                </label>

                <input
                  type="text"
                  placeholder="Enter medication name"
                />

              </div>


              {/* Dosage */}

              <div className="treatment-form-group">

                <label>
                  Dosage <span>*</span>
                </label>

                <input
                  type="text"
                  placeholder="e.g. 500 mg"
                />

              </div>


              {/* Frequency */}

              <div className="treatment-form-group">

                <label>
                  Frequency <span>*</span>
                </label>

                <select defaultValue="">

                  <option value="" disabled>
                    Select frequency
                  </option>

                  <option>
                    Once daily
                  </option>

                  <option>
                    Twice daily
                  </option>

                  <option>
                    Three times daily
                  </option>

                  <option>
                    At bedtime
                  </option>

                  <option>
                    As needed
                  </option>

                </select>

              </div>


              {/* Start Date */}

              <div className="treatment-form-group">

                <label>
                  Start Date <span>*</span>
                </label>

                <input
                  type="date"
                />

              </div>


              {/* End Date */}

              <div className="treatment-form-group">

                <label>
                  End Date
                </label>

                <input
                  type="date"
                />

              </div>


              {/* Status */}

              <div className="treatment-form-group">

                <label>
                  Status <span>*</span>
                </label>

                <select defaultValue="Active">

                  <option>
                    Active
                  </option>

                  <option>
                    Completed
                  </option>

                  <option>
                    Discontinued
                  </option>

                </select>

              </div>


              {/* Prescribed By */}

              <div className="treatment-form-group full-width">

                <label>
                  Prescribed By <span>*</span>
                </label>

                <input
                  type="text"
                  placeholder="Enter doctor name"
                  defaultValue="Dr. Priya Nair"
                />

              </div>


              {/* Notes */}

              <div className="treatment-form-group full-width">

                <label>
                  Notes
                </label>

                <textarea
                  placeholder="Enter additional notes (optional)"
                  maxLength={500}
                />

                <div className="notes-limit">
                  0/500
                </div>

              </div>

            </div>


            {/* =================================================
                MODAL FOOTER
            ================================================= */}

            <div className="treatment-modal-footer">

              <button
                className="treatment-cancel"
                onClick={() =>
                  setShowAddTreatment(false)
                }
              >
                Cancel
              </button>


              <button
                className="treatment-save"
                onClick={() =>
                  setShowAddTreatment(false)
                }
              >
                <ClipboardList size={16} />
                Save Treatment
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}