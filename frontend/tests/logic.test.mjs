/**
 * logic.test.mjs — unit tests for the pure logic files (imported as TypeScript
 * via Node's type stripping, so no test framework is needed).
 * Covers: backend→UI mappers (the shape fixes), role→page access, voice
 * command matching, patient search filter and CSV safety.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as m from '../src/data/mappers.ts';
import { canOpen, pagesFor, pageForPath } from '../src/lib/nav.ts';
import { matchCommand, normalize } from '../src/a11y/voiceCommands.ts';
import { filterPatients } from '../src/saral/filterPatients.ts';
import { toCsv } from '../src/saral/csv.ts';

// ---------------- mappers: units and shapes the old UI got wrong
test('fractions become percents (backend readmission_rate 0.1123 → 11.2%)', () => {
  assert.equal(m.fractionToPct(0.1123), 11.2);
  assert.equal(m.fractionToPct(7), 100, 'clamped, never > 100%');
  assert.equal(m.fractionToPct(null), 0);
  assert.equal(m.fractionToPctOrNull(null), null, 'missing metric stays missing');
});

test('patient row: risk score fraction, unknown risk → low, missing fields → null', () => {
  const r = m.mapPatientRow({ id: 3, medical_record_number: 'MRN9', risk_category: 'weird', readmission_risk_score: 0.42, gender: 'None' });
  assert.equal(r.riskPct, 42);
  assert.equal(r.risk, 'low');
  assert.equal(r.gender, null, '"None" string from Python is treated as missing');
  assert.equal(r.name, 'Patient MRN9');
});

test('visit: dataset codes <30 / >30 / NO', () => {
  assert.equal(m.mapVisit({ readmitted: '<30' }).returned30, true);
  assert.equal(m.mapVisit({ readmitted: '>30' }).returned30, false);
  assert.equal(m.mapVisit({ readmitted: 'NO' }).returned30, false);
  assert.equal(m.mapVisit({}).returned30, null);
});

test('forecast stub with zeros is reported as not available (not as "0 patients")', () => {
  assert.equal(m.mapForecast({ predicted_readmissions: 0, predicted_rate: 0 }, 30).available, false);
  const f = m.mapForecast({ horizon_days: 60, predicted_readmissions: 12, predicted_rate: 0.09 }, 30);
  assert.deepEqual([f.available, f.horizonDays, f.expectedRatePct], [true, 60, 9]);
});

test('hospital report uses discharge groups from /analytics/readmissions', () => {
  const r = m.mapHospitalReport(
    { total_patients: 10, total_admissions: 20, readmission_rate: 0.25, average_length_of_stay: 4.2, risk_distribution: { low: 5, medium: 3, high: 2 } },
    [{ discharge_disposition: 'Home', total_admissions: 10, readmissions: 1, readmission_rate: 0.1 }],
  );
  assert.equal(r.returnRatePct, 25);
  assert.deepEqual(r.byDischarge[0], { label: 'Home', visits: 10, returned: 1, ratePct: 10 });
});

test('treatments join average stay by name', () => {
  const t = m.mapTreatments(
    [{ treatment_name: 'Insulin', patients_treated: 4, average_recovery_score: 80, readmission_rate: 0.05 }],
    [{ treatment_name: 'Insulin', average_length_of_stay: 3.5 }],
  );
  assert.deepEqual(t[0], { name: 'Insulin', patients: 4, recoveryScore: 80, returnRatePct: 5, avgStayDays: 3.5 });
});

test('care advice accepts string or object recommendations; missing plan → nulls', () => {
  const a = m.mapCareAdvice(1, { recommendations: ['A', { protocol_action: 'B' }, 5], follow_up_days: 7 }, null);
  assert.deepEqual(a.actions, ['A', 'B']);
  assert.equal(a.followUpDays, 7);
  assert.equal(a.readyToGoHome, null);
});

test('cohort never exposes the database id or race', () => {
  const c = m.mapCohort([{ id: 999, race: 'X', age_group: '[60-70)', gender: 'Female', primary_diagnosis: '250' }]);
  assert.deepEqual(c[0], { anonId: 'A-0001', ageGroup: '[60-70)', gender: 'Female', illness: '250' });
});

test('login maps token, role and name; missing token throws', () => {
  const l = m.mapLogin({ access_token: 'abc', role: 'researcher', user: { id: 2, full_name: 'R', email: 'r@x.in' } });
  assert.deepEqual(l, { token: 'abc', user: { id: 2, name: 'R', email: 'r@x.in', role: 'researcher' } });
  assert.throws(() => m.mapLogin({}));
});

// ---------------- nav: mirrors docs/04-rbac access matrix
test('role access matches the RBAC matrix', () => {
  assert.equal(canOpen('doctor', 'analytics'), false, 'doctor: no hospital analytics');
  assert.equal(canOpen('doctor', 'care'), true);
  assert.equal(canOpen('doctor', 'treatment'), false, 'backend /treatment needs treatment_report:read (403 for doctor, verified)');
  assert.equal(canOpen('researcher', 'patients'), false, 'researcher: anonymised only');
  assert.equal(canOpen('researcher', 'research'), true);
  assert.equal(canOpen('hospital_admin', 'models'), false);
  assert.equal(canOpen('hospital_admin', 'users'), false);
  assert.equal(pagesFor('system_admin').length, 11, 'system admin sees everything');
  assert.equal(pageForPath('/patients/12')?.id, 'patients');
});

// ---------------- voice commands in several scripts
const cmds = [
  { action: 'go:/patients', phrases: ['मरीज़', 'Patients'] },
  { action: 'go:/risk', phrases: ['ஆபத்து சோதனை', 'Risk check'] },
  { action: 'read', phrases: ['পড়ে শোনান', 'Read aloud'] },
];
test('voice: native-language and English phrases, inside sentences, with punctuation', () => {
  assert.equal(matchCommand('मरीज़', cmds), 'go:/patients');
  assert.equal(matchCommand('please open patients.', cmds), 'go:/patients');
  assert.equal(matchCommand('ஆபத்து சோதனை', cmds), 'go:/risk');
  assert.equal(matchCommand('পড়ে শোনান!', cmds), 'read');
  assert.equal(matchCommand('what is the weather', cmds), null);
  assert.equal(normalize('  Risk   CHECK! '), 'risk check');
});

// ---------------- patient filter
test('patient search: name/MRN/illness, case-insensitive, with risk filter', () => {
  const rows = [
    { id: 1, mrn: 'MRN-1', name: 'Asha', ageGroup: null, gender: null, illness: 'Diabetes', risk: 'high', riskPct: 80 },
    { id: 2, mrn: 'MRN-2', name: 'Ravi', ageGroup: null, gender: null, illness: null, risk: 'low', riskPct: 5 },
  ];
  assert.equal(filterPatients(rows, 'diab', 'all').length, 1);
  assert.equal(filterPatients(rows, 'mrn-2', 'all')[0].name, 'Ravi');
  assert.equal(filterPatients(rows, '', 'high').length, 1);
  assert.equal(filterPatients(rows, 'Ravi', 'high').length, 0);
});

// ---------------- csv
test('CSV quotes commas/quotes and blocks formula injection', () => {
  assert.equal(toCsv(['a'], [['x,"y"'], ['=SUM(A1)'], [null]]), '"a"\r\n"x,""y"""\r\n"\'=SUM(A1)"\r\n""');
});
