"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";

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

/* =====================================================
   UNIQUE PATIENT ID
===================================================== */

const generatePatientId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);

  return `P-${timestamp}-${random}`.toUpperCase();
};

export default function PatientsPage() {

  /* =====================================================
     PATIENT DATA
  ===================================================== */

  const [patients, setPatients] = useState<Patient[]>([
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
     MODAL
  ===================================================== */

  const [showModal, setShowModal] = useState(false);

  const [modalMode, setModalMode] = useState<
    "add" | "edit" | "view"
  >("add");

  /* =====================================================
     SELECTED PATIENT
  ===================================================== */

  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  /* =====================================================
     FORM DATA
  ===================================================== */

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    age: "",
    gender: "",
    condition: "Diabetes",
    contact: "",
  });

  /* =====================================================
     OPEN ADD PATIENT
  ===================================================== */

  const openAddPatient = () => {

    const uniqueId = generatePatientId();

    setFormData({
      id: uniqueId,
      name: "",
      age: "",
      gender: "",
      condition: "Diabetes",
      contact: "",
    });

    setSelectedPatient(null);
    setModalMode("add");

    // Open modal
    setShowModal(true);
  };

  /* =====================================================
     OPEN EDIT PATIENT
  ===================================================== */

  const openEditPatient = (patient: Patient) => {

    setFormData({
      id: patient.id,
      name: patient.name,
      age: patient.age.toString(),
      gender: patient.gender,
      condition: patient.condition,
      contact: patient.contact,
    });

    setSelectedPatient(patient);
    setModalMode("edit");

    setShowModal(true);
  };

  /* =====================================================
     OPEN VIEW PATIENT
  ===================================================== */

  const openViewPatient = (patient: Patient) => {

    setSelectedPatient(patient);
    setModalMode("view");

    setShowModal(true);
  };

  /* =====================================================
     CLOSE MODAL
  ===================================================== */

  const closeModal = () => {

    setShowModal(false);
    setSelectedPatient(null);
  };

  /* =====================================================
     FORM CHANGE
  ===================================================== */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {

    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     ADD / UPDATE PATIENT
  ===================================================== */

  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    /* REQUIRED FIELDS */

    if (
      !formData.name.trim() ||
      !formData.age ||
      !formData.gender
    ) {
      alert("Please fill all required fields.");
      return;
    }

    /* =================================================
       ADD PATIENT
    ================================================= */

    if (modalMode === "add") {

      const newPatient: Patient = {
        id: formData.id,
        name: formData.name.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        condition: formData.condition,
        contact: formData.contact.trim(),
        status: "Active",
      };

      setPatients((previous) => [
        ...previous,
        newPatient,
      ]);
    }

    /* =================================================
       EDIT PATIENT
    ================================================= */

    if (modalMode === "edit") {

      setPatients((previous) =>
        previous.map((patient) =>
          patient.id === formData.id
            ? {
                ...patient,
                name: formData.name.trim(),
                age: Number(formData.age),
                gender: formData.gender,
                condition: formData.condition,
                contact: formData.contact.trim(),
              }
            : patient
        )
      );
    }

    closeModal();
  };

  /* =====================================================
     DELETE PATIENT
  ===================================================== */

  const deletePatient = (id: string) => {

    const confirmed = window.confirm(
      "Are you sure you want to delete this patient?"
    );

    if (!confirmed) return;

    setPatients((previous) =>
      previous.filter(
        (patient) => patient.id !== id
      )
    );
  };

  /* =====================================================
     SEARCH FILTER
  ===================================================== */

  const filteredPatients = patients.filter(
    (patient) => {

      const searchValue =
        search.toLowerCase().trim();

      return (
        patient.id
          .toLowerCase()
          .includes(searchValue) ||

        patient.name
          .toLowerCase()
          .includes(searchValue) ||

        patient.condition
          .toLowerCase()
          .includes(searchValue) ||

        patient.status
          .toLowerCase()
          .includes(searchValue)
      );
    }
  );

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
            Manage your patients and their medical records.
          </p>

        </div>

        <button
          type="button"
          className="patients-add-button"
          onClick={openAddPatient}
        >
          <Plus size={18} />
          Add Patient
        </button>

      </div>


      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="patients-search">

        <Search size={19} />

        <input
          type="text"
          placeholder="Search by name or patient ID..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
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

            <div className="patient-id">
              {patient.id}
            </div>

            <div>
              {patient.name}
            </div>

            <div>
              {patient.age}
            </div>

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

            {/* ACTIONS */}

            <div className="patient-actions">

              {/* VIEW */}

              <button
                type="button"
                title="View patient"
                onClick={() =>
                  openViewPatient(patient)
                }
              >
                <Eye size={17} />
              </button>

              {/* EDIT */}

              <button
                type="button"
                title="Edit patient"
                onClick={() =>
                  openEditPatient(patient)
                }
              >
                <Pencil size={17} />
              </button>

              {/* DELETE */}

              <button
                type="button"
                title="Delete patient"
                className="delete-button"
                onClick={() =>
                  deletePatient(patient.id)
                }
              >
                <Trash2 size={17} />
              </button>

            </div>

          </div>

        ))}


        {/* NO PATIENTS */}

        {filteredPatients.length === 0 && (

          <div className="no-patients">
            No patients found.
          </div>

        )}

      </div>


      {/* =================================================
          ADD / EDIT / VIEW MODAL
      ================================================= */}

      {showModal && (

        <div
          className="patient-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="patient-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* =================================================
                MODAL HEADER
            ================================================= */}

            <div className="patient-modal-header">

              <div>

                <h2>
                  {modalMode === "add"
                    ? "Add Patient"
                    : modalMode === "edit"
                    ? "Edit Patient"
                    : "Patient Details"}
                </h2>

                <p>
                  {modalMode === "add"
                    ? "Enter basic patient details."
                    : modalMode === "edit"
                    ? "Update patient information."
                    : "View patient information."}
                </p>

              </div>


              {/* CLOSE */}

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                <X size={22} />
              </button>

            </div>


            {/* =================================================
                VIEW MODE
            ================================================= */}

            {modalMode === "view" &&
              selectedPatient && (

                <div className="patient-view-content">

                  <div className="patient-view-item">

                    <span>
                      Patient ID
                    </span>

                    <strong>
                      {selectedPatient.id}
                    </strong>

                  </div>


                  <div className="patient-view-item">

                    <span>
                      Full Name
                    </span>

                    <strong>
                      {selectedPatient.name}
                    </strong>

                  </div>


                  <div className="patient-view-row">

                    <div className="patient-view-item">

                      <span>
                        Age
                      </span>

                      <strong>
                        {selectedPatient.age}
                      </strong>

                    </div>


                    <div className="patient-view-item">

                      <span>
                        Gender
                      </span>

                      <strong>
                        {selectedPatient.gender}
                      </strong>

                    </div>

                  </div>


                  <div className="patient-view-item">

                    <span>
                      Condition
                    </span>

                    <strong>
                      {selectedPatient.condition}
                    </strong>

                  </div>


                  <div className="patient-view-item">

                    <span>
                      Contact Number
                    </span>

                    <strong>
                      {selectedPatient.contact ||
                        "Not provided"}
                    </strong>

                  </div>


                  <div className="patient-view-item">

                    <span>
                      Status
                    </span>

                    <strong>
                      {selectedPatient.status}
                    </strong>

                  </div>


                  <button
                    type="button"
                    className="modal-cancel-button"
                    onClick={closeModal}
                  >
                    Close
                  </button>

                </div>
              )}


            {/* =================================================
                ADD / EDIT FORM
            ================================================= */}

            {modalMode !== "view" && (

              <form
                className="patient-form"
                onSubmit={handleSubmit}
              >

                {/* PATIENT ID */}

                <div className="form-group">

                  <label>
                    Patient ID
                  </label>

                  <input
                    type="text"
                    value={formData.id}
                    readOnly
                    className="readonly-input"
                  />

                  {modalMode === "add" && (
                    <small>
                      Automatically generated unique ID
                    </small>
                  )}

                </div>


                {/* FULL NAME */}

                <div className="form-group">

                  <label>
                    Full Name <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter patient name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                </div>


                {/* AGE + GENDER */}

                <div className="form-row">

                  <div className="form-group">

                    <label>
                      Age <span>*</span>
                    </label>

                    <input
                      type="number"
                      name="age"
                      placeholder="Age"
                      min="0"
                      value={formData.age}
                      onChange={handleChange}
                      required
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Gender <span>*</span>
                    </label>

                    <div className="select-wrapper">

                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        required
                      >

                        <option value="">
                          Select gender
                        </option>

                        <option value="Male">
                          Male
                        </option>

                        <option value="Female">
                          Female
                        </option>

                        <option value="Other">
                          Other
                        </option>

                      </select>

                      <ChevronDown size={17} />

                    </div>

                  </div>

                </div>


                {/* CONDITION */}

                <div className="form-group">

                  <label>
                    Condition <span>*</span>
                  </label>

                  <div className="select-wrapper">

                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      required
                    >

                      <option value="Diabetes">
                        Diabetes
                      </option>

                      <option value="Heart Disease">
                        Heart Disease
                      </option>

                      <option value="Hypertension">
                        Hypertension
                      </option>

                      <option value="Asthma">
                        Asthma
                      </option>

                      <option value="Other">
                        Other
                      </option>

                    </select>

                    <ChevronDown size={17} />

                  </div>

                </div>


                {/* CONTACT */}

                <div className="form-group">

                  <label>
                    Contact Number
                  </label>

                  <input
                    type="tel"
                    name="contact"
                    placeholder="Enter contact number"
                    value={formData.contact}
                    onChange={handleChange}
                  />

                </div>


                {/* BUTTONS */}

                <div className="patient-modal-actions">

                  <button
                    type="button"
                    className="modal-cancel-button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="modal-submit-button"
                  >
                    {modalMode === "add"
                      ? "Add Patient"
                      : "Save Changes"}
                  </button>

                </div>

              </form>

            )}

          </div>

        </div>

      )}

    </div>
  );
}