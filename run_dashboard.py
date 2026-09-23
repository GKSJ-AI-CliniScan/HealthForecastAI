"""Convenience runner for HealthForecast AI FastAPI & Dashboards."""
import sys
import threading
import webbrowser
from pathlib import Path
import uvicorn

# Add backend directory to python path
repo_root = Path(__file__).resolve().parent
backend_dir = repo_root / "backend"
sys.path.insert(0, str(backend_dir))


def open_browser_tab():
    """Automatically pop open the browser once the server initializes."""
    try:
        webbrowser.open("http://127.0.0.1:8000/dashboards/")
    except Exception:
        pass


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    print("=" * 60)
    print("HealthForecast AI Clinical Dashboard Server")
    print("Dashboard Hub: http://127.0.0.1:8000/dashboards/")
    print("Swagger Docs:  http://127.0.0.1:8000/docs")
    print("=" * 60)

    # Launch browser automatically after 1.5 seconds
    threading.Timer(1.5, open_browser_tab).start()

    uvicorn.run("app.main:app", app_dir=str(backend_dir), host="127.0.0.1", port=8000, reload=True)
