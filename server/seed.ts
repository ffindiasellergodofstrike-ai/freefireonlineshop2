import { FirebaseRtdb } from './firebaseRtdb';
import { PRODUCTS } from '../src/data/products';

export async function runServerSeed() {
  try {
    // 1. Seed Products if empty
    const existingProducts = await FirebaseRtdb.get<Record<string, any>>('products');
    if (!existingProducts || Object.keys(existingProducts).length === 0) {
      console.log('Seeding initial products into Firebase RTDB...');
      for (const p of PRODUCTS) {
        const prod = p as any;
        const productRecord = {
          ...prod,
          createdAt: prod.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'published',
          stock: prod.stock !== undefined ? prod.stock : 999,
          unlimitedStock: true,
          licenseTypes: prod.licenseTypes || prod.licenseTerms || [
            { id: 'standard', name: 'Standard License', price: prod.price },
            { id: 'extended', name: 'Extended Commercial', price: prod.price * 2 },
          ],
        };
        await FirebaseRtdb.set(`products/${prod.id}`, productRecord);
      }
    }

    // 2. Seed Coupons if empty
    const existingCoupons = await FirebaseRtdb.get<Record<string, any>>('coupons');
    if (!existingCoupons || Object.keys(existingCoupons).length === 0) {
      console.log('Seeding initial coupons into Firebase RTDB...');
      const defaultCoupons = [
        { id: 'coup_1', code: 'SAVE10', discountPercent: 10, description: '10% off your entire order', minSpend: 0, active: true, usageCount: 0, usageLimit: 1000 },
        { id: 'coup_2', code: 'FREEFIRE20', discountPercent: 20, description: '20% off for FreeFire community', minSpend: 500, active: true, usageCount: 0, usageLimit: 500 },
        { id: 'coup_3', code: 'WELCOME100', discountPercent: 0, flatAmount: 100, description: '₹100 flat discount', minSpend: 400, active: true, usageCount: 0, usageLimit: 200 },
      ];
      for (const coup of defaultCoupons) {
        await FirebaseRtdb.set(`coupons/${coup.id}`, coup);
      }
    }

    // 3. Seed Settings if empty
    const existingSettings = await FirebaseRtdb.get<any>('settings');
    if (!existingSettings) {
      console.log('Seeding initial store settings...');
      await FirebaseRtdb.set('settings', {
        storeName: 'FreeFireShop Digital',
        supportEmail: 'support@freefireshop.com',
        supportPhone: '+91 9876543210',
        appUrl: 'https://ais-dev-idexjqz7zkbomriwtujuzx-234817242937.asia-southeast1.run.app',
        paymentEnvironment: 'test',
        maintenanceMode: false,
        featuredProductIds: ['linknest-pro'],
        termsContent: 'Standard terms and conditions for digital downloads and licensing...',
        privacyContent: 'Your privacy is important to us. We protect your data securely...',
        refundContent: 'Digital products are non-refundable once downloaded unless defective...',
      });
    }

    // 4. Ensure admin role for ff.india.seller.god.of.strike@gmail.com
    const adminEmail = 'ff.india.seller.god.of.strike@gmail.com';
    const adminUserId = await FirebaseRtdb.findUserIdByIdentifier(adminEmail);
    if (adminUserId) {
      const profile = await FirebaseRtdb.getUserProfile(adminUserId);
      if (profile && profile.role !== 'admin') {
        profile.role = 'admin';
        await FirebaseRtdb.updateUserProfile(adminUserId, { role: 'admin' });
        console.log(`Granted admin privileges to ${adminEmail} (${adminUserId})`);
      }
    }

    console.log('Server seed completed successfully.');
  } catch (err) {
    console.warn('Server seed warning:', err);
  }
}
