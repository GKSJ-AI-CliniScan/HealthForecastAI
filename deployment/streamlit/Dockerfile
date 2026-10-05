# Streamlit Service Dockerfile for HealthForecast AI
FROM python:3.11-slim

# Prevent Python from writing .pyc and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV STREAMLIT_SERVER_PORT=8501
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements-streamlit.txt /app/
RUN pip install --no-cache-dir -r requirements-streamlit.txt

# Copy project files needed for model inference and Streamlit dashboard
COPY backend/app /app/backend/app
COPY ml/artifacts /app/ml/artifacts
COPY ml/src /app/ml/src
COPY static /app/static
COPY .streamlit /app/.streamlit
COPY streamlit_app.py /app/

EXPOSE 8501

HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

CMD ["streamlit", "run", "streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
