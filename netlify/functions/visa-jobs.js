const https = require('https');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || 'e9267d1e';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || 'bcca8a8ff7d2a97044c4793a004d43f5';

// Cache sponsor names in memory for duration of function instance
let sponsorCache = null;
let sponsorCacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function httpsGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      headers: { 'User-Agent': 'Mozilla/5.0', ...options.headers },
      timeout: 10000,
      ...options
    };
    https.get(url, reqOptions, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, options).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

async function getLatestCsvUrl() {
  const res = await httpsGet('https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers');
  const match = res.body.match(/https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"]+Worker_and_Temporary_Worker\.csv/);
  if (!match) throw new Error('Could not find CSV URL');
  return match[0];
}

async function getSponsorSet() {
  const now = Date.now();
  if (sponsorCache && (now - sponsorCacheTime) < CACHE_TTL) {
    return sponsorCache;
  }

  const csvUrl = await getLatestCsvUrl();
  const res = await httpsGet(csvUrl);

  // Parse CSV — column 0 is Organisation Name, column 3 is Route (Skilled Worker), column 4 is Rating (A-rated)
  const lines = res.body.split('\n').slice(1); // skip header
  const sponsors = new Set();

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const name = cols[0] ? cols[0].toLowerCase() : '';
    const route = cols[3] ? cols[3].toLowerCase() : '';
    const rating = cols[4] ? cols[4].toLowerCase() : '';

    // Only include A-rated Skilled Worker sponsors
    if (name && route.includes('skilled worker') && rating === 'a-rated') {
      sponsors.add(name);
    }
  }

  sponsorCache = sponsors;
  sponsorCacheTime = now;
  return sponsors;
}

function normaliseCompany(name) {
  return name.toLowerCase()
    .replace(/\b(ltd|limited|plc|llp|inc|group|uk|the|and|&)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLicensedSponsor(companyName, sponsorSet) {
  if (!companyName) return false;
  const normalised = normaliseCompany(companyName);
  // Check exact match first
  if (sponsorSet.has(normalised)) return true;
  // Check if any sponsor name contains the company name or vice versa
  for (const sponsor of sponsorSet) {
    const normSponsor = normaliseCompany(sponsor);
    if (normSponsor.length > 3 && normalised.length > 3) {
      if (normSponsor.includes(normalised) || normalised.includes(normSponsor)) return true;
    }
  }
  return false;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const location = params.location || '';

    // Fetch sponsor list and Adzuna results in parallel
    const [sponsorSet, adzunaRes] = await Promise.all([
      getSponsorSet(),
      httpsGet(`https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what=skilled+worker&content-type=application/json&sort_by=date&max_days_old=14`)
    ]);

    const adzunaData = JSON.parse(adzunaRes.body);
    const results = adzunaData.results || [];

    // Only keep jobs where company is a licensed A-rated Skilled Worker sponsor
    const sponsored = results.filter(job => {
      const company = job.company?.display_name || '';
      return isLicensedSponsor(company, sponsorSet);
    }).slice(0, 6);

    const jobs = sponsored.map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Employer',
      location: job.location?.display_name || location,
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
      body: JSON.stringify({
        jobs,
        total: jobs.length,
        isVisa: true,
        sponsorsChecked: sponsorSet.size,
        fallback: 'skilled+worker+visa+sponsorship'
      })
    };

  } catch (err) {
    console.error('visa-jobs error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        jobs: [],
        fallback: 'skilled+worker+visa+sponsorship',
        message: 'Could not load visa sponsored jobs right now — please try again shortly.'
      })
    };
  }
};
