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
  Stethoscope,
  FlaskConical,
  ClipboardPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "./medical.css";


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
   MEDICAL HISTORY DATA
===================================================== */

const historyRecords = [
  {
    date: "15 Apr 2025",
    type: "Consultation",
    description: "General Consultation",
    notes: "Routine checkup and health assessment.",
  },
  {
    date: "10 Dec 2023",
    type: "Diagnosis",
    description: "Type 2 Diabetes",
    notes: "Diagnosed based on blood test (HbA1c 7.2%).",
  },
  {
    date: "28 Aug 2023",
    type: "Lab Test",
    description: "HbA1c Test",
    notes: "Result: 7.2% (elevated).",
  },
  {
    date: "20 Jan 2023",
    type: "Procedure",
    description: "ECG",
    notes: "Normal sinus rhythm.",
  },
  {
    date: "15 Nov 2022",
    type: "Lab Test",
    description: "Lipid Profile",
    notes: "Cholesterol: 210 mg/dL (high).",
  },
  {
    date: "10 Mar 2022",
    type: "Consultation",
    description: "Initial Visit",
    notes: "Complaints of increased thirst and fatigue.",
  },
];


/* =====================================================
   PAGE PROPS
===================================================== */

type PageProps = {
  params: Promise<{
    patientId: string;
  }>;
};


/* =====================================================
   TYPE ICON
===================================================== */

function TypeIcon({
  type,
}: {
  type: string;
}) {

  if (type === "Consultation") {
    return <Stethoscope size={14} />;
  }

  if (type === "Diagnosis") {
    return <HeartPulse size={14} />;
  }

  if (type === "Lab Test") {
    return <FlaskConical size={14} />;
  }

  return <ClipboardPlus size={14} />;
}


/* =====================================================
   TYPE CLASS
===================================================== */

function getTypeClass(type: string) {

  switch (type) {

    case "Consultation":
      return "history-type consultation";

    case "Diagnosis":
      return "history-type diagnosis";

    case "Lab Test":
      return "history-type lab";

    case "Procedure":
      return "history-type procedure";

    default:
      return "history-type";
  }
}


/* =====================================================
   MEDICAL HISTORY PAGE
===================================================== */

export default async function MedicalHistoryPage({
  params,
}: PageProps) {

  /* GET PATIENT ID */

  const { patientId } = await params;


  /* FIND PATIENT */

  const patient = patients.find(
    (item) =>
      item.id.toLowerCase() ===
      patientId.toLowerCase()
  );


  /* =====================================================
     PATIENT NOT FOUND
  ===================================================== */

  if (!patient) {

    return (
      <div className="medical-not-found">

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


  /* INITIALS */

  const initials = patient.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();


  /* STATUS CLASS */

  const statusClass =
    patient.status === "High Risk"
      ? "risk"
      : patient.status === "Monitoring"
      ? "monitoring"
      : "active";


  return (
    <div className="medical-page">


      {/* =================================================
          BACK
      ================================================= */}

      <Link
        href="/doctor/patients"
        className="medical-back"
      >

        <ArrowLeft size={17} />

        <span>Back to Patients</span>

      </Link>


      {/* =================================================
          PATIENT HEADER
      ================================================= */}

      <section className="medical-patient-header">

        <div className="medical-header-left">


          {/* AVATAR */}

          <div className="medical-avatar">

            {initials}

          </div>


          {/* DETAILS */}

          <div className="medical-patient-details">


            {/* NAME + STATUS */}

            <div className="medical-name-line">

              <h1>
                {patient.name}
              </h1>

              <span
                className={`medical-status ${statusClass}`}
              >

                <span className="medical-status-dot" />

                {patient.status}

              </span>

            </div>


            {/* BASIC INFO */}

            <div className="medical-basic-info">

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


            {/* CONTACT */}

            <div className="medical-contact">

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


        {/* EDIT BUTTON */}

        <button className="medical-edit">

          <Edit3 size={15} />

          Edit Details

        </button>

      </section>


      {/* =================================================
          TABS
      ================================================= */}

      <nav className="medical-tabs">


        {/* OVERVIEW */}

        <Link
          href={`/doctor/patients/${patient.id}`}
          className="medical-tab"
        >

          <User size={17} />

          <span>Overview</span>

        </Link>


        {/* MEDICAL HISTORY - ACTIVE */}

        <Link
          href={`/doctor/patients/${patient.id}/medical-history`}
          className="medical-tab active"
        >

          <FileText size={17} />

          <span>Medical History</span>

        </Link>


        {/* TREATMENTS */}

        <Link
          href={`/doctor/patients/${patient.id}/treatments`}
          className="medical-tab"
        >

          <Pill size={17} />

          <span>Treatments</span>

        </Link>


        {/* ADMISSIONS */}

        <Link
          href={`/doctor/patients/${patient.id}/admissions`}
          className="medical-tab"
        >

          <Calendar size={17} />

          <span>Admissions</span>

        </Link>

      </nav>


      {/* =================================================
          MEDICAL HISTORY CONTENT
      ================================================= */}

      <main className="medical-content">


        {/* TITLE */}

        <div className="medical-history-card">


          <div className="medical-history-heading">

            <div className="medical-title-left">

              <div className="medical-title-icon">

                <FileText size={18} />

              </div>

              <h2>
                Medical History
              </h2>

            </div>


            <button className="history-filter">

              <span>All Types</span>

              <ChevronDown size={15} />

            </button>

          </div>


          {/* =================================================
              TABLE
          ================================================= */}

          <div className="history-table-wrapper">


            {/* TABLE HEADER */}

            <div className="history-row history-header">

              <div>
                Date
              </div>

              <div>
                Type
              </div>

              <div>
                Description
              </div>

              <div>
                Notes
              </div>

            </div>


            {/* TABLE RECORDS */}

            {historyRecords.map(
              (record, index) => (

                <div
                  className="history-row history-data"
                  key={index}
                >

                  <div className="history-date">

                    {record.date}

                  </div>


                  <div>

                    <span
                      className={getTypeClass(
                        record.type
                      )}
                    >

                      <TypeIcon
                        type={record.type}
                      />

                      {record.type}

                    </span>

                  </div>


                  <div className="history-description">

                    {record.description}

                  </div>


                  <div className="history-notes">

                    {record.notes}

                  </div>

                </div>

              )
            )}

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="history-footer">

            <span>
              Showing 6 records
            </span>


            <div className="history-pagination">

              <button>
                <ChevronLeft size={15} />
              </button>

              <button className="active-page">
                1
              </button>

              <button>
                2
              </button>

              <button>
                <ChevronRight size={15} />
              </button>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}