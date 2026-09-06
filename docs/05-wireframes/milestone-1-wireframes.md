# UI Wireframes and Workflow Specifications - Milestone 1

The following wireframes and workflow specifications reflect the implemented frontend user interface and client-side application state on branch `intern/20-kiruthika-b`.

---

## Screen 1 - Login (`/login`)

```
+------------------------------------------------------+
|                                                      |
|         +----------------------------------+         |
|         |  HealthForecast AI               |         |
|         |  Sign in to the readmission      |         |
|         |  risk platform                   |         |
|         |                                  |         |
|         |  Email                           |         |
|         |  [____________________________]  |         |
|         |                                  |         |
|         |  Password                        |         |
|         |  [____________________________]  |         |
|         |                                  |         |
|         |  [ error message, if any      ]  |         |
|         |                                  |         |
|         |  [        Sign in            ]   |         |
|         |                                  |         |
|         |  Access is role based.           |         |
|         +----------------------------------+         |
|                                                      |
+------------------------------------------------------+
```

- Form fields are validated on submit and disabled during active state transitions.
- Client-side validation errors render inside the card using `role="alert"`.
- Supports demonstration sign-in for all 4 clinical roles (Doctor, Hospital Admin, Researcher, System Admin).

---

## Screen 2 - Dashboard (`/dashboard`)

```
+---------------------------------------------------------------+
| HealthForecast AI       [Role Switcher / User Profile] [Sign out]|
| Dr. Sarah Jenkins, MD • Cardiology & Internal Medicine        |
+---------------------------------------------------------------+
| Overview                                        [ Refresh ]    |
| Your assigned clinical scope                                   |
|                                                                |
| +----------+ +------------+ +----------------+ +-------------+ |
| | Patients | | Admissions | | Readmitted <30 | | Avg stay /  | |
| |    48    | |    112     | |       9        | | Bed Occup.  | |
| |          | |            | |  8.0% rate     | |  4.2 days   | |
| +----------+ +------------+ +----------------+ +-------------+ |
|                                                                |
| High-Risk Patient Monitoring                                   |
| +------------------------------------------------------------+ |
| | MRN / ID   | Demographics | Diagnosis  | Risk Tier | Action| |
| |------------|--------------|------------|-----------|-------| |
| | MRN-104928 | [70-80) Male | T2 Diabetes| High (84%)| View  | |
| | MRN-209841 | [50-60) Fem  | Cong Heart | High (78%)| View  | |
| +------------------------------------------------------------+ |
+---------------------------------------------------------------+
```

The dashboard adapts dynamically to the active role:

| Role | Metric Card 1 | Metric Card 4 | Table Header | Identifier Column |
|---|---|---|---|---|
| **Doctor** | Assigned Patients (48) | Avg Length of Stay (4.2 Days) | High-Risk Patient Monitoring | MRN |
| **Hospital Administrator** | Total Patients (1,240) | Bed Occupancy (86.4%) | High-Risk Patient Monitoring | MRN |
| **Healthcare Researcher** | Total Patients (101,766)| Avg Length of Stay (4.39 Days)| De-identified Research Cohort | Cohort ID (Names hidden) |
| **System Administrator** | Total Patients (1,240) | Avg Length of Stay (4.8 Days) | High-Risk Patient Monitoring | MRN |

---

## Screen 3 - Error and Loading States

```
+---------------------------------------------------------------+
| Overview                                        [ Refresh ]    |
|                                                                |
| +------------------------------------------------------------+ |
| | Unable to retrieve data                                    | |
| | [ Error details / Network message ]                        | |
| | [ Try Again Button ]                                       | |
| +------------------------------------------------------------+ |
+---------------------------------------------------------------+
```

- **Loading State:** Rendered with animated pulse skeletons (`Skeleton.tsx`) or custom `LoadingState` spinner (`Retrieving patient dossier...`).
- **Error State:** Handled via `ErrorMessage.tsx` with error alert styling and retry action.

---

## Screen 4 - Patient Management Directory (`/patients`)

