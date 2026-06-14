export default async function(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Extract and trim system prompt if too long
    const payload = {
      model: body.model || 'claude-sonnet-4-6',
      max_tokens: body.max_tokens || 1000,
      messages: body.messages
    };

    if (body.system) {
      payload.system = body.system.substring(0, 8000);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    console.log('Anthropic status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data).substring(0, 200));

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    console.log('Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export const config = { path: '/api/chat' };
