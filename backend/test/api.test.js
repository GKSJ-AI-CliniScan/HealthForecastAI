require('dotenv').config();
const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const app = require('../server');
const connectDB = require('../config/db');

const request = (server, method, path, body, token) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const req = http.request({
    port: server.address().port,
    method,
    path,
    headers: {
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }, (res) => {
    let responseBody = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
      let data;
      try {
        data = JSON.parse(responseBody);
      } catch {
        data = responseBody;
      }
      resolve({ status: res.statusCode, data });
    });
  });
  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

const login = async (server, email, password) => {
  const response = await request(server, 'POST', '/api/v1/auth/login', { email, password });
  assert.strictEqual(response.status, 200, `Expected login for ${email} to succeed`);
  assert.ok(response.data.token, `Expected token for ${email}`);
  return response.data.token;
};

(async () => {
  let server;
  try {
    await connectDB();
    server = app.listen(0);

    const health = await request(server, 'GET', '/api/v1/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'healthy');

    const invalidLogin = await request(server, 'POST', '/api/v1/auth/login', {
      email: 'doctor@healthforecast.ai',
      password: 'incorrect-password',
    });
    assert.strictEqual(invalidLogin.status, 401);

    const doctorToken = await login(server, 'doctor@healthforecast.ai', 'password123');
    const doctorMe = await request(server, 'GET', '/api/v1/auth/me', null, doctorToken);
    assert.strictEqual(doctorMe.status, 200);
    assert.strictEqual(doctorMe.data.user.role, 'doctor');

    const unauthenticatedMe = await request(server, 'GET', '/api/v1/auth/me');
    assert.strictEqual(unauthenticatedMe.status, 401);

    const mockTokenMe = await request(server, 'GET', '/api/v1/auth/me', null, 'eyJ.mockToken_for_system-admin_only');
    assert.strictEqual(mockTokenMe.status, 401);

    const patients = await request(server, 'GET', '/api/v1/patients', null, doctorToken);
    assert.strictEqual(patients.status, 200);
    assert.ok(Array.isArray(patients.data.data));

    const researcherToken = await login(server, 'researcher@healthforecast.ai', 'password123');
    const researcherPatients = await request(server, 'GET', '/api/v1/patients', null, researcherToken);
    assert.strictEqual(researcherPatients.status, 403);

    const hospitalAdminToken = await login(server, 'admin@healthforecast.ai', 'password123');
    const hospitalAdminNotes = await request(server, 'POST', '/api/v1/patients/HFC-001/notes', {
      note: 'Permission check',
    }, hospitalAdminToken);
    assert.strictEqual(hospitalAdminNotes.status, 403);
    const hospitalAdminTreatment = await request(server, 'POST', '/api/v1/patients/HFC-001/treatments', {
      treatment: 'Permission check',
    }, hospitalAdminToken);
    assert.strictEqual(hospitalAdminTreatment.status, 403);

    const researcherAnalytics = await request(server, 'GET', '/api/v1/analytics/research', null, researcherToken);
    assert.strictEqual(researcherAnalytics.status, 200);

    const doctorAdminDashboard = await request(server, 'GET', '/api/v1/admin/dashboard', null, doctorToken);
    assert.strictEqual(doctorAdminDashboard.status, 403);

    console.log('Backend API tests passed.');
  } catch (error) {
    console.error('Backend API tests failed:', error);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
})();
