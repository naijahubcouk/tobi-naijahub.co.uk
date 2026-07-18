// Netlify function — sends or schedules push notifications via OneSignal
// Keeps ONESIGNAL_API_KEY and APP_ID secure server-side
const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { title, body, url, scheduledTime } = JSON.parse(event.body);
    const apiKey = process.env.ONESIGNAL_API_KEY;
    const appId = process.env.ONESIGNAL_APP_ID || '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'ONESIGNAL_API_KEY not configured in Netlify environment variables' })
      };
    }

    // Build OneSignal notification payload
    const notification = {
      app_id: appId,
      included_segments: ['All'],
      headings: { en: title },
      contents: { en: body },
      web_url: url || 'https://auntietobi.co.uk',
      app_url: url || 'https://auntietobi.co.uk',
    };

    // Add schedule if provided (ISO 8601 format)
    if (scheduledTime) {
      notification.send_after = scheduledTime;
    }

    const requestBody = JSON.stringify(notification);

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'onesignal.com',
        path: '/api/v1/notifications',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + apiKey,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch(e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(requestBody);
      req.end();
    });

    if (result.status === 200 && result.data.id) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          id: result.data.id,
          scheduled: !!scheduledTime,
          recipients: result.data.recipients || 0
        })
      };
    } else {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: result.data.errors || 'OneSignal error', details: result.data })
      };
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
