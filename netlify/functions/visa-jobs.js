// v3
const https = require('https');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || 'e9267d1e';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || 'bcca8a8ff7d2a97044c4793a004d43f5';
const SITE_URL = process.env.URL || 'https://auntietobi.co.uk';

let sponsorCache = null;
let sponsorCacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

function normalise(name) {
  return (name || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function strip(name) {
  return normalise(name)
    .replace(/\b(ltd|limited|plc|llp|inc|group|uk|the|and|nhs|trust|foundation|council|university|college)\b/g, '')
    .replace(/\s+/g, '')
    .trim();
}

async function getSponsorSet() {
  const now = Date.now();
  if (sponsorCache && (now - sponsorCacheTime) < CACHE_TTL) return sponsorCache;

  const res = await httpsGet(`${SITE_URL}/sponsors.json`);
  const data = JSON.parse(res.body);
  sponsorCache = new Set(data.sponsors);
  sponsorCacheTime = now;
  console.log(`Loaded ${sponsorCache.size} sponsors from ${SITE_URL}/sponsors.json`);
  return sponsorCache;
}

const CANNOT_SPONSOR = [
  'unable to offer certificate', 'cannot offer certificate',
  'unable to offer sponsorship', 'cannot offer sponsorship',
  'cannot sponsor', 'unable to sponsor', 'not able to sponsor',
  'no sponsorship', 'without sponsorship', 'do not offer sponsorship',
  'does not offer sponsorship', 'not provide sponsorship',
  'must have right to work', 'must already have the right to work',
  'you must have the right to work', 'applicants must have the right'
];

// Job titles that are gig/self-employed and never sponsor visas
const EXCLUDED_TITLES = [
  'deliver with uber', 'uber eats', 'delivery opportunities',
  'part-time opportunities', 'sign up and start', 'earn with',
  'become a driver', 'freelance', 'self-employed', 'gig',
  'zero hours', 'delivery driver - sign'
];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const sponsors = await getSponsorSet();
    const strippedSponsors = new Set(Array.from(sponsors).map(s => strip(s)));
    console.log(`Sponsor set: ${sponsors.size}, stripped: ${strippedSponsors.size}`);

    const adzunaRes = await httpsGet(
      `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&content-type=application/json&sort_by=date&max_days_old=7`
    );

    const results = JSON.parse(adzunaRes.body).results || [];
    console.log(`Adzuna returned ${results.length} jobs`);

    results.slice(0, 3).forEach(j => {
      const c = j.company?.display_name || '';
      console.log(`"${c}" norm:"${normalise(c)}" strip:"${strip(c)}" match:${sponsors.has(normalise(c)) || strippedSponsors.has(strip(c))}`);
    });

    const sponsored = results.filter(job => {
      const company = job.company?.display_name || '';
      if (!company) return false;
      const matched = sponsors.has(normalise(company)) || strippedSponsors.has(strip(company));
      if (!matched) return false;
      // Exclude gig economy / self-employed titles
      const title = (job.title || '').toLowerCase();
      if (EXCLUDED_TITLES.some(t => title.includes(t))) return false;
      // Exclude jobs that explicitly say they can't sponsor
      const desc = (job.description || '').toLowerCase();
      return !CANNOT_SPONSOR.some(phrase => desc.includes(phrase));
    }).slice(0, 6);

    console.log(`${sponsored.length} jobs matched`);

    const jobs = sponsored.map(job => ({
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
      body: JSON.stringify({ jobs: [], message: 'Could not load visa sponsored jobs right now — please try again shortly.' })
    };
  }
};
