"""Build the final presentation deck.

    pip install python-pptx
    python docs/09-presentation/build_deck.py

Writes docs/09-presentation/HealthForecast-AI-final.pptx. Every number on a slide
comes from the validation report and the milestone reports, so the deck cannot
drift from the evidence: change a figure there, change it here.
"""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.util import Emu, Inches, Pt

OUT = Path(__file__).with_name("HealthForecast-AI-final.pptx")

INK = RGBColor(0x1A, 0x23, 0x32)
MUTED = RGBColor(0x5B, 0x67, 0x78)
ACCENT = RGBColor(0x0B, 0x6E, 0x99)
WARN = RGBColor(0xB4, 0x3A, 0x2B)
GOOD = RGBColor(0x1E, 0x7B, 0x4A)
PAPER = RGBColor(0xFF, 0xFF, 0xFF)

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]


def text(slide, left, top, width, height, lines, size=18, colour=INK, bold=False):
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    frame = box.text_frame
    frame.word_wrap = True
    for i, line in enumerate(lines if isinstance(lines, list) else [lines]):
        paragraph = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        paragraph.text = line
        paragraph.font.size = Pt(size)
        paragraph.font.color.rgb = colour
        paragraph.font.bold = bold
        paragraph.space_after = Pt(6)
    return box


def slide(title: str, subtitle: str | None = None):
    s = prs.slides.add_slide(BLANK)
    band = s.shapes.add_shape(1, 0, 0, prs.slide_width, Inches(0.18))
    band.fill.solid()
    band.fill.fore_color.rgb = ACCENT
    band.line.fill.background()
    text(s, 0.6, 0.45, 12, 0.9, title, size=32, bold=True)
    if subtitle:
        text(s, 0.6, 1.25, 12, 0.6, subtitle, size=16, colour=MUTED)
    return s


def bullets(s, items, top=2.0, left=0.6, width=12, size=20):
    text(s, left, top, width, 5, [f"•  {item}" for item in items], size=size)


def stat(s, left, top, value, label, colour=ACCENT):
    text(s, left, top, 3.0, 0.9, value, size=40, colour=colour, bold=True)
    text(s, left, top + 0.85, 3.0, 0.8, label, size=14, colour=MUTED)


# 1 ------------------------------------------------------------------------
s = prs.slides.add_slide(BLANK)
text(s, 0.8, 2.2, 11.5, 1.2, "HealthForecast AI", size=54, bold=True, colour=ACCENT)
text(
    s, 0.8, 3.5, 11.5, 1.2,
    "Hospital readmission prediction and patient risk intelligence",
    size=26,
)
text(
    s, 0.8, 5.6, 11.5, 0.8,
    "Final presentation  ·  Milestones 1-4  ·  September 2026",
    size=16, colour=MUTED,
)

# 2 ------------------------------------------------------------------------
s = slide("The problem", "One in eleven diabetic patients is back within 30 days")
bullets(s, [
    "Readmissions are costly, penalised in many health systems, and often avoidable.",
    "Ward teams cannot review every discharge, so they need to know who to look at first.",
    "Our answer: rank patients by risk, say why, and suggest what to do - with a clinician "
    "always making the call.",
    "Data: Diabetes 130-US Hospitals, 101,766 encounters; 62,991 patients after cleaning.",
])

# 3 ------------------------------------------------------------------------
s = slide("What was built", "Four milestones, one platform")
bullets(s, [
    "M1  Secure foundation: JWT auth, four-role access matrix, patient records, dashboards, "
    "data pipeline into PostgreSQL.",
    "M2  A calibrated risk model, real-time and batch scoring, risk bands, forecasting.",
    "M3  Treatment effectiveness, hospital performance, trend monitoring, care "
    "recommendations, audited privacy-safe exports.",
    "M4  Validation, hardening, containers, deployment path, end-to-end tests, documentation.",
], size=19)

