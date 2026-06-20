const https = require('https');

function httpsGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        ...(options.headers || {})
      }
    };
    https.get(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function parseJobs(html) {
  const jobs = [];
  // Match job listing blocks — jobvisa.co.uk uses article or div with job data
  const jobBlocks = html.match(/<article[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/article>/gi) ||
                    html.match(/<div[^>]*class="[^"]*job[^"]*listing[^"]*"[^>]*>([\s\S]*?)<\/div>/gi) || [];

  for (const block of jobBlocks.slice(0, 6)) {
    try {
      const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const linkMatch = block.match(/href="(https?:\/\/[^"]*jobvisa[^"]*|\/[^"]+)"/i);
      const companyMatch = block.match(/class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      const locationMatch = block.match(/class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      const salaryMatch = block.match(/class="[^"]*salary[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);

      const stripTags = str => str ? str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';

      if (titleMatch) {
        const url = linkMatch
          ? (linkMatch[1].startsWith('http') ? linkMatch[1] : 'https://www.jobvisa.co.uk' + linkMatch[1])
          : 'https://www.jobvisa.co.uk';

        jobs.push({
          title: stripTags(titleMatch[1]),
          company: stripTags(companyMatch?.[1]) || 'Employer',
          location: stripTags(locationMatch?.[1]) || 'UK',
          salary: stripTags(salaryMatch?.[1]) || 'Competitive',
          url,
          sponsored: true
        });
      }
    } catch(e) {}
  }
  return jobs;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=7200'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const search = params.search || '';
    const url = search
      ? `https://www.jobvisa.co.uk/?s=${encodeURIComponent(search)}`
      : 'https://www.jobvisa.co.uk/';

    const response = await httpsGet(url);

    if (response.status !== 200) {
      throw new Error(`jobvisa.co.uk returned ${response.status}`);
    }

    const jobs = parseJobs(response.body);

    // Fallback if scraping returned nothing
    if (jobs.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          jobs: [],
          fallback: true,
          fallbackUrl: url,
          message: 'Live listings unavailable right now — visit jobvisa.co.uk directly for current visa sponsored roles.'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs, fallback: false })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        jobs: [],
        fallback: true,
        fallbackUrl: 'https://www.jobvisa.co.uk',
        message: 'Live listings unavailable right now — visit jobvisa.co.uk directly for current visa sponsored roles.'
      })
    };
  }
};
