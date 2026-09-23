import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEmailDownloadUrl,
  buildInvoiceDownloadUrl,
  buildInvoicePdf,
  buildPurchaseEmailHtml,
  createEmailDownloadToken,
  hashEmailDownloadToken,
} from './purchaseEmail';

const order = {
  id: 'ORDER-123',
  orderNumber: 'ORDER-123',
  createdAt: '2026-09-22T10:00:00.000Z',
  customer: { fullName: 'Test <Buyer>', email: 'buyer@example.com' },
  items: [{ productId: 'demo-product', productTitle: 'Demo & Product', price: 499, quantity: 1 }],
  subtotal: 499,
  discount: 0,
  tax: 0,
  total: 499,
  paymentStatus: 'PAID',
  transactionId: 'TXN-123',
};

test('email download tokens are random and stored by one-way hash', () => {
  const first = createEmailDownloadToken();
  const second = createEmailDownloadToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.match(hashEmailDownloadToken(first), /^[a-f0-9]{64}$/);
  assert.equal(hashEmailDownloadToken(first), hashEmailDownloadToken(first));
  assert.notEqual(hashEmailDownloadToken(first), first);
});

test('email item and invoice URLs stay on the application domain', () => {
  const url = buildEmailDownloadUrl('safe_token');
  const invoiceUrl = buildInvoiceDownloadUrl('invoice_token');
  assert.equal(url, 'https://www.ffdigital.shop/api/downloads/email?token=safe_token');
  assert.equal(invoiceUrl, 'https://www.ffdigital.shop/api/invoices/email?token=invoice_token');
  assert.doesNotMatch(url, /mega\.nz/i);
  assert.doesNotMatch(invoiceUrl, /mega\.nz/i);
});

test('professional purchase email escapes data and includes item, invoice, and terms sections', () => {
  const html = buildPurchaseEmailHtml(order, [{
    productId: 'demo-product',
    productTitle: 'Demo & Product',
    downloadUrl: 'https://shop.example.com/api/downloads/email?token=safe_token',
    expiresAt: Date.now() + 60_000,
  }], {
    invoiceUrl: 'https://shop.example.com/api/invoices/email?token=invoice_token',
  });
  assert.match(html, /Test &lt;Buyer&gt;/);
  assert.match(html, /Demo &amp; Product/);
  assert.match(html, /Download your order items/);
  assert.match(html, /Download Invoice/);
  assert.match(html, /Important terms/);
  assert.match(html, /shop\.example\.com\/api\/downloads\/email/);
  assert.match(html, /shop\.example\.com\/api\/invoices\/email/);
  assert.doesNotMatch(html, /mega\.nz/i);
});

test('invoice generator returns a valid PDF document', async () => {
  const pdf = await buildInvoicePdf(order);
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.length > 1_000);
});
