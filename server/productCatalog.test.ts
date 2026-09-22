import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { ProductService } from '../src/services/ProductService';
import { isBrowserSafeAssetUrl, mergeProductCatalog } from './productCatalog';

test('recognizes only browser-loadable product asset URLs', () => {
  assert.equal(isBrowserSafeAssetUrl('/product-images/example.png'), true);
  assert.equal(isBrowserSafeAssetUrl('https://cdn.example/product.png'), true);
  assert.equal(isBrowserSafeAssetUrl('//untrusted.example/product.png'), false);
  assert.equal(isBrowserSafeAssetUrl('file:///var/task/product.png'), false);
  assert.equal(isBrowserSafeAssetUrl('javascript:alert(1)'), false);
});

test('merges static and Firebase products without dropping either catalog', () => {
  const staticProducts = [
    { id: 'static-one', slug: 'static-one', title: 'Static One', price: 100, status: 'active', image: '/product-images/static.png', gallery: ['/product-images/static.png'] },
    { id: 'static-two', slug: 'static-two', title: 'Static Two', price: 200, status: 'active', image: '/product-images/two.png' },
  ];
  const databaseProducts = [
    {
      id: 'static-one',
      slug: 'static-one',
      title: 'Edited in Admin',
      price: 125,
      status: 'published',
      image: 'file:///var/task/broken.png',
      licenseTypes: [{ id: 'standard', name: 'Standard License' }],
      licenseTerms: 'Legacy terms',
      extendedPrice: 300,
    },
    { id: 'admin-only', slug: 'admin-only', title: 'Admin Product', price: 300, status: 'published', image: 'https://cdn.example/admin.png' },
  ];

  const catalog = mergeProductCatalog(staticProducts, databaseProducts);

  assert.deepEqual(catalog.map((product) => product.id), ['static-one', 'static-two', 'admin-only']);
  assert.equal(catalog[0].title, 'Edited in Admin');
  assert.equal(catalog[0].price, 125);
  assert.equal(catalog[0].image, '/product-images/static.png');
  assert.equal('licenseTypes' in catalog[0], false);
  assert.equal('licenseTerms' in catalog[0], false);
  assert.equal('extendedPrice' in catalog[0], false);
  assert.equal(catalog[2].image, 'https://cdn.example/admin.png');
});

test('excludes draft, archived, and inactive products from the public catalog', () => {
  const catalog = mergeProductCatalog(
    [{ id: 'active', status: 'active' }, { id: 'archived', status: 'active' }],
    [
      { id: 'archived', status: 'archived' },
      { id: 'draft', status: 'draft' },
      { id: 'inactive', status: 'inactive' },
    ]
  );

  assert.deepEqual(catalog.map((product) => product.id), ['active']);
});

test('keeps all six built-in products when Firebase contains only LinkNest', () => {
  const firebaseProducts = [
    {
      ...PRODUCTS.find((product) => product.id === 'linknest-pro'),
      status: 'published',
      image: 'file:///var/task/assets/linknest.jpg',
      gallery: ['file:///var/task/assets/linknest.jpg'],
    },
  ];

  const catalog = mergeProductCatalog(PRODUCTS, firebaseProducts);

  assert.deepEqual(
    catalog.map((product) => product.id),
    ['linknest-pro', 'neura-ai', 'finora', 'learnify', 'velora', 'workhub']
  );
  assert.equal(catalog.every((product) => isBrowserSafeAssetUrl(product.image)), true);
});

test('refreshes the browser catalog from the public product API', async () => {
  const originalFetch = globalThis.fetch;
  const remoteProduct = { ...PRODUCTS[0], id: 'admin-product', slug: 'admin-product', title: 'Admin Product' };
  let notifications = 0;
  const unsubscribe = ProductService.subscribe(() => notifications += 1);

  try {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      success: true,
      products: [remoteProduct],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    await ProductService.refreshProducts(true);

    assert.equal(ProductService.getAllProducts().length, 1);
    assert.equal(ProductService.getProductById('admin-product')?.title, 'Admin Product');
    assert.equal(notifications, 1);
  } finally {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      success: true,
      products: PRODUCTS,
    }), { status: 200 })) as typeof fetch;
    await ProductService.refreshProducts(true);
    globalThis.fetch = originalFetch;
    unsubscribe();
  }
});
