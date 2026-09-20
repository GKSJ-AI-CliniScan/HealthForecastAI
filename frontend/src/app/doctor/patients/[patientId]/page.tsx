import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  User,
  FileText,
  Pill,
  Calendar,
  HeartPulse,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Activity,
  Lightbulb,
  ShieldAlert,
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
  const { patientId } = await params;

  const patient = patients.find(
    (item) =>
      item.id.toLowerCase() === patientId.toLowerCase()
  );

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

  const initials = patient.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const statusClass =
    patient.status === "High Risk"
      ? "risk"
      : patient.status === "Monitoring"
      ? "monitoring"
      : "active";

  return (
    <div className="patient-page">

      {/* =====================================================
          BACK TO PATIENTS
      ===================================================== */}

      <Link
        href="/doctor/patients"
        className="back-patients"
      >
        <ArrowLeft size={17} />
        <span>Back to Patients</span>
      </Link>


      {/* =====================================================
          PATIENT HEADER
      ===================================================== */}

      <section className="patient-header">

        <div className="patient-header-left">

          <div className="patient-avatar">
            {initials}
          </div>

          <div className="patient-details">

            <div className="patient-name-line">

              <h1>{patient.name}</h1>

              <span
                className={`patient-status ${statusClass}`}
              >
                <span className="status-dot" />
                {patient.status}
              </span>

            </div>

            <div className="patient-basic-info">
              <span>{patient.id}</span>
              <span>•</span>
              <span>{patient.age} years</span>
              <span>•</span>
              <span>{patient.gender}</span>
            </div>

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

        <button
          type="button"
          className="edit-details"
        >
          <Edit3 size={15} />
          Edit Details
        </button>

      </section>


      {/* =====================================================
          TABS
      ===================================================== */}

      <nav className="patient-tabs">

        <Link
          href={`/doctor/patients/${patient.id}`}
          className="patient-tab active"
        >
          <User size={17} />
          <span>Overview</span>
        </Link>

        <Link
          href={`/doctor/patients/${patient.id}/medical-history`}
          className="patient-tab"
        >
          <FileText size={17} />
          <span>Medical History</span>
        </Link>

        <Link
          href={`/doctor/patients/${patient.id}/treatments`}
          className="patient-tab"
        >
          <Pill size={17} />
          <span>Treatments</span>
        </Link>

        <Link
          href={`/doctor/patients/${patient.id}/admissions`}
          className="patient-tab"
        >
          <Calendar size={17} />
          <span>Admissions</span>
        </Link>

      </nav>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="patient-content">

        {/* =================================================
            PAGE TITLE
        ================================================= */}

        <div className="overview-heading">

          <div>
            <h2>Patient Overview</h2>

            <p>
              View important information about the patient.
            </p>
          </div>

          <div className="last-updated">
            <Calendar size={15} />
            Last Updated: 15 Apr 2025
          </div>

        </div>


        {/* =================================================
            PATIENT INFORMATION
        ================================================= */}

        <section className="overview-card">

          <div className="card-title">

            <div className="card-icon">
              <User size={18} />
            </div>

            <h3>Patient Information</h3>

          </div>


          <div className="two-column-info">

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

            </div>


            <div className="information-list">

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

          </div>

        </section>


        {/* =================================================
            CURRENT HEALTH STATUS
        ================================================= */}

        <section className="overview-card">

          <div className="card-title">

            <div className="card-icon health">
              <HeartPulse size={18} />
            </div>

            <h3>Current Health Status</h3>

          </div>


          <div className="two-column-info">

            <div className="information-list">

              <div className="info-row">
                <span>Primary Condition</span>
                <strong>{patient.condition}</strong>
              </div>

              <div className="info-row">
                <span>Status</span>

                <strong className="green-value">
                  {patient.status}
                </strong>
              </div>

              <div className="info-row">
                <span>Last Visit</span>
                <strong>15 Apr 2025</strong>
              </div>

            </div>


            <div className="information-list">

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

          </div>

        </section>


        {/* =================================================
            PATIENT INTELLIGENCE
        ================================================= */}

        <section className="patient-intelligence">

          <div className="patient-intelligence-header">

            <div>
              <p className="patient-intelligence-label">
                AI INTELLIGENCE
              </p>

              <h2>Patient Intelligence</h2>

              <p>
                View AI-powered assessments and recommendations for this patient.
              </p>
            </div>

          </div>


          <div className="patient-intelligence-grid">

            {/* =================================================
                RISK ASSESSMENT
            ================================================= */}

            <Link
                   href={`/doctor/risk-assessment/${patient.id}?from=overview`}
                   className="patient-intelligence-card"
>  

              <div className="patient-intelligence-icon blue">
                <ShieldAlert size={20} />
              </div>

              <div className="patient-intelligence-content">

                <h3>Risk Assessment</h3>

                <p>
                  View the patient's current risk score, risk level
                  and contributing factors.
                </p>

                <span>
                  View Risk Assessment
                  <ArrowRight size={15} />
                </span>

              </div>

            </Link>


            {/* =================================================
                READMISSION FORECAST
            ================================================= */}

            <Link
                  href={`/doctor/readmission-forecast/${patient.id}?from=overview`}
                   className="patient-intelligence-card"
>

              <div className="patient-intelligence-icon green">
                <Activity size={20} />
              </div>

              <div className="patient-intelligence-content">

                <h3>Readmission Forecast</h3>

                <p>
                  View the patient's predicted readmission
                  probability and forecast period.
                </p>

                <span>
                  View Readmission Forecast
                  <ArrowRight size={15} />
                </span>

              </div>

            </Link>


            {/* =================================================
                CLINICAL INSIGHTS
            ================================================= */}

            <Link
                  href={`/doctor/clinical-insights/${patient.id}?from=overview`}
                  className="patient-intelligence-card"
>

              <div className="patient-intelligence-icon purple">
                <Lightbulb size={20} />
              </div>

              <div className="patient-intelligence-content">

                <h3>Clinical Insights</h3>

                <p>
                  View AI-generated recommendations and
                  suggested clinical actions.
                </p>

                <span>
                  View Clinical Insights
                  <ArrowRight size={15} />
                </span>

              </div>

            </Link>

          </div>

        </section>

      </main>

    </div>
  );
}