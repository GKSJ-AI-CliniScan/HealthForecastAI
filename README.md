# HEALTHFORECAST AI 🏥⚡
### Hospital Readmission Prediction & Patient Risk Intelligence System

HEALTHFORECAST AI is an enterprise healthcare analytics platform designed for clinical decision support, readmission risk forecasting, and hospital outcome intelligence.

---

## 🚀 Phase 1 Architecture Completed

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Python 3.11, FastAPI, Pydantic, PyMongo/Motor
- **Database**: MongoDB Atlas (`HealthForecastAI`)
- **Security**: JWT Authentication structure & Role-Based Access Control (RBAC)

---

## 📁 Repository Structure

```
dhana infosyss/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── security.py      # JWT & password hashing utilities
│   │   ├── db/
│   │   │   └── mongo.py         # MongoDB Atlas connection manager & health checks
│   │   ├── routers/
│   │   │   └── health.py        # /api/health endpoint
│   │   ├── config.py            # Pydantic settings loading from .env
│   │   └── main.py              # FastAPI main application & CORS setup
│   ├── .env                     # Backend environment configuration
│   ├── Dockerfile
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # Role-specific portal layouts (Doctor, Admin, Researcher, System)
│   │   │   ├── login/           # Professional Healthcare Authentication UI
│   │   │   ├── globals.css      # Custom healthcare Tailwind CSS styles
│   │   │   └── layout.tsx       # Root layout
│   │   ├── components/
│   │   │   ├── health/          # Live MongoDB Atlas status indicator badge
│   │   │   ├── layout/          # Sidebar, Header & Role Switcher
│   │   │   └── ui/              # Reusable UI primitives (Button, Card, Badge, LoadingSkeleton)
│   │   ├── lib/
│   │   │   ├── api.ts           # API client connecting to FastAPI backend
│   │   │   └── utils.ts         # Formatting & classname helpers
│   │   └── types/               # TypeScript interfaces
│   ├── .env.local               # Frontend environment configuration
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
├── docker-compose.yml           # Deployment configuration
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Configuration

### Backend `.env` (`backend/.env`):
```env
MONGODB_URL=mongodb+srv://padharthidhanalakshmi_db_user:12ikStIgljXUNJa0@cluster0.wnx5exe.mongodb.net/?appName=Cluster0
DATABASE_NAME=HealthForecastAI
SECRET_KEY=healthforecast_ai_secret_key_super_secure_jwt_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PORT=8000
```

### Frontend `.env.local` (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=HealthForecast AI
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## 🛠️ How to Run the Application

### 1. Run FastAPI Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend server will start at: `http://127.0.0.1:8000`
- Interactive API Documentation: `http://127.0.0.1:8000/docs`
- Health & Database Connection API: `http://127.0.0.1:8000/api/health`

### 2. Run Next.js Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend application will start at: `http://localhost:3000`

---

## 👥 Role-Based Portals

1. **Doctor Portal** (`/dashboard/doctor`): Assigned patient roster, risk alerts, clinical decision support.
2. **Hospital Administrator Portal** (`/dashboard/admin`): Hospital-wide readmission rates & departmental performance.
3. **Healthcare Researcher Portal** (`/dashboard/researcher`): De-identified population stats & dataset generator.
4. **System Administrator Portal** (`/dashboard/system`): User management, security audit logs & AI model registry.

---

## 🛡️ Clinical Decision Support Notice
Predictions and risk scores provided by HealthForecast AI are decision-support indicators and do not constitute a formal medical diagnosis.
