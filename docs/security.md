# Security & Compliance Architecture — HealthForecast AI

HealthForecast AI incorporates defense-in-depth principles and healthcare data protection safeguards aligned with the Health Insurance Portability and Accountability Act (HIPAA) and modern cloud security benchmarks.

---

## 1. Authentication & Token Management

- **Protocol**: JSON Web Token (JWT) based stateless authentication (RFC 7519).
- **Signature Algorithm**: HMAC with SHA-256 (`HS256`) using a cryptographically secure 256-bit secret key (`JWT_SECRET_KEY`).
- **Token Expiration**: Access tokens expire in 60 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES=60`).
- **Password Hashing**: Passwords stored using `bcrypt` with adaptive work factor salt rounds. Plaintext passwords are never logged or stored.
- **Client Storage**: Tokens are kept in memory and application storage, transmitted in standard `Authorization: Bearer <token>` headers over HTTPS.

---

## 2. Role-Based Access Control (RBAC)

The system implements a multi-tenant role hierarchy enforced at both FastAPI route dependencies and React frontend route guards:

| Role | Scope & Permissions | Restricted Operations |
|---|---|---|
| **DOCTOR** | Access assigned patient records, submit encounters, run readmission risk assessments, prescribe treatments. | Cannot view system audit logs or reassign other physicians' patients. |
| **HOSPITAL_ADMIN** | Hospital-wide bed occupancy, readmission rates by department, physician workload, and operational metrics. | Cannot alter raw clinical notes or individual treatment plans. |
| **RESEARCHER** | Access population-level health trends, model evaluation statistics, aggregate demographic summaries. | **All Protected Health Information (PHI) is de-identified** into salted pseudonyms (`ANON-PAT-XXXXXX`). Direct access to names, SSNs, phone numbers is blocked. |
| **SYSTEM_ADMIN** | User lifecycle management (create, suspend, role assignment), system health diagnostics, audit trail inspection. | Cannot access raw clinical diagnosis notes without an audit event trigger. |

---

## 3. Data Protection & HIPAA De-Identification

To support ethical healthcare research while strictly adhering to HIPAA Safe Harbor guidelines:
1. **Salted Pseudonymization**:
   - Researcher queries pass through `deidentify_patient` middleware.
   - Real patient IDs and names are irreversibly transformed:
     ```python
     pseudo_id = f"ANON-PAT-{hashlib.sha256((str(patient.id) + SALT).encode()).hexdigest()[:8].upper()}"
     ```
2. **Field Suppression**:
   - Dates of birth are generalized to age groups (e.g., `[50-60)`).
   - Contact numbers, email addresses, and postal addresses are stripped from researcher-facing responses.

---

## 4. Network Security & CORS Policy

- **Cross-Origin Resource Sharing**:
  - In development: Approved localhost ports are whitelisted.
  - In production (`ENVIRONMENT=production`): Origin is strictly locked to the verified `FRONTEND_URL` (e.g. `https://healthforecast-ai.vercel.app`). Wildcard `*` origin access is strictly rejected.
- **Transport Layer Security (TLS)**:
  - All web traffic to Vercel is routed through modern TLS 1.3.
  - API communication to Render runs exclusively over HTTPS.
  - Render-to-Neon database traffic is encrypted with mandatory TLS (`sslmode=require`).

---

## 5. Defense Against Common Vulnerabilities

- **SQL Injection Prevention**:
  - All database interactions use SQLAlchemy 2.0 ORM with parameterized query construction. No raw dynamic SQL string formatting is permitted.
- **Cross-Site Scripting (XSS) & Input Sanitization**:
  - Strict Pydantic v2 schemas validate and sanitize all incoming payloads on the backend.
  - React auto-escapes string content during DOM rendering.
  - Content Security Policy and protective HTTP headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`) prevent clickjacking and MIME-sniffing attacks.
- **Rate Limiting & DoS Protection**:
  - Render and Vercel edge routers provide DDoS filtering and rate limiting for abnormal traffic volumes.

---

## 6. Audit Logging & Compliance Monitoring

- **Immutable Audit Trail**:
  - High-privilege events (patient record creation, export, risk calculation, role modification) create an audit record in the `audit_logs` table.
  - Each entry captures: `timestamp`, `user_id`, `user_role`, `action`, `resource_type`, `resource_id`, and client IP address.
- **Tamper Evidence**:
  - Audit log entries are append-only. No API endpoint exists for deleting or altering audit records.
