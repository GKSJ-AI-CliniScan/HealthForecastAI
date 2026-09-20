$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:8000/api/v1"

Write-Host ""
Write-Host "========================================"
Write-Host " HealthForecast AI - M3 Demo Data Seed"
Write-Host "========================================"
Write-Host ""

# ------------------------------------------------------------
# 1. Authenticate
# ------------------------------------------------------------

$loginBody = @{
    email = "admin@healthforecast.ai"
    password = "Admin@12345"
} | ConvertTo-Json

Write-Host "Authenticating..."

$login = Invoke-RestMethod `
    -Uri "$baseUrl/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody

if ($login.role -ne "system_admin") {
    throw "M3 seed requires a system_admin account."
}

$headers = @{
    Authorization = "Bearer $($login.access_token)"
}

Write-Host "Authentication successful."
Write-Host ""

# ------------------------------------------------------------
# 2. Get patients
# ------------------------------------------------------------

Write-Host "Loading patients..."

$patients = Invoke-RestMethod `
    -Uri "$baseUrl/patients" `
    -Headers $headers `
    -Method Get

if ($patients.Count -eq 0) {
    throw "No patients were found. Seed patients before running M3 seed."
}

Write-Host "Patients available: $($patients.Count)"
Write-Host ""

# ------------------------------------------------------------
# 3. Treatment catalogue
# ------------------------------------------------------------

$treatments = @(
    "Medication Adjustment",
    "Insulin Therapy",
    "Antibiotic Therapy",
    "Physical Therapy",
    "Supportive Care"
)

$admissionTypes = @(
    "Emergency",
    "Elective",
    "Urgent"
)

$outcomes = @(
    "improved",
    "stable",
    "partial_recovery"
)

# ------------------------------------------------------------
# 4. Create admissions and treatment outcomes
# ------------------------------------------------------------

$createdAdmissions = 0
$createdTreatments = 0

$patientIndex = 0

foreach ($patient in $patients) {

    $patientIndex++

    Write-Host "Processing patient $patientIndex / $($patients.Count): patient_id=$($patient.id)"

    # --------------------------------------------------------
    # Admission 1
    # --------------------------------------------------------

    $month1 = (($patientIndex - 1) % 8) + 1
    $day1 = (($patientIndex - 1) % 20) + 1

    $admissionDate1 = Get-Date `
        -Year 2026 `
        -Month $month1 `
        -Day $day1

    $stay1 = 3 + (($patientIndex * 2) % 6)

    $dischargeDate1 = $admissionDate1.AddDays($stay1)

    $admissionBody1 = @{
        patient_id = [int]$patient.id
        admission_date = $admissionDate1.ToString("yyyy-MM-dd")
        discharge_date = $dischargeDate1.ToString("yyyy-MM-dd")
        time_in_hospital = $stay1
        admission_type = $admissionTypes[($patientIndex - 1) % $admissionTypes.Count]
        discharge_disposition = "Home"
        num_medications = 4 + (($patientIndex * 3) % 12)
        num_lab_procedures = 25 + (($patientIndex * 7) % 45)
        number_diagnoses = 2 + (($patientIndex * 2) % 7)
        readmitted = "NO"
    } | ConvertTo-Json

    $admission1 = Invoke-RestMethod `
        -Uri "$baseUrl/admissions" `
        -Headers $headers `
        -Method Post `
        -ContentType "application/json" `
        -Body $admissionBody1

    $createdAdmissions++

    # Treatment for admission 1

    $treatmentIndex1 = ($patientIndex - 1) % $treatments.Count

    $recovery1 = 65 + (($patientIndex * 4) % 31)

    $outcomeIndex1 = ($patientIndex - 1) % $outcomes.Count

    $treatmentBody1 = @{
        admission_id = [int]$admission1.id
        treatment_name = $treatments[$treatmentIndex1]
        medication_change = ($patientIndex % 2 -eq 0)
        recovery_score = [double]$recovery1
        length_of_stay_days = $stay1
        outcome = $outcomes[$outcomeIndex1]
    } | ConvertTo-Json

    Invoke-RestMethod `
        -Uri "$baseUrl/treatment/outcomes" `
        -Headers $headers `
        -Method Post `
        -ContentType "application/json" `
        -Body $treatmentBody1 | Out-Null

    $createdTreatments++

    # --------------------------------------------------------
    # Admission 2
    # --------------------------------------------------------

    $month2 = (($month1 + 2 - 1) % 8) + 1
    $day2 = (($patientIndex * 3) % 20) + 1

    $admissionDate2 = Get-Date `
        -Year 2026 `
        -Month $month2 `
        -Day $day2

    $stay2 = 2 + (($patientIndex * 3) % 8)

    $dischargeDate2 = $admissionDate2.AddDays($stay2)

    # Create a mixture of readmission outcomes.
    if ($patientIndex % 5 -eq 0) {
        $readmitted = "<30"
    }
    elseif ($patientIndex % 3 -eq 0) {
        $readmitted = ">30"
    }
    else {
        $readmitted = "NO"
    }

    $admissionBody2 = @{
        patient_id = [int]$patient.id
        admission_date = $admissionDate2.ToString("yyyy-MM-dd")
        discharge_date = $dischargeDate2.ToString("yyyy-MM-dd")
        time_in_hospital = $stay2
        admission_type = $admissionTypes[$patientIndex % $admissionTypes.Count]
        discharge_disposition = "Home"
        num_medications = 5 + (($patientIndex * 2) % 14)
        num_lab_procedures = 20 + (($patientIndex * 5) % 50)
        number_diagnoses = 3 + (($patientIndex * 3) % 7)
        readmitted = $readmitted
    } | ConvertTo-Json

    $admission2 = Invoke-RestMethod `
        -Uri "$baseUrl/admissions" `
        -Headers $headers `
        -Method Post `
        -ContentType "application/json" `
        -Body $admissionBody2

    $createdAdmissions++

    # Treatment for admission 2

    $treatmentIndex2 = $patientIndex % $treatments.Count

    $recovery2 = 55 + (($patientIndex * 5) % 41)

    if ($recovery2 -ge 80) {
        $outcome2 = "improved"
    }
    elseif ($recovery2 -ge 65) {
        $outcome2 = "stable"
    }
    else {
        $outcome2 = "partial_recovery"
    }

    $treatmentBody2 = @{
        admission_id = [int]$admission2.id
        treatment_name = $treatments[$treatmentIndex2]
        medication_change = ($patientIndex % 3 -eq 0)
        recovery_score = [double]$recovery2
        length_of_stay_days = $stay2
        outcome = $outcome2
    } | ConvertTo-Json

    Invoke-RestMethod `
        -Uri "$baseUrl/treatment/outcomes" `
        -Headers $headers `
        -Method Post `
        -ContentType "application/json" `
        -Body $treatmentBody2 | Out-Null

    $createdTreatments++
}

# ------------------------------------------------------------
# 5. Summary
# ------------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " M3 Demo Data Complete"
Write-Host "========================================"
Write-Host ""

Write-Host "Patients processed:       $($patients.Count)"
Write-Host "Admissions created:       $createdAdmissions"
Write-Host "Treatment outcomes:       $createdTreatments"

Write-Host ""
Write-Host "M3 analytics data is ready."
Write-Host ""