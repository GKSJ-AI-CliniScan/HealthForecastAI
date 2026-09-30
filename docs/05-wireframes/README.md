# Wireframes and delivered screens

Milestone 1 delivered these screens. The layouts below describe what is built,
so they double as the wireframe deliverable and as a map of the frontend.

Every screen is role-aware: the navigation is built from the caller's permission
list (`GET /api/v1/auth/permissions`), and the API authorises independently, so
hiding a nav item is a convenience and never the security boundary.

## Login — all roles

```
┌───────────────────────────────────────────────┐
│         PREDICTIVE HEALTHCARE INTELLIGENCE    │
│              HealthForecast AI                │
│   Hospital readmission prediction and         │
│        patient risk intelligence              │
│                                               │
│   ┌─────────────────────────────────────┐     │
│   │ Email     [                       ] │     │
│   │ Password  [                       ] │     │
│   │ [ error message, if any           ] │     │
│   │ ┌─────────────────────────────────┐ │     │
│   │ │           Sign in               │ │     │
│   │ └─────────────────────────────────┘ │     │
│   └─────────────────────────────────────┘     │
│  Your role determines what you can see.       │
│              Access is logged.                │
└───────────────────────────────────────────────┘
```

States: idle, submitting (button disabled), error (same message for an unknown
email and a wrong password, so the form cannot be used to enumerate accounts).

## Application shell — all roles

```
┌──────────────────────────────────────────────────────────────────────┐
│ HealthForecast AI  [Dashboard][Patients][Analytics][Research][Users]  │
│                                        Dr Anitha Reddy   [Sign out]  │
│                                        Doctor · Endocrinology        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                          page content                                │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ 7 permissions granted to this role. Every patient record access is   │
│ written to the audit log.                                            │
└──────────────────────────────────────────────────────────────────────┘
```

Navigation per role:

| Role | Tabs shown |
|------|-----------|
| Doctor | Dashboard, Patients |
| Hospital Administrator | Dashboard, Patients, Analytics |
| Healthcare Researcher | Dashboard, Research |
| System Administrator | Dashboard, Patients, Analytics, Research, Users |

## Dashboard — all roles, scoped numbers

```
┌──────────────────────────────────────────────────────────────────────┐
│ DOCTOR                                                               │
│ Welcome back, Dr Anitha Reddy                                        │
│ Your assigned caseload                                               │
│                                                                      │
│ ┌───────────┐ ┌───────────┐ ┌───────────────┐ ┌──────────────────┐   │
│ │ PATIENTS  │ │ADMISSIONS │ │30-DAY READMITS│ │ READMISSION RATE │   │
│ │  34,995   │ │  34,995   │ │     3,134     │ │      8.96%       │   │
│ │Assigned   │ │Inpatient  │ │Returned w/30d │ │Avg stay 4.28 days│   │
│ └───────────┘ └───────────┘ └───────────────┘ └──────────────────┘   │
│                                                                      │
│ Where to go next                                                     │
│  [ Patient records        Review and manage ]                        │
└──────────────────────────────────────────────────────────────────────┘
```

A doctor sees their own caseload; every other role sees the hospital. The tile
values come from `GET /api/v1/analytics/dashboard`, scoped server-side.

## Patients — doctor, hospital administrator, system administrator

```
┌──────────────────────────────────────────────────────────────────────┐
│ Patients                            [ Search MRN or diagnosis ][Search]│
│ Patients assigned to you. Records outside your caseload are not listed.│
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ MRN       │ AGE BAND │ GENDER │ PRIMARY DIAGNOSIS │              │ │
│ │ MRN-135   │ 50-60    │ Female │ Circulatory       │  Open        │ │
│ │ MRN-729   │ 80-90    │ Female │ Injury            │  Open        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ Showing 1–25 of 34,995                        [Previous]  [Next]     │
└──────────────────────────────────────────────────────────────────────┘
```

