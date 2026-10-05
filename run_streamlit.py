"""Convenience runner for HealthForecast AI Streamlit Application."""
import sys
import subprocess
import webbrowser
import threading
from pathlib import Path


def open_browser():
    """Automatically pop open the browser once the Streamlit server starts."""
    try:
        webbrowser.open("http://localhost:8501")
    except Exception:
        pass


def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    repo_root = Path(__file__).resolve().parent
    streamlit_app = repo_root / "streamlit_app.py"

    print("=" * 65)
    print("HealthForecast AI - Streamlit Clinical Intelligence Platform")
    print("Dashboard URL: http://localhost:8501")
    print("=" * 65)

    threading.Timer(2.0, open_browser).start()

    cmd = [
        sys.executable,
        "-m",
        "streamlit",
        "run",
        str(streamlit_app),
        "--server.port=8501",
        "--server.headless=false",
    ]

    try:
        subprocess.run(cmd, cwd=str(repo_root))
    except KeyboardInterrupt:
        print("\n[INFO] Streamlit server stopped by user.")


if __name__ == "__main__":
    main()
