'use strict';
// Reads JSON out of an AI reply even when it is wrapped in words, has an unescaped quote or was cut short.
function parseLoose(text) {
  let jsonrepair = x => x; try { jsonrepair = require('jsonrepair').jsonrepair; } catch (_) { /* repair not installed — plain parsing only */ }
  const t = String(text || '').replace(/```(?:json)?/gi, '');
  const a = t.indexOf('{'); if (a < 0) return null;
  try { return JSON.parse(t.slice(a, t.lastIndexOf('}') + 1)); } catch (_) { /* repair below */ }
  const ends = []; for (let i = t.length - 1; i > a && ends.length < 25; i--) if (t[i] === '}') ends.push(i);
  for (const e of ends) { try { const o = JSON.parse(jsonrepair(t.slice(a, e + 1))); if (o && typeof o === 'object') return o; } catch (_) { /* next */ } }
  try { const o = JSON.parse(jsonrepair(t.slice(a))); if (o && typeof o === 'object') return o; } catch (_) { /* give up */ }
  return null;
}
module.exports = { parseLoose };
