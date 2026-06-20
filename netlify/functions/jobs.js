const https = require('https');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || 'e9267d1e';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || 'bcca8a8ff7d2a97044c4793a004d43f5';

const CATEGORY_MAP = {
  'nhs':                { what: 'NHS',                        category: 'healthcare-nursing-jobs',  visa: false, fallback: 'NHS+jobs' },
  'care':               { what: 'care assistant',             category: 'social-work-jobs',         visa: false, fallback: 'care+assistant' },
  'it':                 { what: 'IT',                         category: 'it-jobs',                  visa: false, fallback: 'IT+jobs' },
  'project-management': { what: 'project manager',            category: 'it-jobs',                  visa: false, fallback: 'project+manager' },
  'graduate':           { what: 'graduate',                   category: null,                       visa: false, fallback: 'graduate+jobs' },
  'apprenticeship':     { what: 'apprenticeship',             category: null,                       visa: false, fallback: 'apprenticeship' },
  'finance':            { what: 'finance accountant',         category: 'accounting-finance-jobs',  visa: false, fallback: 'finance+accountant' },
  'teaching':           { what: 'teacher',                    category: 'teaching-jobs',            visa: false, fallback: 'teacher+jobs' },
  'driving':            { what: 'driver',                     category: 'logistics-warehouse-jobs', visa: false, fallback: 'driver+jobs' },
  'legal':              { what: 'legal HR',                   category: 'hr-jobs',                  visa: false, fallback: 'legal+HR+jobs' },
  'visa-sponsored':     { what: 'certificate of sponsorship', category: null,                       visa: true,  fallback: 'certificate+of+sponsorship' },
};

// Phrases that confirm sponsorship is NOT available — filter these out
const CANNOT_SPONSOR_KEYWORDS = [
  'cannot sponsor', 'unable to sponsor', 'no sponsorship', 'not able to sponsor',
  'do not offer sponsorship', 'does not offer sponsorship', 'sponsorship is not available',
  'must have right to work', 'must already have the right to work',
  'without sponsorship', 'not provide sponsorship', 'not offering sponsorship',
  'no visa sponsorship', 'you must have the right to work',
  'applicants must already', 'we are not able to offer'
];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Invalid JSON from Adzuna')); }
      });
    }).on('error', reject);
  });
}

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 4000
      };
      const req = https.request(options, (res) => {
        resolve(res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch(e) {
      resolve(false);
    }
  });
}

function cannotSponsor(job) {
  const text = ((job.description || '') + ' ' + (job.title || '')).toLowerCase();
  return CANNOT_SPONSOR_KEYWORDS.some(kw => text.includes(kw));
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const category = (params.category || 'care').toLowerCase();
    const location = params.location || 'london';
    const config = CATEGORY_MAP[category] || CATEGORY_MAP['care'];

    const resultsToFetch = config.visa ? 30 : 10;

    let url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=${resultsToFetch}&what=${encodeURIComponent(config.what)}&where=${encodeURIComponent(location)}&content-type=application/json&sort_by=date&max_days_old=30`;

    if (config.category) {
      url += `&category=${config.category}`;
    }

    const data = await httpsGet(url);
    let results = data.results || [];

    // For visa sponsored — remove jobs that explicitly say they cannot sponsor
    if (config.visa) {
      results = results.filter(job => !cannotSponsor(job));
    }

    // Map jobs
    const mapped = results.map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Employer',
      location: job.location?.display_name || location,
      salary: job.salary_min
        ? `£${Math.round(job.salary_min / 1000)}k${job.salary_max ? '–£' + Math.round(job.salary_max / 1000) + 'k' : '+'}`
        : 'Salary not specified',
      url: job.redirect_url,
      posted: job.created ? new Date(job.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
      visa: config.visa,
      fallback: config.fallback
    })).filter(job => job.url);

    // Check URLs in parallel — skip dead links
    const urlChecks = await Promise.all(mapped.slice(0, 15).map(job => checkUrl(job.url)));
    const jobs = mapped.slice(0, 15).filter((_, i) => urlChecks[i]).slice(0, 6);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs, total: data.count || 0, isVisa: config.visa, fallback: config.fallback })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, jobs: [], fallback: 'jobs' })
    };
  }
};
