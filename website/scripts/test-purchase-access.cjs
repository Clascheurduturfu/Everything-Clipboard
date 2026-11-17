// Offline regression checks of the actual entitlement and webhook modules.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let sessions, documents, event, writes, stripeReads;
const stamp = { toDate: () => new Date(0) };
function snapshot(collection, id) {
  const data = documents.get(`${collection}/${id}`);
  return { id, exists: !!data, data: () => data, ref: ref(collection, id) };
}
function ref(collection, id) {
  return { collection, id, get: async () => snapshot(collection, id), set: async data => {
    documents.set(`${collection}/${id}`, { ...documents.get(`${collection}/${id}`), ...data });
  } };
}
function query(collection, filters = []) {
  return { doc: id => ref(collection, id), where: (key, op, value) => query(collection, [...filters, [key, value]]),
    limit() { return this; }, get: async () => {
      const docs = [...documents.entries()]
        .filter(([key, value]) => key.startsWith(`${collection}/`) && filters.every(([k,v]) => value[k] === v))
        .map(([key]) => snapshot(collection, key.slice(collection.length + 1)));
      return { docs, empty: docs.length === 0 };
    } };
}
const db = { collection: name => query(name), runTransaction: async fn => {
  let wrote = false;
  return fn({ get: async target => { assert.equal(wrote, false, 'Firestore reads must precede writes'); return target.get(); },
    set: (target, data) => { wrote = true; writes++; target.set(data); } });
} };
class FakeStripe {
  checkout = { sessions: { retrieve: async id => { stripeReads++; if (!sessions.has(id)) throw Error('Stripe unavailable'); return sessions.get(id); } } };
  webhooks = { constructEvent: () => event };
}
const cache = new Map();
function load(filename) {
  filename = path.join(root, filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const requireMock = name => {
    if (name === 'stripe') return FakeStripe;
    if (name === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => stamp } };
    if (name === '@/lib/firebase-admin') return { getAdminDb: () => db };
    if (name === 'next/server') return { NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200 }) } };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw Error(`Unexpected module: ${name}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(requireMock, mod, mod.exports);
  return mod.exports;
}
function reset() { sessions = new Map(); documents = new Map(); writes = 0; stripeReads = 0; }
const paid = () => ({ id: 'cs_owned', payment_status: 'paid', client_reference_id: 'owner', metadata: {},
  payment_intent: { id: 'pi_owned', status: 'succeeded', latest_charge: { refunded: false, disputed: false } } });
async function main() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_fixture';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_offline_fixture';
  const access = load('src/lib/entitlements.ts');
  const webhook = load('src/app/api/stripe/webhook/route.ts');
  const request = { headers: { get: () => 'offline-signature' }, text: async () => 'offline-payload' };
  reset(); documents.set('users/owner', { purchased: false }); sessions.set('cs_owned', paid());
  assert.equal((await access.getAccountProfile('owner')).purchased, false);
  assert.equal(stripeReads, 0, 'Account reads cannot resurrect a refunded purchase');
  assert.equal(await access.fulfillCheckoutSession('cs_owned', 'attacker'), false);
  assert.equal(writes, 0, 'A session URL cannot grant another account access');
  assert.equal(await access.fulfillCheckoutSession('cs_owned', 'owner'), true);
  assert.equal(documents.get('orders/cs_owned').paymentIntentId, 'pi_owned');
  assert.equal(documents.get('users/owner').purchased, true);
  event = { id: 'evt_refund', type: 'charge.refunded', data: { object: { refunded: true, payment_intent: 'pi_owned' } } };
  assert.equal((await webhook.POST(request)).status, 200);
  assert.equal(documents.get('users/owner').purchased, false);
  assert.equal(documents.get('orders/cs_owned').status, 'refunded');
  assert.equal(await access.fulfillCheckoutSession('cs_owned', 'owner'), false, 'Recorded revocation cannot be replayed');
  sessions.get('cs_owned').payment_intent.latest_charge.refunded = true;
  event = { id: 'evt_old_completed', type: 'checkout.session.completed', data: { object: paid() } };
  assert.equal((await webhook.POST(request)).status, 200);
  assert.equal(documents.get('users/owner').purchased, false, 'Delayed completion cannot reverse a refund');
  reset(); const disputed = paid(); disputed.payment_intent.latest_charge.disputed = true; sessions.set('cs_owned', disputed);
  assert.equal(await access.fulfillCheckoutSession('cs_owned', 'owner'), false);
  reset(); sessions.set('cs_owned', paid()); await access.fulfillCheckoutSession('cs_owned', 'owner');
  documents.set('orders/another', { firebaseUid: 'owner', status: 'paid' });
  event = { id: 'evt_refund_2', type: 'charge.refunded', data: { object: { refunded: true, payment_intent: 'pi_owned' } } };
  assert.equal((await webhook.POST(request)).status, 200);
  assert.equal(documents.get('users/owner').purchased, true, 'Another valid purchase retains access');
  for (const [label, setup] of [
    ['An active Google Play purchase', () => documents.set('playPurchases/tok', { uid: 'owner', state: 'active' })],
    ['A manual grant', () => documents.set('users/owner', { ...documents.get('users/owner'), manualGrant: true })],
  ]) {
    reset(); sessions.set('cs_owned', paid()); await access.fulfillCheckoutSession('cs_owned', 'owner'); setup();
    event = { id: 'evt_refund_3', type: 'charge.refunded', data: { object: { refunded: true, payment_intent: 'pi_owned' } } };
    assert.equal((await webhook.POST(request)).status, 200);
    assert.equal(documents.get('users/owner').purchased, true, `${label} retains access after a Stripe refund`);
  }
  reset(); documents.set('users/owner', { purchased: true }); documents.set('playPurchases/tok', { uid: 'owner', state: 'voided' });
  assert.equal(await load('src/lib/access.ts').recomputeAccess('owner'), false, 'A voided Play purchase grants nothing');
  console.log('PASS: ownership binding, order persistence, refund transaction, replay rejection, dispute rejection, independent purchase retention (Stripe, Play, manual grant), voided Play revocation, and no read-time regrant');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
