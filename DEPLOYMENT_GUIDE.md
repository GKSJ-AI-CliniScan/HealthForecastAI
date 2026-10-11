# HealthForest AI - Deployment Guide

**Last Updated:** October 10, 2026  
**Version:** 1.0 (Post-Audit Fix)

---

## Quick Start Deployment

### Prerequisites

- GitHub account with repository access
- Render account (free tier)
- Cloudflare account (for DNS)
- Python 3.11+ (for local development)
- Node.js 22+ (for frontend development)

---

## Deployment Options

### Option 1: Deploy to Render (Recommended for Demo)

This is the current production deployment method.

#### Step 1: Prepare the Database

1. **Run Database Migration**
   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Verify Schema Changes**
   ```sql
   -- Connect to your PostgreSQL database
   \dt risk_predictions
   -- Should show: id, patient_id, admission_id, readmission_probability, 
   --               risk_category, model_name, model_version, clinical_insights, created_at
   ```

#### Step 2: Train the AI Model

1. **Train the model (if not already trained)**
   ```bash
   cd ml
   python -m src.models.train
   ```

2. **Verify model artifact exists**
   ```bash
   ls ml/artifacts/readmission_model.joblib
   ```

3. **Upload model to GitHub Releases (for Render to download)**
   - Go to GitHub → Releases → Create New Release
   - Upload `ml/artifacts/readmission_model.joblib` as a release asset
   - Copy the download URL

#### Step 3: Configure Render

1. **Open Render Dashboard**
   - Go to https://dashboard.render.com
   - Select your HealthForecast AI project

2. **Set Environment Variables**

   | Variable | Value | Source |
   |----------|-------|--------|
   | `DEBUG` | `false` | Manual |
   | `SECRET_KEY` | (generate with Python) | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `DATABASE_URL` | (auto-configured) | Render PostgreSQL |
   | `MODEL_ARTIFACT_URL` | (GitHub Release URL) | GitHub Releases |
   | `BACKEND_CORS_ORIGINS` | `https://your-clouflare-domain.workers.dev,http://localhost:5173` | Cloudflare + Local |
   | `RISK_THRESHOLD_HIGH` | `0.20` | Default |
   | `RISK_THRESHOLD_MEDIUM` | `0.12` | Default |

3. **Trigger Redeployment**
   ```bash
   git add .
   git commit -m "Deploy: Clinical insights persistence fix"
   git push
   ```

4. **Wait for Deployment**
   - Render will show build progress
   - Wait for "Build successful" message
   - Service will restart automatically

#### Step 4: Verify Deployment

1. **Test Health Endpoint**
   ```bash
   curl https://healthfor-ai.onrender.com/health
   # Expected: {"status": "healthy", "version": "1.0"}
   ```

2. **Test Risk Prediction**
   ```bash
   curl -X POST https://healthfor-ai.onrender.com/api/v1/risk/predict \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "patient_id": 1,
       "persist": true,
       "time_in_hospital": 5,
       "num_medications": 10,
       "num_lab_procedures": 30,
       "number_diagnoses": 5,
       "age_group": "65-74",
       "gender": "Female",
       "race": "Caucasian",
       "admission_type": "Emergency",
       "discharge_disposition": "Home",
       "num_procedures": 2,
       "number_inpatient": 0,
       "number_emergency": 1,
       "number_outpatient": 0,
       "diag_1_group": "Diabetes",
       "change": "Ch",
       "diabetesMed": "Yes",
       "insulin": "No"
     }'
   ```

3. **Test Clinical Insights**
   ```bash
   curl https://healthfor-ai.onrender.com/api/v1/clinical-support/recommendations/1 \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

4. **Test Frontend**
   - Open https://your-clouflare-domain.workers.dev
   - Login with demo credentials
   - Navigate to Clinical Insights page
   - Verify recommendations load and persist

---

### Option 2: Deploy Locally for Development

#### Step 1: Install Dependencies

```bash
# Backend
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt

# Frontend
cd frontend
npm install

