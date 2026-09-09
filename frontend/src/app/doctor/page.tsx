export default function DoctorDashboard() {
  return (
    <div>

      <p className="doctor-page-label">
        Healthcare Dashboard
      </p>

      <h1 className="doctor-page-title">
        Welcome back, Doctor
      </h1>

      <p className="doctor-page-description">
        Monitor patient health, risks, treatments and admissions.
      </p>


      {/* STAT CARDS */}

      <div className="doctor-stats">

        <div className="doctor-stat-card">
          <p>Total Patients</p>
          <h2>120</h2>
          <span>Patients under care</span>
        </div>

        <div className="doctor-stat-card">
          <p>High Risk Patients</p>
          <h2>18</h2>
          <span>Require attention</span>
        </div>

        <div className="doctor-stat-card">
          <p>Readmissions</p>
          <h2>12</h2>
          <span>Recent readmissions</span>
        </div>

        <div className="doctor-stat-card">
          <p>Active Treatments</p>
          <h2>34</h2>
          <span>Currently monitored</span>
        </div>

      </div>


      {/* RECENT PATIENTS */}

      <div className="doctor-patient-card">

        <div className="doctor-card-header">

          <div>
            <h2>Recent Patients</h2>
            <p>Recently accessed patient records</p>
          </div>

          <a href="/doctor/patients">
            View All
          </a>

        </div>


        <div className="doctor-table">

          <div className="doctor-table-row doctor-table-heading">
            <span>PATIENT ID</span>
            <span>NAME</span>
            <span>AGE</span>
            <span>STATUS</span>
          </div>


          <div className="doctor-table-row">
            <span>P001</span>
            <span>Ananya Sharma</span>
            <span>45</span>
            <span className="status-active">
              Active
            </span>
          </div>


          <div className="doctor-table-row">
            <span>P002</span>
            <span>Rahul Kumar</span>
            <span>62</span>
            <span className="status-risk">
              High Risk
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}