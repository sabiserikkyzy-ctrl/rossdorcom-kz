const { createSign, randomUUID } = require('node:crypto');

const SHEET_HEADERS = ['ID', 'Дата и время', 'Имя', 'Телефон', 'Задача', 'Страница', 'Статус', 'Комментарий'];
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map();

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function validateLead(body) {
  const lead = {
    name: cleanString(body?.name, 100),
    phone: cleanString(body?.phone, 32),
    message: cleanString(body?.message, 2000),
    page: cleanString(body?.page, 500),
    website: cleanString(body?.website, 200)
  };
  const phoneDigits = lead.phone.replace(/\D/g, '');
  if (lead.website) return { error: 'Spam submission rejected.' };
  if (lead.name.length < 2) return { error: 'Name is required.' };
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return { error: 'Valid phone is required.' };
  return { lead };
}

function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip, now = Date.now()) {
  for (const [key, record] of rateLimitStore) {
    if (now - record.startedAt > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(key);
  }
  const record = rateLimitStore.get(ip);
  if (!record) {
    rateLimitStore.set(ip, { count: 1, startedAt: now });
    return false;
  }
  if (now - record.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, startedAt: now });
    return false;
  }
  record.count += 1;
  return record.count > RATE_LIMIT_MAX;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) throw Object.assign(new Error('Google Sheets credentials are not configured.'), { code: 'CONFIG' });
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: email,
    scope: GOOGLE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const privateKey = rawKey.replace(/\\n/g, '\n');
  const assertion = `${unsignedToken}.${signer.sign(privateKey, 'base64url')}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(`Google authentication failed (${response.status}).`);
  return payload.access_token;
}

async function googleRequest(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google Sheets request failed (${response.status}): ${payload.error?.message || 'Unknown error'}`);
  return payload;
}

function sheetValue(value) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

async function saveLeadToGoogleSheets(leadRecord) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) throw Object.assign(new Error('Google Sheets spreadsheet ID is not configured.'), { code: 'CONFIG' });
  const accessToken = await getGoogleAccessToken();
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values`;
  const headerData = await googleRequest(`${baseUrl}/A1:H1`, accessToken);
  const currentHeaders = headerData.values?.[0] || [];
  if (currentHeaders.join('|') !== SHEET_HEADERS.join('|')) {
    await googleRequest(`${baseUrl}/A1:H1?valueInputOption=RAW`, accessToken, {
      method: 'PUT',
      body: JSON.stringify({ values: [SHEET_HEADERS] })
    });
  }
  const row = [
    leadRecord.id,
    leadRecord.timestamp,
    sheetValue(leadRecord.name),
    sheetValue(leadRecord.phone),
    sheetValue(leadRecord.message),
    sheetValue(leadRecord.page),
    'Новая',
    ''
  ];
  const result = await googleRequest(`${baseUrl}/A:H:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ values: [row] })
  });
  return { row, updatedRange: result.updates?.updatedRange || '' };
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

async function sendLeadEmail(leadRecord) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('Lead stored, but email notification is not configured.');
    return { sent: false, reason: 'not_configured' };
  }
  const rows = [
    ['ID', leadRecord.id],
    ['Дата и время', leadRecord.timestamp],
    ['Имя', leadRecord.name],
    ['Телефон', leadRecord.phone],
    ['Задача', leadRecord.message || '—'],
    ['Страница', leadRecord.page || '—']
  ];
  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const html = `<h2>Новая заявка</h2>${rows.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: ['info@rossdorcom.kz'],
      subject: 'Новая заявка с сайта ROSSDORCOM KZ',
      text,
      html
    })
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error(`Lead ${leadRecord.id} stored, but Resend failed (${response.status}): ${details}`);
    return { sent: false, reason: 'provider_error' };
  }
  return { sent: true };
}

function almatyTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function createLeadRecord(lead) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
    .replaceAll('-', '');
  return {
    ...lead,
    id: `RDC-${day}-${randomUUID().slice(0, 8).toUpperCase()}`,
    timestamp: almatyTimestamp()
  };
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function contactHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }
  if (Number(req.headers?.['content-length'] || 0) > 16000) return sendJson(res, 413, { ok: false, error: 'Request too large.' });
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return sendJson(res, 400, { ok: false, error: 'Invalid JSON.' }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return sendJson(res, 400, { ok: false, error: 'Invalid request.' });
  const validation = validateLead(body);
  if (validation.error) return sendJson(res, 400, { ok: false, error: validation.error });
  if (isRateLimited(getClientIp(req))) return sendJson(res, 429, { ok: false, error: 'Too many requests.' });
  const leadRecord = createLeadRecord(validation.lead);
  try {
    const sheet = await saveLeadToGoogleSheets(leadRecord);
    const email = await sendLeadEmail(leadRecord);
    return sendJson(res, 201, {
      ok: true,
      stored: true,
      leadId: leadRecord.id,
      emailSent: email.sent,
      updatedRange: sheet.updatedRange
    });
  } catch (error) {
    console.error(`Contact submission failed for ${leadRecord.id}:`, error);
    return sendJson(res, error.code === 'CONFIG' ? 503 : 500, { ok: false, stored: false, error: 'Lead could not be stored.' });
  }
}

module.exports = contactHandler;
module.exports.__test = {
  SHEET_HEADERS,
  cleanString,
  validateLead,
  createLeadRecord,
  almatyTimestamp,
  rateLimitStore
};
