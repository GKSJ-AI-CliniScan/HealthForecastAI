$ErrorActionPreference = "Stop"

$BASE_URL = "http://localhost:8000/api/v1"

Write-Host ""
Write-Host "========================================="
Write-Host " HealthForecastAI Demo Data Seeder"
Write-Host "========================================="
Write-Host ""

# ------------------------------------------------------------
# Helper
# ------------------------------------------------------------

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )

    $params = @{
        Method  = $Method
        Uri     = "$BASE_URL$Url"
        Headers = $Headers
        ContentType = "application/json"
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    return Invoke-RestMethod @params
}

function Write-Step {
    param([string]$Message)

    Write-Host ""
    Write-Host "-----------------------------------------" -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "-----------------------------------------" -ForegroundColor DarkGray
}

# ------------------------------------------------------------
# 1. LOGIN AS SYSTEM ADMIN
# ------------------------------------------------------------

Write-Step "1. Logging in as system administrator"

$loginBody = @{
    email    = "admin@healthforecast.ai"
    password = "Admin@12345"
}

$login = Invoke-Api `
    -Method "POST" `
    -Url "/auth/login" `
    -Body $loginBody

$TOKEN = $login.access_token

$headers = @{
    Authorization = "Bearer $TOKEN"
}

Write-Host "System administrator login successful." -ForegroundColor Green

# ------------------------------------------------------------
# 2. CREATE USERS
# ------------------------------------------------------------

Write-Step "2. Creating demo users"

$users = @(
    @{
        email      = "sarah.mitchell@healthforecast.ai"
        full_name  = "Dr. Sarah Mitchell"
        role       = "doctor"
        department = "Cardiology"
        password   = "Demo@12345"
    },
    @{
        email      = "james.wilson@healthforecast.ai"
        full_name  = "Dr. James Wilson"
        role       = "doctor"
        department = "Internal Medicine"
        password   = "Demo@12345"
    },
    @{
        email      = "priya.nair@healthforecast.ai"
        full_name  = "Dr. Priya Nair"
        role       = "doctor"
        department = "Endocrinology"
        password   = "Demo@12345"
    },
    @{
        email      = "michael.chen@healthforecast.ai"
        full_name  = "Dr. Michael Chen"
        role       = "doctor"
        department = "General Medicine"
        password   = "Demo@12345"
    },
    @{
        email      = "elena.rodriguez@healthforecast.ai"
        full_name  = "Elena Rodriguez"
        role       = "hospital_admin"
        department = "Hospital Administration"
        password   = "Demo@12345"
    },
    @{
        email      = "robert.anderson@healthforecast.ai"
        full_name  = "Robert Anderson"
        role       = "hospital_admin"
        department = "Operations"
        password   = "Demo@12345"
    },
    @{
        email      = "david.kumar@healthforecast.ai"
        full_name  = "Dr. David Kumar"
        role       = "researcher"
        department = "Clinical Research"
        password   = "Demo@12345"
    },
    @{
        email      = "emily.thompson@healthforecast.ai"
        full_name  = "Emily Thompson"
        role       = "researcher"
        department = "Population Health"
        password   = "Demo@12345"
    }
)

$createdUsers = @()

foreach ($user in $users) {

    try {
        $result = Invoke-Api `
            -Method "POST" `
            -Url "/users" `
            -Body $user `
            -Headers $headers

        $createdUsers += $result

        Write-Host (
            "Created: {0} | ID={1} | Role={2}" -f
            $result.full_name,
            $result.id,
            $result.role
        ) -ForegroundColor Green
    }
    catch {
        Write-Host (
            "Skipped: {0} - user may already exist." -f
            $user.email
        ) -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# 3. LOAD USERS
# ------------------------------------------------------------

Write-Step "3. Loading users to determine doctor IDs"

$allUsers = Invoke-Api `
    -Method "GET" `
    -Url "/users?limit=100" `
    -Headers $headers

$doctorUsers = @(
    $allUsers | Where-Object {
        $_.role -eq "doctor"
    }
)

Write-Host ""
Write-Host "Doctors available:" -ForegroundColor Cyan

