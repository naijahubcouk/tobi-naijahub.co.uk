// Auntie Tobi Business Studio — /.netlify/functions/studio-billing
// Logic lives in studio-lib/handlers/billing.js; this file uses Netlify's current function format.
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/billing.js';

export default v2.toV2(mod.handler);
