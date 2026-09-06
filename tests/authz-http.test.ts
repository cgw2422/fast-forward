/**
 * End-to-end authorization tests against a running server.
 *
 * The unit tests in authz.test.ts prove the rules; this proves the wiring —
 * that every route actually enforces them over HTTP, including ones a viewer
 * might reach by guessing an id or URL.
 *
 *   BASE_URL=http://localhost:3000 npm run test:http
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  ok ? (passed += 1) : (failed += 1);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        got ${actual}, want ${expected}`}`);
}

type Jar = { cookie: string };

async function call(
  path: string,
  init: RequestInit & { jar?: Jar } = {}
): Promise<{ status: number; body: string; setCookie: string | null }> {
  const headers = new Headers(init.headers);
  if (init.jar?.cookie) headers.set('cookie', init.jar.cookie);
  const response = await fetch(`${BASE}${path}`, { ...init, headers, redirect: 'manual' });
  return {
    status: response.status,
    body: await response.text().catch(() => ''),
    setCookie: response.headers.get('set-cookie'),
  };
}

async function postJson(path: string, data: unknown, jar?: Jar) {
  return call(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    jar,
  });
}

async function signup(email: string, name: string, inviteCode?: string): Promise<Jar> {
  const result = await postJson('/api/auth/signup', {
    email,
    password: 'password123',
    name,
    ...(inviteCode ? { inviteCode } : {}),
  });
  const cookie = (result.setCookie ?? '').split(';')[0];
  return { cookie };
}

/** A tiny but structurally valid JPEG, enough to pass content sniffing. */
const JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300' +
    '08'.repeat(64) +
    'ffc0000b080001000101011100ffc40014000100000000000000000000000000000000ffda0008010100003f00d2cf20ffd9',
  'hex'
);

async function uploadPhoto(jar: Jar, visibility: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(JPEG)], { type: 'image/jpeg' }), 'p.jpg');
  form.append('visibility', visibility);
  form.append('angle', 'FRONT');
  const response = await call('/api/photos', { method: 'POST', body: form, jar });
  return JSON.parse(response.body).photoId as string;
}