# 4 ------------------------------------------------------------------------
s = slide("Architecture")
for i, (title, body) in enumerate([
    ("Next.js 15", "Role-aware dashboards, patient page, treatment and performance views"),
    ("FastAPI", "RBAC on every route, scoping inside SQL, audit log, statistics services"),
    ("PostgreSQL 16", "Patients, admissions, treatments, predictions; Alembic migrations"),
    ("ML pipeline", "Clean, split, calibrate, tune threshold, explain, score, audit fairness"),
]):
    left = 0.6 + i * 3.15
    box = s.shapes.add_shape(1, Inches(left), Inches(2.0), Inches(2.9), Inches(2.6))
    box.fill.solid()
    box.fill.fore_color.rgb = RGBColor(0xEE, 0xF4, 0xF8)
    box.line.color.rgb = ACCENT
    text(s, left + 0.15, 2.15, 2.6, 0.6, title, size=20, bold=True, colour=ACCENT)
    text(s, left + 0.15, 2.85, 2.6, 1.8, body, size=14)
text(s, 0.6, 5.1, 12, 1.2,
     "nginx in front in production · Docker Compose · GitHub Actions CI on every branch · "
     "manual, gated deploy workflow", size=16, colour=MUTED)

# 5 ------------------------------------------------------------------------
s = slide("Does the model work?", "Held-out test set: 12,599 patients, never used to fit or tune")
chart_data = CategoryChartData()
chart_data.categories = ["High (>=20%)", "Medium (12-20%)", "Low (<12%)"]
chart_data.add_series("Predicted", (24.6, 15.1, 6.9))
chart_data.add_series("Observed", (24.7, 13.2, 7.5))
frame = s.shapes.add_chart(
    XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.6), Inches(2.0), Inches(7.2), Inches(4.8), chart_data
)
chart = frame.chart
chart.has_legend = True
chart.legend.position = XL_LEGEND_POSITION.BOTTOM
chart.legend.include_in_layout = False
chart.value_axis.has_major_gridlines = False
chart.value_axis.tick_labels.font.size = Pt(12)
chart.category_axis.tick_labels.font.size = Pt(12)
plot = chart.plots[0]
plot.has_data_labels = True
plot.data_labels.font.size = Pt(12)
plot.data_labels.number_format = '0.0"%"'
plot.data_labels.number_format_is_linked = False
plot.series[0].format.fill.solid()
plot.series[0].format.fill.fore_color.rgb = MUTED
plot.series[1].format.fill.solid()
plot.series[1].format.fill.fore_color.rgb = ACCENT
stat(s, 8.3, 2.0, "0.633", "ROC-AUC (95% CI 0.618-0.650)")
stat(s, 8.3, 3.6, "2.6x", "readmission rate in the high band vs baseline", GOOD)
stat(s, 8.3, 5.2, "0.538", "ROC-AUC of the rule already in use (prior stays)", WARN)

# 6 ------------------------------------------------------------------------
s = slide("Honest about the limits", "A triage aid, not a diagnosis")
bullets(s, [
    "ROC-AUC 0.63 sits inside the published 0.63-0.68 range for this dataset. It is modest.",
    "Catches 50% of readmissions by flagging a third of patients; 14% of those flagged are "
    "readmitted. That is a trade-off for the hospital to set, not a bug.",
    "Probabilities are honest: predicted and observed agree in the high and low bands.",
    "The Risk page scores patients the model was trained on, so it shows sharper bands; "
    "it says so on the page.",
])

# 7 ------------------------------------------------------------------------
s = slide("Why this patient?", "Every score comes with reasons and suggested actions")
bullets(s, [
    "Per-patient factors: what would this patient's risk be if only this factor were typical?",
    "14 transparent rules produce care actions - each with its rationale and the exact "
    "values from the record that triggered it.",
    "Rules and thresholds are published at /clinical-support/rules for clinical review.",
    "Everything is labelled decision support: illustrative rules, clinician must review.",
    "A discharge plan groups actions before, at and after discharge.",
])

# 8 ------------------------------------------------------------------------
s = slide("Treatment effectiveness", "Association, adjusted for who gets treated")
bullets(s, [
    "Sicker patients get more treatment, so raw comparisons mislead. Odds ratios are "
    "stratified by age and prior admissions (Mantel-Haenszel).",
    "Insulin: 10.1% vs 8.6% readmitted; adjusted odds ratio 1.22 (1.15-1.29).",
    "Recovery is a labelled proxy: not readmitted and discharged home (69.0%). The data "
    "holds no clinical recovery score and we did not invent one.",
    "Every report states that it is observational and cannot prove cause.",
])

