"""Backend-side ML inference support: model loading and feature assembly.

Split from risk_service.py/readmission_service.py because loading a pickled
pipeline and building its input row are concerns those two prediction flows
share identically - keeping them here means there is exactly one place each
is implemented, not one per flow.
"""
