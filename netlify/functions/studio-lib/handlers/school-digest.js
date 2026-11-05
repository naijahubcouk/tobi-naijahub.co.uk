'use strict';
// Scheduled (hourly at :05) — 🎒 School Tracker morning (7am) and Sunday 6pm emails, UK time.
const core = require('../core');
exports.handler = async (event) => {
  try { const r = await require('../school').runDigests(); return { statusCode: 200, body: JSON.stringify(r) }; }
  catch (e) { console.error('[school-digest]', e && e.message); return { statusCode: 200, body: '{"ok":false}' }; }
};
