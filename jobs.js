const https = require('https');

const ADZUNA_APP_ID = 'e9267d1e';
const ADZUNA_APP_KEY = 'bcca8a8ff7d2a97044c4793a004d43f5';

const CATEGORY_MAP = {
  'nhs':                { what: 'NHS',                category: 'healthcare-nursing-jobs' },
  'care':               { what: 'care assistant',      category: 'social-work-jobs' },
  'it':                 { what: 'IT',                  category: 'it-jobs' },
  'project-management': { what: 'project manager',     category: 'it-jobs' },
  'graduate':           { what: 'graduate',            category: null },
  'apprenticeship':     { what: 'apprenticeship',      category: null },
  'finance':            { what: 'finance accountant',  category: 'accounting-finance-jobs' },
  'teaching':           { what: 'teacher',             category: 'teaching-jobs' },
  'driving':            { what: 'driver',              category: 'logistics-warehouse-jobs' },
  'legal':              { what: 'legal HR',            category: 'hr-jobs' },
};

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

    let url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=6&what=${encodeURIComponent(config.what)}&where=${encodeURIComponent(location)}&content-type=application/json&sort_by=date&max_days_old=30`;

    if (config.category) {
      url += `&category=${config.category}`;
    }

    const data = await httpsGet(url);
    const jobs = (data.results || []).map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Employer',
      location: job.location?.display_name || location,
      salary: job.salary_min
        ? `£${Math.round(job.salary_min / 1000)}k${job.salary_max ? '–£' + Math.round(job.salary_max / 1000) + 'k' : '+'}`
        : 'Salary not specified',
      description: (job.description || '').substring(0, 120) + '...',
      url: job.redirect_url,
      posted: job.created ? new Date(job.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs, total: data.count || 0 })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, jobs: [] })
    };
  }
};