# ML
cd ml
pip install -r requirements.txt
```

#### Step 2: Start Database (PostgreSQL)

```bash
# Using Docker
docker run -d \
  --name healthforecast-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=healthforecast \
  -p 5432:5432 \
  postgres:15

# Run migrations
cd backend
alembic upgrade head
```

#### Step 3: Train Model

```bash
cd ml
python -m src.models.train
```

#### Step 4: Start Backend

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 5: Start Frontend

```bash
cd frontend
npm run dev
```

#### Step 6: Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1
- API Docs: http://localhost:8000/docs

---

### Option 3: Deploy with Docker

#### Build Images

```bash
# Backend
cd backend
docker build -t healthforecast-backend .

# Frontend
cd frontend
docker build -t healthforecast-frontend .
```

#### Run with Docker Compose

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration

# Start services
docker-compose up -d
```

---

## Cloudflare Configuration

### DNS Records

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | healthfor-ai.ram6070246 | (Backend IP from Render) | Proxied |
| A | www | (Backend IP from Render) | Proxied |
| CNAME | @ | (Render-provided hostname) | Proxied |

### Page Rules (Optional)

1. **Cache Static Assets**
   - URL: `healthfor-ai.ram6070246.workers.dev/static/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 week

2. **Bypass Cache for API**
   - URL: `healthfor-ai.ram6070246.workers.dev/api/*`
   - Cache Level: Bypass

---

## Monitoring & Maintenance

### Health Checks

Render automatically monitors `/health` endpoint:
```json
{
  "status": "healthy",
  "version": "1.0",
  "database": "connected",
  "model_loaded": true
}
```

### Logs

View logs in Render Dashboard → Services → Your Service → Logs

Or via CLI:
```bash
render api-get /v1/services/your-service-id/logs
```

### Database Backups

Render automatically creates daily backups for PostgreSQL:
- Retention: 7 days
- Restore via Render Dashboard → Databases → Your Database → Backups

---

## Troubleshooting

### Issue: Model Not Loaded

**Symptoms:**
- `/risk/predict` returns 503
- `/risk/drivers` returns 503

**Solution:**
1. Verify `MODEL_ARTIFACT_URL` is set and accessible
2. Check Render logs for download errors
3. Ensure model artifact is in `.joblib` format

### Issue: Database Connection Failed

**Symptoms:**
- Backend crashes on startup
- Logs show "could not connect to server"

**Solution:**
1. Verify `DATABASE_URL` is correct format
2. Check Render PostgreSQL service status
3. Verify security group allows Render IP ranges

### Issue: CORS Errors

**Symptoms:**
- Frontend can't call backend API
- Browser shows "CORS policy" error

**Solution:**
1. Update `BACKEND_CORS_ORIGINS` with frontend URL
2. Include both `http://localhost:5173` (local) and production URL
3. Restart backend after change

### Issue: Slow Initial Requests

**Symptoms:**
- First prediction takes 15-30 seconds
- Subsequent requests are fast

**Solution:**
- This is expected behavior - model loads on first request
- Consider upgrade to Render Standard tier for always-on instances
- Or implement pre-warming with scheduled health check

### Issue: Clinical Insights Not Persisting

**Symptoms:**
- Recommendations generate but disappear on refresh
- `/insights/{patient_id}` returns 404

**Solution:**
1. Verify migration ran successfully:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'risk_predictions' 
   AND column_name = 'clinical_insights';
   ```
2. Check `/recommendations` is being called with `persist=true`
3. Verify patient has risk prediction before generating insights

---

## Rollback Procedure

If issues occur after deployment:

1. **Revert to Previous Commit**
   ```bash
   git revert HEAD
   git push
   ```

2. **Render Auto-Rollback**
   - Render will detect new push and redeploy
   - Previous version will be restored

3. **Database Rollback**
   ```bash
   cd backend
   alembic downgrade -1  # Revert one migration
   ```

---

## Support

For deployment issues:
1. Check Render Dashboard for build errors
2. Review backend logs for startup issues
3. Verify environment variables are set correctly
4. Test endpoints locally before production deployment

---

**Deployment Completed By:** [Your Name]  
**Date:** [Date]  
**Version:** 1.0