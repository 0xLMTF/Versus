/**
 * Smoke test API auth — run with API up: node scripts/smoke-api.mjs
 */
const BASE = process.env.API_URL || 'http://localhost:3001';
const tag = `@smoke_${Date.now().toString(36)}`;

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  const health = await req('/api/health');
  console.log('health', health.status, health.data.status);

  const reg = await req('/api/auth/register', {
    method: 'POST',
    body: { name: 'Smoke', tag, password: 'test1234' },
  });
  console.log('register', reg.status, reg.data.user?.tag);
  if (reg.status !== 201 || !reg.data.token) throw new Error('register failed');

  const me = await req('/api/users/me', { token: reg.data.token });
  console.log('me', me.status, me.data.tag);

  const del = await req('/api/users/me', {
    method: 'DELETE',
    token: reg.data.token,
    body: { password: 'test1234' },
  });
  console.log('delete', del.status, del.data.message);

  const again = await req('/api/auth/login', {
    method: 'POST',
    body: { tag, password: 'test1234' },
  });
  console.log('login after delete', again.status, again.data.error || 'unexpected ok');

  const demo = await req('/api/auth/login', {
    method: 'POST',
    body: { tag: '@alex_god', password: 'versus123' },
  });
  console.log('demo login', demo.status, demo.data.user?.tag);

  if (again.status !== 401 || demo.status !== 200) {
    process.exitCode = 1;
    return;
  }
  console.log('✅ smoke ok');
}

main().catch((err) => {
  console.error('✖ smoke failed', err.message);
  process.exitCode = 1;
});
