import { readFileSync } from 'fs';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';

const SUPABASE_URL = 'https://kzcrtlbspkhlnjillhyz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk';

async function main(): Promise<void> {
  const raw = readFileSync(0, 'utf-8');
  let input: { api_key: string; message: string };
  try {
    input = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ error: 'invalid JSON input' }));
    process.exit(1);
  }

  const { api_key, message } = input;

  if (!api_key || !message) {
    console.log(JSON.stringify({ error: 'api_key and message required' }));
    process.exit(1);
  }

  const body = JSON.stringify({ p_key: api_key, p_message: message });
  const url = `${SUPABASE_URL}/rest/v1/rpc/update_status_message`;

  try {
    const result = await httpPost(url, body, {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    });
    console.log(JSON.stringify({ ok: true, response: result }));
  } catch (err) {
    console.log(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
    );
    process.exit(1);
  }
}

function httpPost(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = mod(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body).toString() },
        timeout: 10_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(Buffer.concat(chunks).toString());
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(body);
    req.end();
  });
}

main().catch(() => process.exit(1));