```
+---------------------------------------------------------------+
| HealthForecast AI                    [Role]    [ Sign out ]    |
+---------------------------------------------------------------+
| <- Dashboard                                                  |
| Patient Management Directory                   [ 6 Total ]    |
|                                                                |
| [ Search MRN, Name, Diagnosis... ] [Risk: All] [Status: All]  |
| [All Patients | My Assigned Patients]  <- (Doctor role only)  |
|                                                                |
| +------------------------------------------------------------+ |
| | MRN       | Patient Name | Diagnosis   | Status   | Action | |
| |-----------|--------------|-------------|----------|--------| |
| | MRN-104928| A. Pendleton | T2 Diabetes |Inpatient | View ->| |
| | MRN-209841| M. Santos    | Heart Fail  |Inpatient | View ->| |
| | MRN-771920| D. Gable     | Asthma      |Discharged| View ->| |
| +------------------------------------------------------------+ |
| Showing 1 to 5 of 6 records           [Prev] Page 1 of 2 [Next]|
+---------------------------------------------------------------+
```

- Real-time debounced keyword search across MRN, patient name, primary diagnosis, and department.
- Multi-dimensional filtering: Risk Tier (`All`, `High`, `Medium`, `Low`) and Status (`All`, `Inpatient`, `Discharged`).
- Doctor Caseload scoping toggle (`All Patients` vs `My Assigned Patients`).

---

## Screen 5 - Patient Details Dossier (`/patients/[id]`)

```
+---------------------------------------------------------------+
| <- Back to Patient List                        [ Print ]      |
+---------------------------------------------------------------+
| Arthur Pendleton                      [ High Risk (84%) ]     |
| MRN: MRN-104928 • Male, [70-80) • Internal Medicine           |
| Primary: Type 2 Diabetes with Ketoacidosis • Attending: Dr. S |
+---------------------------------------------------------------+
| [ Basic Info ]  [ Medical History ]  [ Admissions ]  [ Care ] |
|                                                                |
| [Active Tab Content Area]                                     |
|                                                                |
| Basic Info: Demographics, Contacts, Emergency Contact          |
| Medical History: Chronic Conditions, Allergies, BMI, Smoking   |
| Admission History: Encounter Timeline, Stay Length, 30d Status |
| Treatment & Care: Medications Table, Lab Results, Care Plan    |
+---------------------------------------------------------------+
```

- **Top Clinical Header:** Displays patient identity, risk badge with readmission percentage, demographics, and attending physician.
- **Default View:** Tab 1 (`Basic Information`) is selected by default on initial page load.
- **Tabbed Sections:**
  1. `Basic Information`: Demographics, phone, email, home address, emergency contacts.
  2. `Medical History`: Chronic conditions list, allergies, BMI, smoking status.
  3. `Admission History`: Admission dates, discharge dates, length of stay, 30-day readmission status.
  4. `Treatment & Care`: Prescribed medications table, lab results, clinical care plans.
- **Navigation:** `← Back to Patient List` button links back to `/patients`.

---

## Workflow - Authentication and Route Protection

```
User visits application or submits login form
        |
        v
AuthProvider resolves session from sessionStorage or mock account
        |
        +-- Unauthenticated user accesses /dashboard, /patients, /patients/[id]
        |       |
        |       v
        |   Client route guard redirects immediately to /login
        |
        +-- Authenticated user (Doctor / Admin / Researcher / SysAdmin)
                |
                v
        Access granted to /dashboard
                |
                +--> Launch Patient Directory (/patients)
                |
                +--> Inspect Patient Dossier (/patients/[id])
                |
                +--> Sign out: clears sessionStorage and redirects to /login
```

---

## Planned Backend & Full-Stack Integration (Milestone 2 & beyond)

- Connection to live FastAPI backend endpoints (`POST /auth/login`, `GET /auth/me`, `GET /patients`).
- Dynamic ML model inference for real-time 30-day readmission risk recalculation.
- Interactive historical trend visualizations with Recharts.
