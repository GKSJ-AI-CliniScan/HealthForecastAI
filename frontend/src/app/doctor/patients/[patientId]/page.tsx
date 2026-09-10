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
} from "lucide-react";

import "./eachpatient.css";

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

type PageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

export default async function PatientPage({ params }: PageProps) {
  /* =====================================================
     GET PATIENT ID FROM URL
     
     Example:
     /doctor/patients/P001

     patientId = "P001"
  ===================================================== */

  const { patientId } = await params;

  console.log("Patient ID from URL:", patientId);

  /* =====================================================
     FIND PATIENT
  ===================================================== */

  const patient = patients.find(
    (item) =>
      item.id.toLowerCase() === patientId.toLowerCase()
  );

  /* =====================================================
     PATIENT NOT FOUND
  ===================================================== */

  if (!patient) {
    return (
      <div className="patient-not-found">
        <h2>Patient Not Found</h2>

        <p>
          Patient ID: {patientId || "Missing"}
        </p>

        <Link href="/doctor/patients">
          <ArrowLeft size={16} />
          Back to Patients
        </Link>
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

  return (
    <div className="patient-page">

      {/* =================================================
          BACK TO PATIENTS
      ================================================= */}

      <Link
        href="/doctor/patients"
        className="back-patients"
      >
        <ArrowLeft size={17} />
        <span>Back to Patients</span>
      </Link>


      {/* =================================================
          PATIENT HEADER
      ================================================= */}

      <section className="patient-header">

        <div className="patient-header-left">

          {/* Avatar */}

          <div className="patient-avatar">
            {initials}
          </div>


          {/* Patient Details */}

          <div className="patient-details">

            {/* Name + Status */}

            <div className="patient-name-line">

              <h1>{patient.name}</h1>

              <span
                className={`patient-status ${statusClass}`}
              >
                <span className="status-dot" />
                {patient.status}
              </span>

            </div>


            {/* Basic Information */}

            <div className="patient-basic-info">

              <span>{patient.id}</span>

              <span>•</span>

              <span>{patient.age} years</span>

              <span>•</span>

              <span>{patient.gender}</span>

            </div>


            {/* Contact Information */}

            <div className="patient-contact">

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


        {/* Edit Button */}

        <button className="edit-details">

          <Edit3 size={15} />

          Edit Details

        </button>

      </section>


      {/* =================================================
          PATIENT TABS
      ================================================= */}

      <nav className="patient-tabs">

        {/* Overview */}

        <Link
          href={`/doctor/patients/${patient.id}`}
          className="patient-tab active"
        >
          <User size={17} />
          <span>Overview</span>
        </Link>


        {/* Medical History */}

        <Link
          href={`/doctor/patients/${patient.id}/medical-history`}
          className="patient-tab"
        >
          <FileText size={17} />
          <span>Medical History</span>
        </Link>


        {/* Treatments */}

        <Link
          href={`/doctor/patients/${patient.id}/treatments`}
          className="patient-tab"
        >
          <Pill size={17} />
          <span>Treatments</span>
        </Link>


        {/* Admissions */}

        <Link
          href={`/doctor/patients/${patient.id}/admissions`}
          className="patient-tab"
        >
          <Calendar size={17} />
          <span>Admissions</span>
        </Link>

      </nav>


      {/* =================================================
          OVERVIEW
      ================================================= */}

      <main className="patient-content">

        <div className="overview-heading">

          <h2>Patient Overview</h2>

          <p>
            View important information about the patient.
          </p>

        </div>


        <div className="overview-grid">

          {/* =================================================
              PATIENT INFORMATION
          ================================================= */}

          <section className="overview-card">

            <div className="card-title">

              <div className="card-icon">
                <User size={17} />
              </div>

              <h3>Patient Information</h3>

            </div>


            <div className="information-list">

              <div className="info-row">
                <span>Patient ID</span>
                <strong>{patient.id}</strong>
              </div>

              <div className="info-row">
                <span>Full Name</span>
                <strong>{patient.name}</strong>
              </div>

              <div className="info-row">
                <span>Age / Gender</span>
                <strong>
                  {patient.age} years / {patient.gender}
                </strong>
              </div>

              <div className="info-row">
                <span>Date of Birth</span>
                <strong>12 Jan 1980</strong>
              </div>

              <div className="info-row">
                <span>Blood Group</span>
                <strong>B+</strong>
              </div>

              <div className="info-row">
                <span>Contact Number</span>
                <strong>{patient.contact}</strong>
              </div>

              <div className="info-row">
                <span>Email</span>
                <strong>{patient.email}</strong>
              </div>

              <div className="info-row">
                <span>Address</span>
                <strong>{patient.address}</strong>
              </div>

            </div>

          </section>


          {/* =================================================
              CURRENT HEALTH STATUS
          ================================================= */}

          <section className="overview-card">

            <div className="card-title">

              <div className="card-icon">
                <HeartPulse size={17} />
              </div>

              <h3>Current Health Status</h3>

            </div>


            <div className="information-list">

              <div className="info-row">
                <span>Primary Condition</span>
                <strong>{patient.condition}</strong>
              </div>

              <div className="info-row">
                <span>Status</span>
                <strong>{patient.status}</strong>
              </div>

              <div className="info-row">
                <span>Last Visit</span>
                <strong>15 Apr 2025</strong>
              </div>

              <div className="info-row">
                <span>Next Follow-up</span>
                <strong>20 May 2025</strong>
              </div>

              <div className="info-row">
                <span>Attending Doctor</span>
                <strong>Dr. Priya Nair</strong>
              </div>

              <div className="info-row">
                <span>Department</span>
                <strong>General Medicine</strong>
              </div>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}