foreach ($doctor in $doctorUsers) {
    Write-Host (
        "ID={0} | {1} | {2}" -f
        $doctor.id,
        $doctor.full_name,
        $doctor.department
    )
}

if ($doctorUsers.Count -lt 4) {
    throw "At least four doctors are required for the demo dataset."
}

# ------------------------------------------------------------
# 4. CREATE PATIENTS
# ------------------------------------------------------------

Write-Step "4. Creating synthetic patients"

$patientData = @(
    @{
        medical_record_number = "MRN-DEMO-101"
        age_group             = "20-29"
        gender                = "Female"
        race                  = "Asian"
        primary_diagnosis     = "Asthma"
        doctor_index          = 0
        time_in_hospital      = 2
        num_medications       = 4
        num_lab_procedures    = 20
        number_diagnoses      = 2
        number_inpatient      = 0
        number_emergency      = 0
    },
    @{
        medical_record_number = "MRN-DEMO-102"
        age_group             = "30-39"
        gender                = "Male"
        race                  = "Hispanic"
        primary_diagnosis     = "Hyperlipidemia"
        doctor_index          = 1
        time_in_hospital      = 2
        num_medications       = 5
        num_lab_procedures    = 18
        number_diagnoses      = 2
        number_inpatient      = 0
        number_emergency      = 0
    },
    @{
        medical_record_number = "MRN-DEMO-103"
        age_group             = "40-49"
        gender                = "Female"
        race                  = "Caucasian"
        primary_diagnosis     = "Diabetes"
        doctor_index          = 2
        time_in_hospital      = 3
        num_medications       = 6
        num_lab_procedures    = 25
        number_diagnoses      = 3
        number_inpatient      = 0
        number_emergency      = 1
    },
    @{
        medical_record_number = "MRN-DEMO-104"
        age_group             = "50-59"
        gender                = "Male"
        race                  = "AfricanAmerican"
        primary_diagnosis     = "Hypertension"
        doctor_index          = 3
        time_in_hospital      = 3
        num_medications       = 7
        num_lab_procedures    = 30
        number_diagnoses      = 3
        number_inpatient      = 1
        number_emergency      = 0
    },
    @{
        medical_record_number = "MRN-DEMO-105"
        age_group             = "60-69"
        gender                = "Female"
        race                  = "Caucasian"
        primary_diagnosis     = "Heart disease"
        doctor_index          = 0
        time_in_hospital      = 5
        num_medications       = 10
        num_lab_procedures    = 45
        number_diagnoses      = 5
        number_inpatient      = 1
        number_emergency      = 1
    },
    @{
        medical_record_number = "MRN-DEMO-106"
        age_group             = "70-79"
        gender                = "Male"
        race                  = "Caucasian"
        primary_diagnosis     = "Heart failure"
        doctor_index          = 1
        time_in_hospital      = 7
        num_medications       = 14
        num_lab_procedures    = 60
        number_diagnoses      = 7
        number_inpatient      = 2
        number_emergency      = 2
    },
    @{
        medical_record_number = "MRN-DEMO-107"
        age_group             = "80-89"
        gender                = "Female"
        race                  = "Caucasian"
        primary_diagnosis     = "Chronic kidney disease"
        doctor_index          = 2
        time_in_hospital      = 9
        num_medications       = 18
        num_lab_procedures    = 75
        number_diagnoses      = 9
        number_inpatient      = 3
        number_emergency      = 3
    },
    @{
        medical_record_number = "MRN-DEMO-108"
        age_group             = "60-69"
        gender                = "Male"
        race                  = "AfricanAmerican"
        primary_diagnosis     = "COPD"
        doctor_index          = 3
        time_in_hospital      = 8
        num_medications       = 16
        num_lab_procedures    = 70
        number_diagnoses      = 8
        number_inpatient      = 3
        number_emergency      = 2
    },
    @{
        medical_record_number = "MRN-DEMO-109"
        age_group             = "50-59"
        gender                = "Female"
        race                  = "Hispanic"
        primary_diagnosis     = "Pneumonia"
        doctor_index          = 0
        time_in_hospital      = 6
        num_medications       = 12
        num_lab_procedures    = 55
        number_diagnoses      = 6
        number_inpatient      = 2
        number_emergency      = 2
    },
    @{
        medical_record_number = "MRN-DEMO-110"
        age_group             = "40-49"
        gender                = "Male"
        race                  = "Asian"
        primary_diagnosis     = "Diabetes"
        doctor_index          = 1
        time_in_hospital      = 4
        num_medications       = 9
        num_lab_procedures    = 38
        number_diagnoses      = 4
        number_inpatient      = 1
        number_emergency      = 1
    },
    @{
        medical_record_number = "MRN-DEMO-111"
        age_group             = "70-79"
        gender                = "Female"
        race                  = "AfricanAmerican"
        primary_diagnosis     = "Heart failure"
        doctor_index          = 2
        time_in_hospital      = 10
        num_medications       = 20
        num_lab_procedures    = 85
        number_diagnoses      = 10
        number_inpatient      = 4
        number_emergency      = 4
    },
    @{
        medical_record_number = "MRN-DEMO-112"
        age_group             = "80-89"
        gender                = "Male"
        race                  = "Caucasian"
        primary_diagnosis     = "Pneumonia"
        doctor_index          = 3
        time_in_hospital      = 12
        num_medications       = 22
        num_lab_procedures    = 95
        number_diagnoses      = 11
        number_inpatient      = 5
        number_emergency      = 4
    },
    @{
        medical_record_number = "MRN-DEMO-113"
        age_group             = "30-39"
        gender                = "Female"
        race                  = "Other"
        primary_diagnosis     = "Asthma"
        doctor_index          = 0
        time_in_hospital      = 2
        num_medications       = 3
        num_lab_procedures    = 15
        number_diagnoses      = 1
        number_inpatient      = 0
        number_emergency      = 0
    },
    @{
        medical_record_number = "MRN-DEMO-114"
        age_group             = "40-49"
        gender                = "Male"
        race                  = "Caucasian"
        primary_diagnosis     = "Hypertension"
        doctor_index          = 1
        time_in_hospital      = 3
        num_medications       = 6
        num_lab_procedures    = 28
        number_diagnoses      = 3
        number_inpatient      = 0
        number_emergency      = 1
    },
    @{
        medical_record_number = "MRN-DEMO-115"
        age_group             = "50-59"
        gender                = "Female"
        race                  = "AfricanAmerican"
        primary_diagnosis     = "Diabetes"
        doctor_index          = 2
        time_in_hospital      = 5
        num_medications       = 11
        num_lab_procedures    = 48
        number_diagnoses      = 5
        number_inpatient      = 1
        number_emergency      = 2
    },
    @{
        medical_record_number = "MRN-DEMO-116"
        age_group             = "60-69"
        gender                = "Male"
        race                  = "Caucasian"
        primary_diagnosis     = "COPD"
        doctor_index          = 3
        time_in_hospital      = 7
        num_medications       = 15
        num_lab_procedures    = 65
        number_diagnoses      = 7
        number_inpatient      = 2
        number_emergency      = 3
    },
    @{
        medical_record_number = "MRN-DEMO-117"
        age_group             = "70-79"
        gender                = "Female"
        race                  = "Hispanic"
        primary_diagnosis     = "Heart disease"
        doctor_index          = 0
        time_in_hospital      = 8
        num_medications       = 17
        num_lab_procedures    = 72
        number_diagnoses      = 8
        number_inpatient      = 3
        number_emergency      = 2
    },
    @{
        medical_record_number = "MRN-DEMO-118"
        age_group             = "80-89"
        gender                = "Male"
        race                  = "AfricanAmerican"
        primary_diagnosis     = "Chronic kidney disease"
        doctor_index          = 1
        time_in_hospital      = 11
        num_medications       = 21
        num_lab_procedures    = 90
        number_diagnoses      = 10
        number_inpatient      = 5
        number_emergency      = 5
    },
    @{
        medical_record_number = "MRN-DEMO-119"
        age_group             = "50-59"
        gender                = "Female"
        race                  = "Caucasian"
        primary_diagnosis     = "Hyperlipidemia"
        doctor_index          = 2
        time_in_hospital      = 3
        num_medications       = 5
        num_lab_procedures    = 22
        number_diagnoses      = 2
        number_inpatient      = 0
        number_emergency      = 0
    },
    @{
        medical_record_number = "MRN-DEMO-120"
        age_group             = "60-69"
        gender                = "Male"
        race                  = "Asian"
        primary_diagnosis     = "Diabetes"
        doctor_index          = 3
        time_in_hospital      = 5
        num_medications       = 10
        num_lab_procedures    = 45
        number_diagnoses      = 5
        number_inpatient      = 1
        number_emergency      = 1
    },
    @{
        medical_record_number = "MRN-DEMO-121"
        age_group             = "70-79"
        gender                = "Female"
        race                  = "Caucasian"
        primary_diagnosis     = "Pneumonia"
        doctor_index          = 1
        time_in_hospital      = 9
        num_medications       = 19
        num_lab_procedures    = 80
        number_diagnoses      = 9
        number_inpatient      = 4
        number_emergency      = 3
    },
    @{
        medical_record_number = "MRN-DEMO-122"
        age_group             = "40-49"
        gender                = "Male"
        race                  = "Other"
        primary_diagnosis     = "Asthma"
        doctor_index          = 0
        time_in_hospital      = 2
        num_medications       = 4
        num_lab_procedures    = 19
        number_diagnoses      = 2
        number_inpatient      = 0
        number_emergency      = 0
    },
    @{
        medical_record_number = "MRN-DEMO-123"
        age_group             = "50-59"
        gender                = "Female"
        race                  = "Hispanic"
        primary_diagnosis     = "Hypertension"
        doctor_index          = 3
        time_in_hospital      = 4
        num_medications       = 8
        num_lab_procedures    = 35
        number_diagnoses      = 4
        number_inpatient      = 1
        number_emergency      = 0
    },
    @{
        medical_record_number = "MRN-DEMO-124"
        age_group             = "60-69"
        gender                = "Male"
        race                  = "AfricanAmerican"
        primary_diagnosis     = "Heart failure"
        doctor_index          = 2
        time_in_hospital      = 9
        num_medications       = 18
        num_lab_procedures    = 78
        number_diagnoses      = 9
        number_inpatient      = 4
        number_emergency      = 3
    },
    @{
        medical_record_number = "MRN-DEMO-125"
        age_group             = "30-39"
        gender                = "Female"
        race                  = "Asian"
        primary_diagnosis     = "Diabetes"
        doctor_index          = 1
        time_in_hospital      = 3
        num_medications       = 5
        num_lab_procedures    = 25
        number_diagnoses      = 3
        number_inpatient      = 0
        number_emergency      = 1
    },
    @{
        medical_record_number = "MRN-DEMO-126"
        age_group             = "70-79"
        gender                = "Male"
        race                  = "Caucasian"
        primary_diagnosis     = "COPD"
        doctor_index          = 3
        time_in_hospital      = 10
        num_medications       = 20
        num_lab_procedures    = 88
        number_diagnoses      = 10
        number_inpatient      = 5
        number_emergency      = 4
    },
    @{
        medical_record_number = "MRN-DEMO-127"
        age_group             = "50-59"
        gender                = "Female"
        race                  = "Caucasian"
        primary_diagnosis     = "Heart disease"
        doctor_index          = 0
        time_in_hospital      = 6
        num_medications       = 13
        num_lab_procedures    = 55
        number_diagnoses      = 6
        number_inpatient      = 2
        number_emergency      = 1
    },
    @{
        medical_record_number = "MRN-DEMO-128"
        age_group             = "80-89"
        gender                = "Female"
        race                  = "Hispanic"
        primary_diagnosis     = "Chronic kidney disease"
        doctor_index          = 2
        time_in_hospital      = 13
        num_medications       = 24
        num_lab_procedures    = 100
        number_diagnoses      = 12
        number_inpatient      = 6
        number_emergency      = 5
    },
    @{
        medical_record_number = "MRN-DEMO-129"
        age_group             = "40-49"
        gender                = "Male"
        race                  = "AfricanAmerican"
        primary_diagnosis     = "Hyperlipidemia"
        doctor_index          = 1
        time_in_hospital      = 2
        num_medications       = 4
        num_lab_procedures    = 20
        number_diagnoses      = 2
        number_inpatient      = 0
        number_emergency      = 0
    },
    @{
        medical_record_number = "MRN-DEMO-130"
        age_group             = "60-69"
        gender                = "Female"
        race                  = "Caucasian"
        primary_diagnosis     = "Pneumonia"
        doctor_index          = 3
        time_in_hospital      = 8
        num_medications       = 16
        num_lab_procedures    = 70
        number_diagnoses      = 8
        number_inpatient      = 3
        number_emergency      = 3
    }
)

