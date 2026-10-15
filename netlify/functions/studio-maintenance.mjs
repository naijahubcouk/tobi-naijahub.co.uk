// Auntie Tobi Business Studio — daily housekeeping (scheduled; not callable from the web).
// Logic lives in studio-lib/handlers/maintenance.js; this file uses Netlify's current function format.
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/maintenance.js';

export default v2.toV2(mod.handler);

export const config = { schedule: '17 3 * * *' };
