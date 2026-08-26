const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/contact.js');

function responseMock() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = JSON.parse(value); }
  };
}

function request(body, overrides = {}) {
  return {
    method: 'POST',
    body,
    headers: { 'x-forwarded-for': '203.0.113.10', ...overrides.headers },
    ...overrides
  };
}

function mockResponse(status, payload, text = '') {
  return { ok: status >= 200 && status < 300, status, json: async () => payload, text: async () => text };
}

function validLead() {
  return { name: 'Тестовый клиент', phone: '+7 (700) 123-45-67', message: 'Тестовая задача', page: 'https://example.com/', website: '' };
}

test.beforeEach(() => {
  handler.__test.rateLimitStore.clear();
  delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_PRIVATE_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_FROM_EMAIL;
});

test('rejects honeypot submissions before any external request', async () => {
  let called = false;
  global.fetch = async () => { called = true; };
  const res = responseMock();
  await handler(request({ ...validLead(), website: 'spam.example' }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.ok, false);
  assert.equal(called, false);
});

test('rejects malformed name and phone', async () => {
  const res = responseMock();
  await handler(request({ name: 'A', phone: '123', message: '', page: '/', website: '' }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.stored, undefined);
});

test('never reports success when Google configuration is missing', async () => {
  const res = responseMock();
  await handler(request(validLead()), res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, { ok: false, stored: false, error: 'Lead could not be stored.' });
});

test('keeps a stored lead successful when Resend fails', async () => {
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'sheet-id';
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'service@example.iam.gserviceaccount.com';
  process.env.GOOGLE_PRIVATE_KEY = 'test-key';
  process.env.RESEND_API_KEY = 'resend-key';
  process.env.CONTACT_FROM_EMAIL = 'Site <site@example.com>';
  const originalCreateSign = require('node:crypto').createSign;
  const contactPath = require.resolve('../api/contact.js');
  delete require.cache[contactPath];
  const crypto = require('node:crypto');
  crypto.createSign = () => ({ update() {}, end() {}, sign() { return 'signature'; } });
  const isolatedHandler = require('../api/contact.js');
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('oauth2.googleapis.com')) return mockResponse(200, { access_token: 'token' });
    if (String(url).endsWith('/A1:H1')) return mockResponse(200, { values: [isolatedHandler.__test.SHEET_HEADERS] });
    if (String(url).includes('/A:H:append')) return mockResponse(200, { updates: { updatedRange: 'Sheet1!A2:H2' } });
    if (String(url).includes('api.resend.com')) return mockResponse(500, {}, 'provider unavailable');
    throw new Error(`Unexpected URL ${url}`);
  };
  const res = responseMock();
  await isolatedHandler(request(validLead()), res);
  crypto.createSign = originalCreateSign;
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.stored, true);
  assert.equal(res.body.emailSent, false);
  const appendCall = calls.find((call) => call.url.includes('/A:H:append'));
  const row = JSON.parse(appendCall.options.body).values[0];
  assert.equal(row.length, 8);
  assert.equal(row[6], 'Новая');
  assert.equal(row[7], '');
});
