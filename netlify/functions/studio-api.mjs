// Auntie Tobi Business Studio — /.netlify/functions/studio-api
// Logic lives in studio-lib/handlers/api.js; this file uses Netlify's current function format.
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/api.js';

export default v2.toV2(mod.handler);
