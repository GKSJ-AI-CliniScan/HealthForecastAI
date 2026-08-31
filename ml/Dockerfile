FROM python:3.11-slim

WORKDIR /workspace

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt /workspace/requirements.txt

RUN python -m pip install --upgrade pip \
    && python -m pip install \
    numpy==2.0.2 \
    pandas==2.2.3 \
    scipy==1.15.1 \
    scikit-learn==1.6.0 \
    xgboost==2.1.3 \
    imbalanced-learn==0.13.0 \
    joblib==1.4.2 \
    pyarrow==18.1.0 \
    pyyaml==6.0.2 \
    pytest==8.3.4 \
    pytest-cov==6.0.0 \
    ruff==0.8.6 \
    black==24.10.0