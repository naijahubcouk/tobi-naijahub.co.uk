const https = require('https');
const fs = require('fs');
const path = require('path');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || 'e9267d1e';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || 'bcca8a8ff7d2a97044c4793a004d43f5';

let sponsorSet = null;

function getSponsorSet() {
  if (sponsorSet) return sponsorSet;
  try {
    const filePath = path.join(__dirname, 'sponsors.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    sponsorSet = new Set(data.sponsors);
    console.log(`Loaded ${sponsorSet.size} sponsors (updated: ${data.updated})`);
  } catch(e) {
    console.error('Could not load sponsors.json:', e.message);
    sponsorSet = new Set();
  }
  return sponsorSet;
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

// Normalise for matching — keep more characters than before
function normalise(name) {
  return (name || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Stripped version — removes common suffixes for fuzzy matching
function strip(name) {
  return normalise(name)
    .replace(/\b(ltd|limited|plc|llp|inc|group|uk|the|and|nhs|trust|foundation|council|university|college)\b/g, '')
    .replace(/\s+/g, '')
    .trim();
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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const sponsors = getSponsorSet();
    console.log(`Sponsor set size: ${sponsors.size}`);

    if (sponsors.size === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ jobs: [], message: 'Sponsor register is loading — please try again in a moment.' })
      };
    }

    // Build stripped version of sponsor set for fuzzy matching
    const strippedSponsors = new Set(Array.from(sponsors).map(s => strip(s)));

    const adzunaRes = await httpsGet(
      `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&content-type=application/json&sort_by=date&max_days_old=7`
    );

    const adzunaData = JSON.parse(adzunaRes.body);
    const results = adzunaData.results || [];
    console.log(`Adzuna returned ${results.length} jobs`);

    // Log first few company names to debug matching
    results.slice(0, 5).forEach(j => {
      const company = j.company?.display_name || '';
      console.log(`Company: "${company}" | norm: "${normalise(company)}" | strip: "${strip(company)}" | match: ${sponsors.has(normalise(company)) || strippedSponsors.has(strip(company))}`);
    });

    const sponsored = results.filter(job => {
      const company = job.company?.display_name || '';
      if (!company) return false;

      // Try both exact normalised match and stripped fuzzy match
      const matched = sponsors.has(normalise(company)) || strippedSponsors.has(strip(company));
      if (!matched) return false;

      // Filter out jobs that explicitly say they can't sponsor
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
