import assert from 'node:assert/strict';
import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { SecureFileManager } from './secureFiles';

test('maps product ids to Vercel environment variable names', () => {
  assert.equal(
    SecureFileManager.getProductDownloadEnvironmentKey('linknest-pro'),
    'PRODUCT_DOWNLOAD_URL_LINKNEST_PRO'
  );
  assert.equal(
    SecureFileManager.getProductDownloadEnvironmentKey('Creator Kit / v2'),
    'PRODUCT_DOWNLOAD_URL_CREATOR_KIT___V2'
  );
});

test('rejects non-HTTPS product download URLs', async () => {
  const key = SecureFileManager.getProductDownloadEnvironmentKey('test-product');
  const previousValue = process.env[key];
  process.env[key] = 'http://storage.example/test-product.zip';

  try {
    await assert.rejects(
      SecureFileManager.fetchProductFile('test-product'),
      /must use HTTPS/
    );
  } finally {
    if (previousValue === undefined) delete process.env[key];
    else process.env[key] = previousValue;
  }
});

test('fetches a configured product URL without exposing it to the caller', async () => {
  const key = SecureFileManager.getProductDownloadEnvironmentKey('test-product');
  const previousValue = process.env[key];
  const originalFetch = globalThis.fetch;
  process.env[key] = 'https://storage.example/test-product.zip';

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), process.env[key]);
    assert.equal(init?.method, 'GET');
    assert.equal(init?.redirect, 'follow');
    return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), { status: 200 });
  };

  try {
    const response = await SecureFileManager.fetchProductFile('test-product');
    assert.equal(response.status, 200);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
  } finally {
    globalThis.fetch = originalFetch;
    if (previousValue === undefined) delete process.env[key];
    else process.env[key] = previousValue;
  }
});

test('streams the upstream ZIP with protected download headers', async () => {
  const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  const upstream = new Response(zipBytes, {
    status: 200,
    headers: { 'content-length': String(zipBytes.byteLength) },
  });
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  let statusCode: number | undefined;
  let responseHeaders: Record<string, string> | undefined;

  output.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  (output as any).writeHead = (status: number, headers: Record<string, string>) => {
    statusCode = status;
    responseHeaders = headers;
    return output;
  };

  SecureFileManager.streamProductFileToResponse(
    upstream,
    'linknest-pro-package.zip',
    output as any
  );
  await once(output, 'finish');

  assert.equal(statusCode, 200);
  assert.equal(responseHeaders?.['Content-Type'], 'application/zip');
  assert.equal(responseHeaders?.['Content-Length'], String(zipBytes.byteLength));
  assert.equal(responseHeaders?.['Cache-Control'], 'private, no-store, no-cache, must-revalidate');
  assert.deepEqual(Buffer.concat(chunks), Buffer.from(zipBytes));
});