async function main() {
  const stamp = Date.now();
  console.log(`\nAuthorization over HTTP — ${BASE}\n`);

  const owner = await signup(`o${stamp}@t.test`, 'Owner');
  const outsider = await signup(`x${stamp}@t.test`, 'Other Owner');

  const inviteAdult = JSON.parse(
    (await postJson('/api/family', { action: 'invite', name: 'Adult', role: 'ADULT_VIEWER' }, owner)).body
  ).code as string;
  const inviteFamily = JSON.parse(
    (await postJson('/api/family', { action: 'invite', name: 'Kid', role: 'FAMILY_VIEWER' }, owner)).body
  ).code as string;

  const adult = await signup(`a${stamp}@t.test`, 'Adult', inviteAdult);
  const kid = await signup(`k${stamp}@t.test`, 'Kid', inviteFamily);

  console.log('Invites');
  check('an invite code works exactly once', (await signup(`z${stamp}@t.test`, 'Z', inviteAdult)).cookie, '');

  console.log('\nViewers cannot write health data (403 at the owner gate)');
  const writes: [string, string, unknown][] = [
    ['start a fast', '/api/fast', { action: 'start' }],
    ['log water', '/api/water', { amount: 16, unit: 'OZ' }],
    ['log electrolytes', '/api/electrolytes', { name: 'x', servings: 1 }],
    ['log weight', '/api/weight', { weight: 200 }],
    ['log a walk', '/api/walk', { minutes: 30 }],
    ['log a ruck', '/api/ruck', { packWeight: 20, durationMinutes: 30 }],
    ['create a habit', '/api/habits', { name: 'x' }],
    ['complete a habit', '/api/habits/complete', { habitId: 'x', status: 'DONE' }],
    ['log a workout', '/api/workouts', { name: 'x', exercises: [] }],
    ['alter the Pop Pact', '/api/pop-pact', { action: 'slip' }],
    ['submit a check-in', '/api/checkin', { energy: 1 }],
    ['add a refeed entry', '/api/refeed', { meal: 'x' }],
    ['manage family', '/api/family', { action: 'invite', name: 'Z', role: 'ADULT_VIEWER' }],
  ];
  for (const [label, path, payload] of writes) {
    check(`FAMILY_VIEWER cannot ${label}`, (await postJson(path, payload, kid)).status, 403);
  }
  check('ADULT_VIEWER cannot log water', (await postJson('/api/water', { amount: 8, unit: 'OZ' }, adult)).status, 403);
  check('ADULT_VIEWER cannot log a ruck', (await postJson('/api/ruck', { packWeight: 5, durationMinutes: 5 }, adult)).status, 403);
  check(
    'ADULT_VIEWER cannot change settings',
    (await call('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'profile', name: 'Hacked' }),
      jar: adult,
    })).status,
    403
  );
  check('owner CAN log water', (await postJson('/api/water', { amount: 16, unit: 'OZ' }, owner)).status, 200);

  console.log('\nPhoto visibility');
  const ownerOnly = await uploadPhoto(owner, 'OWNER_ONLY');
  const adults = await uploadPhoto(owner, 'ADULTS');
  const family = await uploadPhoto(owner, 'FAMILY');

  const fetchPhoto = async (jar: Jar | undefined, id: string) =>
    (await call(`/api/photos/${id}/file`, jar ? { jar } : {})).status;

  check('owner reads OWNER_ONLY', await fetchPhoto(owner, ownerOnly), 200);
  check('owner reads ADULTS', await fetchPhoto(owner, adults), 200);
  check('ADULT_VIEWER reads ADULTS', await fetchPhoto(adult, adults), 200);
  check('ADULT_VIEWER reads FAMILY', await fetchPhoto(adult, family), 200);
  check('ADULT_VIEWER 404s on OWNER_ONLY', await fetchPhoto(adult, ownerOnly), 404);
  check('FAMILY_VIEWER reads FAMILY', await fetchPhoto(kid, family), 200);
  check('FAMILY_VIEWER 404s on ADULTS', await fetchPhoto(kid, adults), 404);
  check('FAMILY_VIEWER 404s on OWNER_ONLY', await fetchPhoto(kid, ownerOnly), 404);
  check('unrelated owner 404s on FAMILY', await fetchPhoto(outsider, family), 404);
  check('signed-out request is rejected', await fetchPhoto(undefined, family), 401);

  console.log('\nViewers cannot change photos');
  const patchPhoto = async (jar: Jar, id: string, body: Record<string, unknown>) =>
    (await call('/api/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
      jar,
    })).status;
  check('FAMILY_VIEWER cannot change visibility', await patchPhoto(kid, adults, { visibility: 'FAMILY' }), 403);
  check('ADULT_VIEWER cannot change visibility', await patchPhoto(adult, ownerOnly, { visibility: 'ADULTS' }), 403);
  check(
    'FAMILY_VIEWER cannot delete a photo',
    (await call(`/api/photos?id=${family}`, { method: 'DELETE', jar: kid })).status,
    403
  );

  console.log('\nMessaging stays inside the family');
  const ownerId = JSON.parse((await call('/api/family/whoami', { jar: owner })).body || '{}').id as
    | string
    | undefined;
  if (ownerId) {
    check('viewer may message their owner', (await postJson('/api/family/messages', { ownerId, body: 'hi' }, kid)).status, 200);
    check(
      'unrelated user cannot be messaged',
      (await postJson('/api/family/messages', { ownerId: 'nonexistent', body: 'spam' }, kid)).status,
      404
    );
  }

  console.log('\nViewers cannot escalate their own access');
  check(
    'viewer cannot grant themselves a module',
    (await postJson(
      '/api/family',
      { action: 'set_permissions', relationshipId: 'any', permissions: [{ module: 'DAILY_CHECKIN', enabled: true }] },
      kid
    )).status,
    403
  );
  check(
    'viewer cannot promote their own role',
    (await postJson('/api/family', { action: 'set_role', relationshipId: 'any', role: 'ADULT_VIEWER' }, kid)).status,
    403
  );
  check(
    'an owner cannot touch another owner’s relationships',
    (await postJson('/api/family', { action: 'set_role', relationshipId: 'any', role: 'ADULT_VIEWER' }, outsider)).status,
    404
  );

  console.log('\nViewers are kept out of owner screens');
  check('viewer hitting /today is redirected', (await call('/today', { jar: kid })).status, 307);
  check('viewer hitting /settings/family is redirected', (await call('/settings/family', { jar: kid })).status, 307);
  check('viewer can load their own dashboard', (await call('/family', { jar: kid })).status, 200);

  console.log(failed === 0 ? `\n${passed} HTTP authorization checks passed.\n` : `\n${failed} of ${passed + failed} FAILED.\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\nCould not reach the server. Start it first, then set BASE_URL.\n', error);
  process.exit(1);
});
