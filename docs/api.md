# REST API Specification — HealthForecast AI

HealthForecast AI provides a RESTful API with JSON payloads, standard HTTP status codes, and JWT bearer token authorization.

- **Base URL (Local)**: `http://localhost:8000/api/v1`
- **Base URL (Production)**: `https://healthforecast-api.onrender.com/api/v1`
- **Interactive Swagger UI**: `/docs`
- **OpenAPI Schema Specification**: `/openapi.json`

---

## 1. System Endpoints

### 1.1 Health Check
- **Endpoint**: `GET /health`
- **Auth**: None (Public)
- **Response** `(200 OK)`:
  ```json
  {
    "status": "healthy",
    "service": "HealthForecast AI",
    "environment": "production"
  }
  ```

---

## 2. Authentication Endpoints (`/auth`)

### 2.1 User Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "doctor@healthforecast.ai",
    "password": "Password123!"
  }
  ```
- **Response** `(200 OK)`:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": 2,
      "email": "doctor@healthforecast.ai",
      "full_name": "Dr. Sarah Chen",
      "role": "DOCTOR"
    }
  }
  ```

### 2.2 Current User Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Auth**: Bearer Token
- **Response** `(200 OK)`:
  ```json
  {
    "id": 2,
    "email": "doctor@healthforecast.ai",
    "full_name": "Dr. Sarah Chen",
    "role": "DOCTOR",
    "is_active": true
  }
  ```

---

## 3. Patient Management Endpoints (`/patients`)

### 3.1 List Patients
- **Endpoint**: `GET /api/v1/patients/`
- **Auth**: Bearer Token (DOCTOR, HOSPITAL_ADMIN, RESEARCHER)
- **Query Parameters**:
  - `skip` (int, default `0`)
  - `limit` (int, default `50`)
  - `search` (string, optional)
- **Response** `(200 OK)`:
  ```json
  {
    "items": [
      {
        "id": 101,
        "first_name": "Eleanor",
        "last_name": "Vance",
        "date_of_birth": "1958-04-12",
        "gender": "Female",
        "primary_diagnosis": "Type 2 Diabetes Mellitus with Ketoacidosis",
        "admission_date": "2026-09-15T09:30:00Z",
        "risk_tier": "HIGH"
      }
    ],
    "total": 1
  }
  ```
  *(Note: If queried by a RESEARCHER, patient identifiers are replaced with salted pseudonyms `ANON-PAT-XXXXXX`)*.

### 3.2 Get Patient Details
- **Endpoint**: `GET /api/v1/patients/{patient_id}`
- **Auth**: Bearer Token
- **Response** `(200 OK)`: Returns detailed patient demographic, medical history, active medications, and recent lab tests.

---

## 4. Prediction & Machine Learning Endpoints (`/predictions`)

### 4.1 Predict 30-Day Readmission Risk
- **Endpoint**: `POST /api/v1/predictions/predict`
- **Auth**: Bearer Token (DOCTOR, HOSPITAL_ADMIN)
- **Request Body**:
  ```json
  {
    "patient_id": 101,
    "age_group": "[60-70)",
    "time_in_hospital": 6,
    "num_lab_procedures": 48,
    "num_procedures": 2,
    "num_medications": 18,
    "number_outpatient": 0,
    "number_emergency": 1,
    "number_inpatient": 2,
    "number_diagnoses": 9,
    "admission_type": "Emergency",
    "discharge_disposition": "Discharged to Home",
    "admission_source": "Emergency Room",
    "insulin": "Up",
    "diabetes_med": "Yes",
    "change": "Ch"
  }
  ```
- **Response** `(200 OK)`:
  ```json
  {
    "prediction_id": 849,
    "patient_id": 101,
    "risk_score": 78.4,
    "risk_tier": "HIGH",
    "readmission_predicted": true,
    "confidence_interval": [72.1, 84.7],
    "inference_time_ms": 38.2,
    "top_contributing_factors": [
      { "factor": "number_inpatient", "impact": "+24.5%", "description": "Prior hospital admissions within 12 months" },
      { "factor": "num_medications", "impact": "+16.2%", "description": "Polypharmacy (>15 concurrent medications)" },
      { "factor": "time_in_hospital", "impact": "+11.8%", "description": "Extended duration of hospitalization" },
      { "factor": "insulin", "impact": "+9.4%", "description": "Recent upward insulin dose adjustment" }
    ],
    "clinical_recommendations": [
      "Schedule 7-day post-discharge outpatient follow-up appointment.",
      "Conduct comprehensive medication reconciliation with clinical pharmacist.",
      "Enroll in nurse telephone outreach check-in program at 48 hours post-discharge."
    ]
  }
  ```

---

## 5. Analytics & Dashboard Endpoints (`/analytics`)

### 5.1 Executive Dashboard Metrics
- **Endpoint**: `GET /api/v1/analytics/dashboard`
- **Auth**: Bearer Token (DOCTOR, HOSPITAL_ADMIN)
- **Response** `(200 OK)`:
  ```json
  {
    "total_patients_monitored": 1420,
    "high_risk_patients_count": 218,
    "average_readmission_risk": 32.4,
    "predicted_30day_readmissions": 184,
    "risk_distribution": {
      "low": 62.5,
      "medium": 22.1,
      "high": 15.4
    },
    "department_breakdown": [
      { "department": "Cardiology", "patient_count": 310, "readmission_rate": 18.2 },
      { "department": "Endocrinology", "patient_count": 480, "readmission_rate": 21.6 },
      { "department": "Internal Medicine", "patient_count": 630, "readmission_rate": 14.1 }
    ]
  }
  ```

---

## 6. HTTP Error Handling & Status Codes

| Code | Reason | Typical Cause |
|---|---|---|
| `200 OK` | Success | Normal successful query or operation. |
| `201 Created` | Resource Created | Successful patient or encounter registration. |
| `204 No Content` | Deleted | Successful resource deletion. |
| `400 Bad Request` | Validation Failure | Invalid input payload schema or constraints. |
| `401 Unauthorized` | Invalid Token | Missing, expired, or tampered JWT bearer token. |
| `403 Forbidden` | Insufficient Permissions | User role lacks access to requested endpoint. |
| `404 Not Found` | Resource Missing | Specified Patient, Encounter, or ID does not exist. |
| `500 Server Error` | Internal Error | Unhandled server exception (logged with stack trace). |