States: loading, empty ("No patients are assigned to you yet" / "No patients
match your search"), error.

## Patient detail — doctor, hospital administrator, system administrator

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Patients                                                           │
│ MRN-135                                                              │
│ 50-60 · Female · Caucasian                                           │
│ ┌────────────┐ ┌──────────────────┐ ┌─────────────────┐              │
│ │ ADMISSIONS │ │30-DAY READMISSION│ │  AVERAGE STAY   │              │
│ │     1      │ │        1         │ │    8.0 days     │              │
│ └────────────┘ └──────────────────┘ └─────────────────┘              │
│                                                                      │
│ Clinical summary                                                     │
│  Primary diagnosis group: Circulatory   Assigned doctor: User #2     │
│                                                                      │
│ Admission history                                                    │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │TYPE  │STAY│MEDS│LABS│DIAGS│DISCHARGE        │OUTCOME            │ │
│ │Urgent│ 8  │ 33 │ 77 │  8  │Discharged home  │Readmitted <30 days│ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

A patient outside the caller's caseload renders "This patient is not in your
caseload" — the API returned 404, not 403.

## Analytics — hospital administrator, system administrator

```
┌──────────────────────────────────────────────────────────────────────┐
│ Healthcare analytics                                                 │
│ ┌────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────┐              │
│ │PATIENTS│ │ADMISSIONS│ │30-DAY READMIT│ │ AVG STAY   │              │
│ │ 69,990 │ │  69,990  │ │    6,285     │ │ 4.27 days  │              │
│ └────────┘ └──────────┘ └──────────────┘ └────────────┘              │
│                                                                      │
│ Readmission rate by age band                                         │
│ 12% ┤                                                                │
│  9% ┤                              ▄▄  ██  ██  ▆▆                    │
│  6% ┤        ▄▄  ▄▄  ▄▄  ▄▄  ▄▄   ██  ██  ██  ██                    │
│  3% ┤   ▂▂   ██  ██  ██  ██  ██   ██  ██  ██  ██                    │
│  0% └───┴────┴───┴───┴───┴───┴────┴───┴───┴───┴──                    │
│      0-10 10-20 …                        80-90 90-100                │
│                                                                      │
│ Readmission rate by admission type · Length of stay distribution     │
│ Admission types in detail (table)                                    │
└──────────────────────────────────────────────────────────────────────┘
```

## Research — healthcare researcher, system administrator

```
┌──────────────────────────────────────────────────────────────────────┐
│ Research cohort                                                      │
│ De-identified records only. Medical record numbers are replaced by   │
│ salted, non-reversible pseudonyms, stable between queries.           │
│ ┌────────────┐ ┌──────────────┐ ┌────────────┐                       │
│ │COHORT SIZE │ │GENDER GROUPS │ │ AGE BANDS  │                       │
│ │  69,990    │ │      2       │ │     10     │                       │
│ └────────────┘ └──────────────┘ └────────────┘                       │
│ Readmission rate by age band (chart, aggregated only)                │
│ By gender (table)          By recorded race (table)                  │
│                                                                      │
│ Anonymised records                                                   │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ PSEUDO ID             │AGE BAND│GENDER│PRIMARY DIAGNOSIS        │ │
│ │ PT-0066DDF28ED99D50   │ 50-60  │Female│Circulatory              │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

No MRN, no assigned doctor, no row that could be joined back to a person.

## Users — system administrator only

```
┌──────────────────────────────────────────────────────────────────────┐
│ User management                                                      │
│ Accounts are deactivated, never deleted - the audit log references   │
│ them.                                                                │
│                                                                      │
│ Create a user                                                        │
│  Full name [        ]   Email [               ]                      │
│  Role      [Doctor ▾]   Department [          ]                      │
│  Temporary password (minimum 8 characters) [              ]          │
│  [ Create user ]                                                     │
│                                                                      │
│ Accounts                                                             │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │NAME            │EMAIL                │ROLE   │STATUS │           │ │
│ │Dr Anitha Reddy │dr.reddy@…           │Doctor │Active │Deactivate │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

The administrator's own row has its Deactivate button disabled — locking
yourself out would leave the platform unmanageable, and the API rejects it too.

## Rules

- Every wireframe shows the empty and error state, not just the happy path.
- No real patient data appears in any mockup. The MRNs above are synthetic
  surrogate keys derived from the public dataset, not real record numbers.
- Commit image exports as PNG or SVG under 1 MB and link them from
  [`docs/06-milestones/milestone-1.md`](../06-milestones/milestone-1.md).
