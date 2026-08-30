"""Convenience runner for HealthForecast AI FastAPI & Dashboards."""
import sys
import uvicorn
from pathlib import Path

# Add backend directory to python path
repo_root = Path(__file__).resolve().parent
backend_dir = repo_root / "backend"
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    print("=" * 60)
    print("HealthForecast AI Clinical Dashboard Server")
    print("Dashboard Hub: http://localhost:8000/dashboards/")
    print("Swagger Docs:  http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", app_dir=str(backend_dir), host="127.0.0.1", port=8000, reload=True)

