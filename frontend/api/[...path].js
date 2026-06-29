export const config = {
  api: {
    bodyParser: false,
  },
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const base = (process.env.RENDER_API_URL || '')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');

  if (!base) {
    res.status(500).json({
      success: false,
      message: 'RENDER_API_URL is not set on Vercel (e.g. https://your-app.onrender.com)',
    });
    return;
  }

  const pathParam = req.query.path;
  const segments = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';
  const queryIndex = req.url?.indexOf('?') ?? -1;
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
  const target = `${base}/api/${segments}${query}`;

  try {
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (['host', 'connection', 'content-length', 'transfer-encoding'].includes(lower)) {
        continue;
      }
      headers[key] = value;
    }

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);

    const response = await fetch(target, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(response.status);

    const skip = new Set(['transfer-encoding', 'connection', 'content-encoding', 'content-length']);
    response.headers.forEach((value, key) => {
      if (!skip.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.setHeader('content-length', buffer.length);
    res.send(buffer);
  } catch (error) {
    res.status(502).json({
      success: false,
      message: `Proxy error: ${error.message}`,
    });
  }
}