# 9 ------------------------------------------------------------------------
s = slide("Monitoring found a real problem", "The control chart caught a data artifact")
bullets(s, [
    "The newest encounters showed impossibly low readmission rates.",
    "Cause: right-censoring. The data has no dates, and recent patients have not had time "
    "to be readmitted yet.",
    "Fix: hold back the newest 10% of encounters, with a documented sensitivity table.",
    "A small residual signal remains and is left visible rather than tuned away.",
    "Observed vs expected by department: overall 5,894 vs 5,923 (ratio 0.995).",
])

# 10 -----------------------------------------------------------------------
s = slide("Fairness audit", "Race and gender are not inputs. We checked anyway.")
bullets(s, [
    "Recall: women 0.55, men 0.45. Age 40-50: 0.34, age 70+: 0.57. Race: within noise.",
    "Calibration holds in every group large enough to test (observed/expected 0.91-1.07).",
    "The gaps are reported, not hidden - with the cutoff that would close each gap and "
    "its cost in precision.",
    "Closing them means group-specific thresholds: a clinical and ethical decision that "
    "belongs to the hospital.",
])

# 11 -----------------------------------------------------------------------
s = slide("Security and privacy by construction")
bullets(s, [
    "Four roles, one access matrix, enforced in code and pinned by tests; "
    "out-of-scope records return 404, not 403.",
    "Every read of patient data and every export is audited.",
    "Research export is pseudonymised, k-anonymous (k >= 5, default 10), and formula-injection safe; "
    "groups under 11 are suppressed.",
    "Lockout after 5 failed sign-ins; production refuses to start with a default secret; "
    "no-store cache headers; docs off in production.",
    "Known gap: token in sessionStorage - an httpOnly cookie is the next step.",
], size=17)

# 12 -----------------------------------------------------------------------
s = slide("Deployment", "Containers now; a cloud VM with one gated workflow")
bullets(s, [
    "docker compose up: Postgres, MongoDB, one-shot migration, API (4 workers), frontend.",
    "Production overlay: nginx is the only published port; secrets are required or "
    "compose refuses to start.",
    "GitHub Actions 'Deploy' verifies, builds images and, when a host is configured, "
    "releases over SSH and health-checks. With no host set it skips cleanly.",
    "A live cloud URL needs the owner's cloud account - it has not been created here.",
])

# 13 -----------------------------------------------------------------------
s = slide("Evidence")
stat(s, 0.8, 1.9, "283", "backend tests")
stat(s, 4.4, 1.9, "58 + 12", "ML tests + end-to-end checks")
stat(s, 8.0, 1.9, "14", "new analytics endpoints (M3)")
stat(s, 0.8, 4.0, "0.2-0.4 s", "typical dashboard query, 63k patients")
stat(s, 4.4, 4.0, "62,991", "patients analysed")
stat(s, 8.0, 4.0, "4 roles", "one access matrix, tested on every endpoint", GOOD)

# 14 -----------------------------------------------------------------------
s = slide("Demonstration path", "Ten minutes, four roles")
bullets(s, [
    "Doctor: caseload, a high-risk patient, the reasons, the discharge plan.",
    "Hospital administrator: performance table and control chart; export the CSV.",
    "Researcher: the anonymous dataset - and the 403 when they ask for a patient.",
    "System administrator: users and the audit trail of what we just did.",
    "Then: sign in wrongly six times and watch the lockout.",
])

# 15 -----------------------------------------------------------------------
s = slide("What comes next")
bullets(s, [
    "Real admission dates: monthly trends instead of an encounter sequence.",
    "Clinical validation of the recommendation rules with the care team.",
    "A decision on group thresholds after reviewing the fairness audit.",
    "httpOnly cookie sessions; model monitoring and drift alerts.",
    "External validation on a second hospital's data before any clinical use.",
])

prs.save(OUT)
print(f"wrote {OUT} ({len(prs.slides)} slides)")
