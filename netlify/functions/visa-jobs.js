const https = require('https');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || 'e9267d1e';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || 'bcca8a8ff7d2a97044c4793a004d43f5';

let sponsorCache = null;
let sponsorCacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    };
    https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

function normalise(name) {
  return (name || '').toLowerCase()
    .replace(/\b(ltd|limited|plc|llp|inc|group|uk|the|and)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function getSponsorSet() {
  const now = Date.now();
  if (sponsorCache && (now - sponsorCacheTime) < CACHE_TTL) return sponsorCache;

  // Get latest CSV URL from GOV.UK page
  const page = await httpsGet('https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers');
  const match = page.body.match(/https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"]+\.csv/);
  if (!match) throw new Error('CSV URL not found');

  const csv = await httpsGet(match[0]);
  const lines = csv.body.split('\n');

  // Build a fast lookup Set of normalised sponsor names
  const sponsors = new Set();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // Simple CSV split — name is always first column
    const firstComma = line.indexOf(',');
    if (firstComma === -1) continue;
    const rawName = line.substring(0, firstComma).replace(/^"|"$/g, '').trim();
    if (rawName) sponsors.add(normalise(rawName));
  }

  sponsorCache = sponsors;
  sponsorCacheTime = now;
  console.log(`Sponsor register loaded: ${sponsors.size} entries`);
  return sponsors;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Fetch sponsor register and Adzuna jobs in parallel
    const [sponsorSet, adzunaRes] = await Promise.all([
      getSponsorSet(),
      httpsGet(`https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what=jobs&content-type=application/json&sort_by=date&max_days_old=7`)
    ]);

    const adzunaData = JSON.parse(adzunaRes.body);
    const results = adzunaData.results || [];

    console.log(`Adzuna returned ${results.length} jobs, sponsor set has ${sponsorSet.size} entries`);

    // Filter: company must be in the sponsor register (O(1) lookup per job)
    const sponsored = results.filter(job => {
      const company = job.company?.display_name || '';
      const norm = normalise(company);
      return norm.length > 2 && sponsorSet.has(norm);
    });

    console.log(`Matched ${sponsored.length} sponsored jobs`);

    const jobs = sponsored.slice(0, 6).map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Employer',
      location: job.location?.display_name || 'UK',
      salary: job.salary_min
        ? `£${Math.round(job.salary_min / 1000)}k${job.salary_max ? '–£' + Math.round(job.salary_max / 1000) + 'k' : '+'}`
        : 'Salary not specified',
      url: job.redirect_url,
      posted: job.created ? new Date(job.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
      visa: true,
      verified: true
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs, total: jobs.length, isVisa: true })
    };

  } catch (err) {
    console.error('visa-jobs error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        jobs: [],
        message: 'Could not load visa sponsored jobs right now — please try again shortly.'
      })
    };
  }
};
