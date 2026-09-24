import assert from 'node:assert/strict';
import test from 'node:test';
import { FirebaseRtdb } from './firebaseRtdb';

test('production account, payment and token data cannot fall back to process memory', async (context) => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    url: process.env.FIREBASE_DATABASE_URL,
    auth: process.env.FIREBASE_DATABASE_AUTH,
    secret: process.env.FIREBASE_DATABASE_SECRET,
  };
  context.after(() => {
    for (const [key, value] of Object.entries({
      NODE_ENV: previous.nodeEnv, FIREBASE_DATABASE_URL: previous.url,
      FIREBASE_DATABASE_AUTH: previous.auth, FIREBASE_DATABASE_SECRET: previous.secret,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  process.env.NODE_ENV = 'production';
  delete process.env.FIREBASE_DATABASE_AUTH;
  delete process.env.FIREBASE_DATABASE_SECRET;
  delete process.env.FIREBASE_DATABASE_URL;
  await assert.rejects(FirebaseRtdb.get('orders/synthetic-1'), /Authenticated Firebase/);
  await assert.rejects(FirebaseRtdb.set('sessions/synthetic-1', { userId: 'buyer' }), /Authenticated Firebase/);
  await assert.rejects(FirebaseRtdb.update('purchases/synthetic-1', { accessStatus: 'active' }), /Authenticated Firebase/);
  await assert.rejects(FirebaseRtdb.delete('downloadTokens/synthetic-1'), /Authenticated Firebase/);

  process.env.FIREBASE_DATABASE_URL = 'https://example.test';
  process.env.FIREBASE_DATABASE_AUTH = 'synthetic-credential';
  context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  await assert.rejects(FirebaseRtdb.get('orders/synthetic-1'), /Firebase read failed/);
  await assert.rejects(FirebaseRtdb.set('downloadTokens/synthetic-1', { used: false }), /Firebase write failed/);
  await assert.rejects(FirebaseRtdb.update('users/buyer/credentials', { passwordHash: 'synthetic' }), /Firebase update failed/);
  await assert.rejects(FirebaseRtdb.delete('sessions/synthetic-1'), /Firebase delete failed/);
});