$createdPatients = @()

foreach ($patient in $patientData) {

    $doctor = $doctorUsers[
        $patient.doctor_index
    ]

    $body = @{
        medical_record_number = $patient.medical_record_number
        age_group             = $patient.age_group
        gender                = $patient.gender
        race                  = $patient.race
        primary_diagnosis     = $patient.primary_diagnosis
        assigned_doctor_id    = $doctor.id
    }

    try {
        $result = Invoke-Api `
            -Method "POST" `
            -Url "/patients" `
            -Body $body `
            -Headers $headers

        $createdPatients += @{
            patient = $result
            features = $patient
        }

        Write-Host (
            "Created patient: {0} | ID={1} | Doctor={2}" -f
            $result.medical_record_number,
            $result.id,
            $doctor.full_name
        ) -ForegroundColor Green
    }
    catch {
        Write-Host (
            "Skipped patient: {0} - may already exist." -f
            $patient.medical_record_number
        ) -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# 5. SCORE EVERY PATIENT
# ------------------------------------------------------------

Write-Step "5. Running readmission predictions"

$predictionResults = @()

foreach ($item in $createdPatients) {

    $patient = $item.patient
    $features = $item.features

    $predictionBody = @{
        patient_id          = $patient.id
        time_in_hospital    = $features.time_in_hospital
        num_medications     = $features.num_medications
        num_lab_procedures  = $features.num_lab_procedures
        number_diagnoses    = $features.number_diagnoses
        number_inpatient    = $features.number_inpatient
        number_emergency    = $features.number_emergency
        age_group           = $features.age_group
    }

    try {
        $prediction = Invoke-Api `
            -Method "POST" `
            -Url "/risk/predict" `
            -Body $predictionBody `
            -Headers $headers

        $predictionResults += $prediction

        $percentage = (
            $prediction.readmission_probability * 100
        )

        Write-Host (
            "{0,-16} {1,7:N1}%  {2}" -f
            $patient.medical_record_number,
            $percentage,
            $prediction.risk_category
        )
    }
    catch {
        Write-Host (
            "Prediction failed for patient {0}" -f
            $patient.id
        ) -ForegroundColor Red
    }
}

# ------------------------------------------------------------
# 6. SUMMARY
# ------------------------------------------------------------

Write-Step "6. Demo data summary"

$low = @(
    $predictionResults |
    Where-Object {
        $_.risk_category -eq "low"
    }
).Count

$medium = @(
    $predictionResults |
    Where-Object {
        $_.risk_category -eq "medium"
    }
).Count

$high = @(
    $predictionResults |
    Where-Object {
        $_.risk_category -eq "high"
    }
).Count

Write-Host ""
Write-Host "Users created/available: $($allUsers.Count)"
Write-Host "Doctors available:       $($doctorUsers.Count)"
Write-Host "Patients scored:         $($predictionResults.Count)"
Write-Host ""
Write-Host "Risk distribution"
Write-Host "-----------------"
Write-Host "Low:                      $low"
Write-Host "Medium:                   $medium"
Write-Host "High:                     $high"

Write-Host ""
Write-Host "========================================="
Write-Host " Demo data seeding completed"
Write-Host "========================================="
Write-Host ""

Write-Host "Demo user password:"
Write-Host "Demo@12345" -ForegroundColor Yellow

Write-Host ""
Write-Host "Open:"
Write-Host "http://localhost:3000"
Write-Host ""
Write-Host "Then open:"
Write-Host "http://localhost:3000/risk"
Write-Host ""