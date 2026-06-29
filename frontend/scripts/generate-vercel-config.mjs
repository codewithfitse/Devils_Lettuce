import { writeFileSync } from 'fs';

const renderBase = (process.env.RENDER_API_URL || process.env.VITE_API_URL || '')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const rewrites = [];

if (renderBase) {
  rewrites.push({
    source: '/api/:path*',
    destination: `${renderBase}/api/:path*`,
  });
  console.log(`[vercel] API proxy → ${renderBase}/api/*`);
} else {
  console.warn(
    '[vercel] RENDER_API_URL not set — add it in Vercel Environment Variables'
  );
}

rewrites.push({
  source: '/(.*)',
  destination: '/index.html',
});

writeFileSync('vercel.json', `${JSON.stringify({ rewrites }, null, 2)}\n`);
