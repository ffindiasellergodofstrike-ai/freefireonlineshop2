import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { isIP } from 'node:net';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import { AuthServiceServer } from './auth';
import { FirebaseRtdb } from './firebaseRtdb';
import { AuditLogger, generateRequestId } from './audit';
import { SecureFileManager } from './secureFiles';
import { PRODUCTS, COUPONS } from '../src/data/products';
import { adminRouter } from './adminRoutes';
import { runServerSeed } from './seed';
import { mergeProductCatalog } from './productCatalog';
import { easebuzzRetrieveHash, findPaidPurchase, isPaidOrderForProduct, matchesEasebuzzPaymentIdentity, matchesVerifiedEasebuzzPayment } from './paymentAccess';
import {
  buildEmailDownloadUrl,
  buildInvoiceDownloadUrl,
  buildInvoicePdf,
  createEmailDownloadToken,
  getPurchaseEmailLinkTtlMs,
  hashEmailDownloadToken,
  sendPurchaseConfirmationEmail,
  type PurchaseEmailLink,
} from './purchaseEmail';
import {
  buildEasebuzzInitiatePayload,
  formatEasebuzzAmount,
  getEasebuzzBaseUrl,
  getEasebuzzDashboardUrl,
  sanitizeFieldText,
  sanitizePhoneNumber,
  verifyEasebuzzCallbackHash,
} from './easebuzz';

// Run initial seed on startup
runServerSeed().catch(err => console.warn('Startup seed error:', err));

const EASEBUZZ_KEY = (process.env.EASEBUZZ_KEY || '').trim();
const EASEBUZZ_SALT = (process.env.EASEBUZZ_SALT || '').trim();
const rawEasebuzzEnv = (process.env.EASEBUZZ_ENV || '').trim().toLowerCase();
const EASEBUZZ_ENV_VALID = ['test', 'prod', 'production'].includes(rawEasebuzzEnv) ||
  (!rawEasebuzzEnv && process.env.NODE_ENV !== 'production');
const EASEBUZZ_ENV: 'prod' | 'test' = ['prod', 'production'].includes(rawEasebuzzEnv) ? 'prod' : 'test';
const CRON_SECRET = process.env.CRON_SECRET || '';

const EASEBUZZ_BASE_URL = getEasebuzzBaseUrl(EASEBUZZ_ENV);
const EASEBUZZ_DASHBOARD_URL = getEasebuzzDashboardUrl(EASEBUZZ_ENV);

const getConfiguredAppUrl = (): string => {
  if (process.env.APP_URL) {
    try {
      const configured = new URL(process.env.APP_URL);
      if (configured.protocol === 'https:' ||
          (process.env.NODE_ENV !== 'production' && configured.protocol === 'http:')) {
        return configured.origin;
      }
    } catch {
      // An invalid configured URL must never become a gateway callback.
    }
  }
  return 'https://www.ffdigital.shop';
};

const getHostUrl = (req: Request): string => {
  if (process.env.APP_URL || process.env.NODE_ENV === 'production') return getConfiguredAppUrl();
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || req.headers.host);
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
  if (host) {
    const cleanHost = String(host).split(',')[0].trim();
    return `${proto}://${cleanHost}`.replace(/\/+$/, '');
  }
  return getConfiguredAppUrl();
};

const getPaymentRequestIp = (req: Request): string => {
  // Vercel sets this header from the client connection and prevents spoofing.
  const forwarded = process.env.VERCEL
    ? req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']
    : undefined;
  const candidate = String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.ip || '')
    .split(',')[0].trim();
  return isIP(candidate) ? candidate : '';
};

const getProductCatalog = async (): Promise<any[]> => {
  const databaseProducts = await FirebaseRtdb.getAllProducts();
  return mergeProductCatalog(PRODUCTS, databaseProducts);
};

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  username?: string;
}

export const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.replace(/\/+$/, '') === getConfiguredAppUrl()) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production') {
      try {
        const url = new URL(origin);
        if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
          return callback(null, true);
        }
      } catch {
        // Reject malformed origins.
      }
    }
    return callback(null, false);
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// RTDB-backed Auth Rate Limiter
const authRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = (req.ip || req.headers['x-forwarded-for'] as string || 'unknown').replace(/[\.\/]/g, '_');
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 20;

    const key = `rateLimits/${ip}`;
    const record = await FirebaseRtdb.get<{ count: number; resetTime: number }>(key);

    if (!record || now > record.resetTime) {
      await FirebaseRtdb.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
      });
    }

    record.count += 1;
    await FirebaseRtdb.set(key, record);
    next();
  } catch {
    // Do not permit unlimited login guesses when the shared limiter is down.
    res.status(503).json({ success: false, message: 'Authentication is temporarily unavailable.' });
  }
};

// Authentication Middleware via Opaque Session Cookie "sid"
const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const sid = req.cookies?.sid;
  if (!sid) {
    return res.status(401).json({ success: false, message: 'Authentication session required.' });
  }

  const payload = await AuthServiceServer.verifyOpaqueSession(sid);
  if (!payload || !payload.userId) {
    res.clearCookie('sid', { path: '/' });
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }

  req.userId = payload.userId;
  req.userEmail = payload.email;
  req.username = payload.username;
  next();
};

const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  await requireAuth(req, res, async () => {
    try {
      const profile = await FirebaseRtdb.getUserProfile(req.userId!);
      if (!profile || profile.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Administrative privileges required for this action.' });
      }
      next();
    } catch {
      return res.status(403).json({ success: false, message: 'Administrative privileges required for this action.' });
    }
  });
};

// ============================================
// SYSTEM & HEALTH ENDPOINTS
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/firebase-status', async (req: Request, res: Response) => {
  const status = await FirebaseRtdb.testConnection();
  res.json({
    status: 'ok',
    firebase: {
      connected: status.connected,
      mode: status.mode,
      ...(process.env.NODE_ENV !== 'production' ? { databaseUrl: status.url, error: status.error } : {}),
    },
  });
});

// Public Product API: static products and Admin/Firebase products are merged.
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, products: await getProductCatalog() });
  } catch {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, message: 'Product catalog is temporarily unavailable.' });
    }
    res.json({ success: true, products: mergeProductCatalog(PRODUCTS, []) });
  }
});

app.get('/api/products/:slugOrId', async (req: Request, res: Response) => {
  try {
    const identifier = req.params.slugOrId.toLowerCase();
    const list = await getProductCatalog();
    const found = list.find((p: any) => p.id.toLowerCase() === identifier || p.slug.toLowerCase() === identifier);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, product: found });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch product.' });
  }
});

app.post('/api/newsletter/subscribe', authRateLimiter, async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  try {
    const key = crypto.createHash('sha256').update(email).digest('hex');
    const path = `newsletterSubscribers/${key}`;
    const existing = await FirebaseRtdb.get<any>(path);
    const now = new Date().toISOString();
    await FirebaseRtdb.set(path, {
      email, subscribedAt: existing?.subscribedAt || now, lastConsentAt: now, status: 'subscribed',
    });
    res.json({ success: true, message: 'Your subscription was saved.' });
  } catch {
    res.status(503).json({ success: false, message: 'Could not save your subscription. Please retry.' });
  }
});

// Mount Admin Router with requireAdmin
app.use('/api/admin', requireAdmin, adminRouter);

// ============================================
// AUTH ENDPOINTS (OPAQUE SESSIONS + COOKIES)
// ============================================
app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  try {
    const { mobile, email, password, confirmPassword, name } = req.body;
    const result = await AuthServiceServer.register({ mobile, email, password, confirmPassword, name });

    if (!result.success) {
      return res.status(400).json(result);
    }

    const rawToken = await AuthServiceServer.createOpaqueSession(
      result.user.id,
      result.user.email,
      result.user.username,
      req.ip,
      req.headers['user-agent']
    );

    res.cookie('sid', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || req.secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ success: true, message: result.message, user: result.user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const result = await AuthServiceServer.login(identifier, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    const rawToken = await AuthServiceServer.createOpaqueSession(
      result.user.id,
      result.user.email,
      result.user.username,
      req.ip,
      req.headers['user-agent']
    );

    res.cookie('sid', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || req.secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, message: 'Login successful.', user: result.user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Invalid login credentials.' });
  }
});

app.post('/api/auth/forgot-password', authRateLimiter, async (req, res) => {
  try {
    const { email, mobile, newPassword, confirmNewPassword } = req.body;
    const result = await AuthServiceServer.resetPasswordWithEmailAndMobile({ email, mobile, newPassword, confirmNewPassword });
    res.status(result.success ? 200 : 400).json(result);
  } catch {
    res.status(503).json({ success: false, message: 'Password reset is temporarily unavailable.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await FirebaseRtdb.getUserProfile(req.userId!);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }
    res.json({ success: true, user: profile });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

app.post('/api/auth/logout', async (req: AuthenticatedRequest, res) => {
  try {
    const sid = req.cookies?.sid;
    if (sid) {
      await AuthServiceServer.destroyOpaqueSession(sid);
    }
    res.clearCookie('sid', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch {
    res.clearCookie('sid', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully.' });
  }
});

// ============================================
// USER SYNC, CART, WISHLIST & ORDERS
// ============================================
app.get('/api/user/sync-all', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const [profile, cart, wishlist, orders, downloads, settings] = await Promise.all([
      FirebaseRtdb.getUserProfile(userId),
      FirebaseRtdb.getUserCart(userId),
      FirebaseRtdb.getUserWishlist(userId),
      FirebaseRtdb.getUserOrders(userId),
      FirebaseRtdb.getUserDownloads(userId),
      FirebaseRtdb.getUserSettings(userId),
    ]);
    res.json({ success: true, data: { profile, cart, wishlist, orders, downloads, settings } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to sync user data.' });
  }
});

app.put('/api/user/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    company: z.string().trim().max(150).optional(),
    country: z.string().trim().min(2).max(100).optional(),
  }).strict().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
    return res.status(400).json({ success: false, message: 'Only name, company and country can be updated.' });
  }
  try {
    const profile = await FirebaseRtdb.getUserProfile(req.userId!);
    if (!profile) return res.status(404).json({ success: false, message: 'Account not found.' });
    const updatedAt = new Date().toISOString();
    await FirebaseRtdb.updateUserProfile(req.userId!, { ...parsed.data, updatedAt });
    res.json({ success: true, user: { ...profile, ...parsed.data, updatedAt } });
  } catch {
    res.status(503).json({ success: false, message: 'Could not save profile changes.' });
  }
});

app.get('/api/user/cart', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const items = await FirebaseRtdb.getUserCart(req.userId!);
    res.json({ success: true, items });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch cart.' });
  }
});

app.post('/api/user/cart', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { items } = req.body;
    await FirebaseRtdb.setUserCart(req.userId!, items || []);
    res.json({ success: true, items });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save cart.' });
  }
});

app.get('/api/user/wishlist', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const items = await FirebaseRtdb.getUserWishlist(req.userId!);
    res.json({ success: true, items });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist.' });
  }
});

app.post('/api/user/wishlist', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { items } = req.body;
    await FirebaseRtdb.setUserWishlist(req.userId!, items || []);
    res.json({ success: true, items });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save wishlist.' });
  }
});

app.get('/api/user/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orders = await FirebaseRtdb.getUserOrders(req.userId!);
    res.json({ success: true, orders });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

app.get('/api/user/downloads', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const downloads = await FirebaseRtdb.getUserDownloads(req.userId!);
    const checked = await Promise.all(downloads.map(async (download: any) => {
      if (!download?.orderId || !download?.productId) return null;
      const order = await FirebaseRtdb.getGlobalOrder(download.orderId);
      return isPaidOrderForProduct(order, req.userId!, download.productId) ? download : null;
    }));
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.json({ success: true, downloads: checked.filter(Boolean) });
  } catch {
    res.status(503).json({ success: false, message: 'Could not fetch downloads.' });
  }
});

app.get('/api/orders/:orderId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await FirebaseRtdb.getUserOrderById(req.userId!, req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.json({ success: true, order });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
});

app.get('/api/orders/:orderId/invoice', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await FirebaseRtdb.getUserOrderById(req.userId!, req.params.orderId);
    if (!order) return res.status(404).send('Order not found.');
    if (String(order.paymentStatus).toUpperCase() !== 'PAID' ||
        order.paymentProvider !== 'Easebuzz' || !order.transactionId) {
      return res.status(403).send('A verified paid order is required for an invoice.');
    }
    const invoice = await buildInvoicePdf(order);
    const invoiceNumber = String(order.invoiceNumber || `INV-${order.id}`)
      .replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).send(invoice);
  } catch {
    return res.status(503).send('Invoice is temporarily unavailable.');
  }
});

// Secure Order Creation with strict validation
const handleOrderCreation = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  try {
    const userId = req.userId!;
    const { items, customer, discountCode, paymentMethod } = req.body;
    const buyerProfile = await FirebaseRtdb.getUserProfile(userId);
    const buyerEmail = String(buyerProfile?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return res.status(400).json({ success: false, message: 'Add a valid email to your account before checkout.', requestId });
    }
    if (customer?.email && String(customer.email).trim().toLowerCase() !== buyerEmail) {
      return res.status(400).json({ success: false, message: 'Checkout email must match your account email.', requestId });
    }
    if (customer?.country && String(customer.country).trim().toLowerCase() !== 'india') {
      return res.status(400).json({ success: false, message: 'Only India is supported for this checkout.', requestId });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required.', requestId });
    }

    let calculatedSubtotal = 0;
    const validatedItems: any[] = [];
    let primaryProductId = '';
    let primaryProductName = '';

    const productList = await getProductCatalog();

    for (const ci of items) {
      const rawId = ci.productId || ci.product?.id || ci.id;
      const matchedProduct = productList.find((p: any) => p.id === rawId || p.slug === rawId);
      if (!matchedProduct) {
        return res.status(400).json({ success: false, message: `Unknown product ID: ${rawId}`, requestId });
      }

      const quantity = ci.quantity === undefined ? 1 : Number(ci.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return res.status(400).json({ success: false, message: 'Invalid quantity (must be between 1 and 10).', requestId });
      }

      if (!primaryProductId) {
        primaryProductId = matchedProduct.id;
        primaryProductName = matchedProduct.title;
      }

      const serverPrice = matchedProduct.price;
      calculatedSubtotal += serverPrice * quantity;

      validatedItems.push({
        productId: matchedProduct.id,
        productTitle: matchedProduct.title,
        productSlug: matchedProduct.slug,
        productImage: matchedProduct.image,
        category: matchedProduct.categoryLabel || matchedProduct.category,
        productType: matchedProduct.productType || 'DOWNLOAD',
        price: serverPrice,
        quantity,
        downloadUrl: `/api/downloads/${matchedProduct.id}`,
        fileSize: matchedProduct.fileSize || '12.4 MB',
        version: matchedProduct.version || 'v1.2.0',
        fileFormat: matchedProduct.fileFormat || 'ZIP',
        downloadStatus: 'UNAVAILABLE',
        downloadLimit: 10,
        downloadCount: 0,
        product: matchedProduct,
      });
    }

    let calculatedDiscount = 0;
    if (discountCode) {
      const coupon = COUPONS.find((c) => c.code.toUpperCase() === String(discountCode).toUpperCase());
      if (coupon) {
        const nowMs = Date.now();
        const isActive = coupon.active !== false;
        const isNotExpired = !coupon.expiresAt || new Date(coupon.expiresAt).getTime() > nowMs;
        const meetsMinSpend = !coupon.minSpend || calculatedSubtotal >= coupon.minSpend;

        if (isActive && isNotExpired && meetsMinSpend) {
          calculatedDiscount = Math.round((calculatedSubtotal * coupon.discountPercent) / 100);
        }
      }
    }

    const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscount);
    if (!Number.isFinite(calculatedTotal) || calculatedTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Order total must be a positive amount.', requestId });
    }
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(9).toString('hex').toUpperCase();
    const orderId = `LN-${todayStr}-${randomHex}`;
    const now = new Date().toISOString();

    const newOrder = {
      id: orderId,
      orderId,
      orderNumber: orderId,
      userId,
      date: now.split('T')[0],
      createdAt: now,
      updatedAt: now,
      customerEmail: buyerEmail,
      customerName: customer?.fullName || 'Customer',
      productId: primaryProductId,
      productNameSnapshot: primaryProductName,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      orderStatus: 'PENDING',
      deliveryStatus: 'PENDING',
      downloadStatus: 'UNAVAILABLE',
      amount: calculatedTotal,
      currency: 'INR',
      customer: {
        fullName: customer?.fullName || 'Customer',
        email: buyerEmail,
        phone: customer?.phone || '',
        company: customer?.company || '',
        country: 'India',
      },
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount: calculatedDiscount,
      discountCode: discountCode || '',
      tax: 0,
      total: calculatedTotal,
      paymentMethod: paymentMethod || 'Card / UPI Gateway',
      checkoutStartedAt: now,
      requestId,
    };

    await FirebaseRtdb.saveGlobalOrder(newOrder);

    await AuditLogger.log({
      requestId,
      userId,
      orderId,
      productId: primaryProductId,
      eventType: 'ORDER_CREATED',
      eventStatus: 'SUCCESS',
      source: 'API',
      metadata: { amount: calculatedTotal, currency: 'INR', itemsCount: validatedItems.length },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, order: newOrder, requestId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create order.', requestId });
  }
};

app.post('/api/orders/create', requireAuth, handleOrderCreation);
app.post('/api/user/orders', requireAuth, handleOrderCreation);

// ============================================
// EASEBUZZ PAYMENT GATEWAY (REAL)
// ============================================
app.post('/api/payments/easebuzz/initiate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, agreeTerms } = req.body;
    const userId = req.userId!;

    if (!EASEBUZZ_KEY || !EASEBUZZ_SALT || !EASEBUZZ_ENV_VALID) {
      return res.status(503).json({ success: false, message: 'Easebuzz payment gateway is not configured yet.' });
    }

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    if (agreeTerms !== true) {
      return res.status(400).json({ success: false, message: 'You must accept the terms before starting payment.' });
    }

    const order = await FirebaseRtdb.getUserOrderById(userId, orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (String(order.customer?.country || '').trim().toLowerCase() !== 'india') {
      return res.status(400).json({ success: false, message: 'Only India is supported for this checkout.' });
    }

    if (String(order.paymentStatus).toUpperCase() === 'PAID' ||
        ['REFUNDED', 'REVOKED', 'CANCELLED'].includes(String(order.status).toUpperCase()) ||
        order.deliveryStatus === 'REVOKED') {
      return res.status(400).json({ success: false, message: 'This order cannot be paid again.' });
    }

    if (order.easebuzzAccessKey || order.easebuzzTxnId || order.transactionId) {
      return res.status(409).json({
        success: false,
        message: 'Payment was already started for this order. Verify its status before starting a new checkout.',
      });
    }

    const rawPhone = order.customer?.phone || order.customerPhone || '';
    const phone = sanitizePhoneNumber(rawPhone);
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required for payment.' });
    }

    const amountObj = formatEasebuzzAmount(order.total ?? order.amount ?? 0);
    if (!amountObj.valid) {
      return res.status(400).json({ success: false, message: 'Invalid order amount. Amount must be a positive number.' });
    }
    const amount = amountObj.formatted;

    const txnid = `${order.orderNumber || 'ORD'}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 35);
    
    const rawFirstname = order.customer?.fullName || order.customerName || 'Customer';
    const firstname = sanitizeFieldText(rawFirstname, 50, 'Customer');
    
    const email = String(order.customer?.email || order.customerEmail || req.userEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid customer email is required for payment.' });
    }
    const productinfo = sanitizeFieldText(
      (order.items || []).map((item: any) => item.productTitle || item.productId).filter(Boolean).join(', '),
      100, 'FFDigital Products',
    );
    const initiatedAt = new Date().toISOString();
    const buyerIp = getPaymentRequestIp(req);
    const itemIds = sanitizeFieldText(
      (order.items || []).map((item: any) => item.productId).filter(Boolean).join(','), 100,
    );

    const baseAppUrl = getHostUrl(req);
    const surl = `${baseAppUrl}/api/payments/easebuzz/callback`;
    const furl = `${baseAppUrl}/api/payments/easebuzz/callback`;

    const { payload } = buildEasebuzzInitiatePayload({
      key: EASEBUZZ_KEY,
      salt: EASEBUZZ_SALT,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      udf1: order.id,
      udf2: 'India',
      udf3: initiatedAt,
      udf4: buyerIp,
      udf5: initiatedAt,
      udf6: itemIds,
      udf7: 'terms-refund-privacy:accepted',
    });

    const ebzResponse = await fetch(`${EASEBUZZ_BASE_URL}/payment/initiateLink`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: payload.toString()
    });

    const responseText = await ebzResponse.text();
    let ebzData: any = null;
    try {
      ebzData = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ success: false, message: 'Invalid response from Easebuzz payment gateway.' });
    }

    if (ebzData && ebzData.status === 1 && ebzData.data) {
      order.customer = { ...order.customer, country: 'India' };
      order.paymentInitiatedAt = initiatedAt;
      order.paymentInitiationIp = buyerIp || null;
      order.termsAccepted = true;
      order.termsAcceptedAt = initiatedAt;
      order.termsAcceptedPolicies = ['terms', 'refund', 'privacy'];
      order.termsDocumentUrl = `${baseAppUrl}/terms`;
      order.easebuzzProductInfo = productinfo;
      order.transactionId = txnid;
      order.easebuzzTxnId = txnid;
      order.easebuzzAccessKey = ebzData.data;
      order.status = 'PENDING_PAYMENT';
      order.paymentStatus = 'PENDING';
      await FirebaseRtdb.saveGlobalOrder(order);
      return res.json({
        success: true,
        accessKey: ebzData.data,
        merchantKey: EASEBUZZ_KEY,
        environment: EASEBUZZ_ENV,
        orderId: order.id,
        txnid,
      });
    } else {
      let rawMsg = typeof ebzData?.data === 'string'
        ? ebzData.data
        : (ebzData?.error_desc || ebzData?.message || 'Failed to initiate Easebuzz payment.');
      if (EASEBUZZ_KEY) rawMsg = rawMsg.replaceAll(EASEBUZZ_KEY, '[KEY]');
      if (EASEBUZZ_SALT) rawMsg = rawMsg.replaceAll(EASEBUZZ_SALT, '[SALT]');
      console.error('[Easebuzz Gateway Error]:', typeof ebzData === 'object' ? { status: ebzData?.status, error: rawMsg } : ebzData);
      return res.status(400).json({ success: false, message: rawMsg });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Easebuzz payment initiation failed.' });
  }
});

const fulfillPaidOrder = async (order: any): Promise<void> => {
  if (String(order.paymentStatus).toUpperCase() !== 'PAID' || !order.userId ||
      !Array.isArray(order.items) || !order.items.length ||
      ['REFUNDED', 'REVOKED', 'CANCELLED'].includes(String(order.status).toUpperCase()) ||
      order.deliveryStatus === 'REVOKED') return;

  const purchases = await FirebaseRtdb.getUserPurchases(order.userId);
  const downloads = await FirebaseRtdb.getUserDownloads(order.userId);
  const now = new Date().toISOString();
  for (const item of order.items) {
    const purchaseId = `pur_${order.id}_${item.productId}`;
    const downloadId = `dl_${order.id}_${item.productId}`;
    if (!purchases.some((purchase: any) => purchase.purchaseId === purchaseId && purchase.accessStatus === 'active')) {
      await FirebaseRtdb.savePurchase(order.userId, purchaseId, {
        purchaseId, userId: order.userId, orderId: order.id,
        productId: item.productId, productTitle: item.productTitle,
        purchasedAt: order.paymentVerifiedAt || now, deliveredAt: now,
        invoiceNumber: order.invoiceNumber,
        accessStatus: 'active', downloadLimit: 10, downloadCount: 0,
      });
    }
    if (!downloads.some((download: any) => download.downloadId === downloadId)) {
      await FirebaseRtdb.saveUserDownload(order.userId, downloadId, {
        id: downloadId, downloadId, orderId: order.id,
        productId: item.productId, productTitle: item.productTitle,
        status: 'AVAILABLE', createdAt: now, deliveredAt: now,
        downloadUrl: item.downloadUrl, fileSize: item.fileSize, fileFormat: item.fileFormat,
      });
    }
  }

  order.fulfillmentStatus = 'READY';
  order.fulfilledAt = order.fulfilledAt || now;
  order.deliveredAt = order.deliveredAt || now;
  order.deliveryStatus = 'DELIVERED';
  order.downloadStatus = 'AVAILABLE';
  order.items = order.items.map((item: any) => ({ ...item, downloadStatus: 'AVAILABLE' }));
  await FirebaseRtdb.saveGlobalOrder(order);
};

const createPurchaseEmailLinks = async (order: any): Promise<PurchaseEmailLink[]> => {
  const createdAt = Date.now();
  const expiresAt = createdAt + getPurchaseEmailLinkTtlMs();
  const links: PurchaseEmailLink[] = [];
  const linkedProductIds = new Set<string>();

  for (const item of order.items || []) {
    if (!item.productId || linkedProductIds.has(item.productId)) continue;
    linkedProductIds.add(item.productId);

    const rawToken = createEmailDownloadToken();
    const tokenHash = hashEmailDownloadToken(rawToken);
    const purchaseId = `pur_${order.id}_${item.productId}`;

    await FirebaseRtdb.set(`emailDownloadTokens/${tokenHash}`, {
      tokenHash,
      userId: order.userId,
      orderId: order.id,
      purchaseId,
      productId: item.productId,
      productTitle: item.productTitle || item.productId || 'Digital Product',
      createdAt,
      expiresAt,
      used: false,
    });

    links.push({
      productId: item.productId,
      productTitle: item.productTitle || item.productId || 'Digital Product',
      downloadUrl: buildEmailDownloadUrl(rawToken),
      expiresAt,
    });
  }

  return links;
};

const createPurchaseInvoiceLink = async (order: any): Promise<string> => {
  const rawToken = createEmailDownloadToken();
  const tokenHash = hashEmailDownloadToken(rawToken);
  const createdAt = Date.now();

  await FirebaseRtdb.set(`invoiceDownloadTokens/${tokenHash}`, {
    tokenHash,
    userId: order.userId,
    orderId: order.id,
    createdAt,
    expiresAt: createdAt + getPurchaseEmailLinkTtlMs(),
    downloadCount: 0,
    downloadLimit: 10,
  });

  return buildInvoiceDownloadUrl(rawToken);
};

const sendPurchaseEmailSafely = async (order: any): Promise<void> => {
  if (order.emailDelivery?.status === 'sent') return;
  if (order.deliveryStatus !== 'DELIVERED' || !order.fulfilledAt) return;

  const attemptedAt = new Date().toISOString();
  const previousAttempts = Number(order.emailDelivery?.attempts || 0);

  try {
    if (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim()) {
      order.emailDelivery = {
        status: 'not_configured',
        attempts: previousAttempts,
        lastAttemptAt: attemptedAt,
        message: 'Resend is not configured.',
      };
      await FirebaseRtdb.saveGlobalOrder(order);
      return;
    }

    if (!String(order.customer?.email || order.customerEmail || '').trim()) {
      order.emailDelivery = {
        status: 'failed',
        attempts: previousAttempts,
        lastAttemptAt: attemptedAt,
        message: 'The order does not contain a customer email address.',
      };
      await FirebaseRtdb.saveGlobalOrder(order);
      return;
    }

    const links = await createPurchaseEmailLinks(order);
    const invoiceUrl = await createPurchaseInvoiceLink(order);
    const result = await sendPurchaseConfirmationEmail(order, links, { invoiceUrl });
    order.emailDelivery = {
      status: result.status,
      attempts: previousAttempts + 1,
      lastAttemptAt: attemptedAt,
      ...(result.status === 'sent' ? { sentAt: attemptedAt, emailId: result.emailId } : {}),
      ...(result.reason ? { message: result.reason.slice(0, 240) } : {}),
    };
    await FirebaseRtdb.saveGlobalOrder(order);
  } catch (error: any) {
    // Payment and entitlement delivery must remain successful even if the
    // transactional email provider is temporarily unavailable.
    order.emailDelivery = {
      status: 'failed',
      attempts: previousAttempts + 1,
      lastAttemptAt: attemptedAt,
      message: String(error?.message || 'Purchase email delivery failed.').slice(0, 240),
    };
    try {
      await FirebaseRtdb.saveGlobalOrder(order);
    } catch {
      // The payment callback must not be converted into a failure here.
    }
  }
};

// Shared server-side verification and synchronization helper
async function verifyAndSyncEasebuzzOrder(
  orderIdOrTxnId: string,
  source = 'EASEBUZZ_RECONCILE',
): Promise<{ success: boolean; status?: string; message?: string; orderId?: string; retryable?: boolean }> {
  if (!EASEBUZZ_KEY || !EASEBUZZ_SALT || !EASEBUZZ_ENV_VALID) {
    return { success: false, message: 'Easebuzz payment gateway is not configured yet.' };
  }

  const globalOrder = await FirebaseRtdb.getGlobalOrder(orderIdOrTxnId);
  if (!globalOrder) {
    return { success: false, message: 'Order not found' };
  }

  if (['REFUNDED', 'REVOKED', 'CANCELLED'].includes(String(globalOrder.status).toUpperCase()) ||
      globalOrder.deliveryStatus === 'REVOKED') {
    return { success: false, status: 'REVOKED', orderId: globalOrder.id, message: 'Order access has been revoked.' };
  }

  if (String(globalOrder.paymentStatus).toUpperCase() === 'PAID') {
    if (globalOrder.paymentProvider !== 'Easebuzz' || !globalOrder.transactionId) {
      return { success: false, status: 'PENDING', orderId: globalOrder.id, message: 'Payment must be verified with Easebuzz.' };
    }
    const needsInvoiceMetadata = !globalOrder.invoiceNumber || !globalOrder.paymentVerifiedAt;
    globalOrder.invoiceNumber ||= `INV-${globalOrder.id}`;
    globalOrder.paymentVerifiedAt ||= globalOrder.updatedAt || new Date().toISOString();
    if (needsInvoiceMetadata) {
      await FirebaseRtdb.saveGlobalOrder(globalOrder);
    }
    try {
      await fulfillPaidOrder(globalOrder);
      await sendPurchaseEmailSafely(globalOrder);
    } catch (error) {
      console.error('Paid order fulfillment needs retry:', globalOrder.id, error);
    }
    return { success: true, status: 'PAID', orderId: globalOrder.id,
      message: globalOrder.deliveryStatus === 'DELIVERED' ? 'Payment confirmed.' : 'Payment confirmed. Delivery is still being prepared.' };
  }

  // Initiation stores the gateway txnid on the pending order. It can differ
  // from the customer-facing order number.
  const txnid = globalOrder.easebuzzTxnId || globalOrder.transactionId || globalOrder.orderNumber || globalOrder.id;
  const transHash = easebuzzRetrieveHash(EASEBUZZ_KEY, txnid, EASEBUZZ_SALT);

  const transFormData = new URLSearchParams();
  transFormData.append('key', EASEBUZZ_KEY);
  transFormData.append('txnid', txnid);
  transFormData.append('hash', transHash);

  let verifyRes: globalThis.Response;
  try {
    verifyRes = await fetch(`${EASEBUZZ_DASHBOARD_URL}/transaction/v2/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: transFormData.toString(),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return { success: false, status: 'PENDING', orderId: globalOrder.id, retryable: true, message: 'Payment gateway verification is unavailable. Please retry.' };
  }

  if (!verifyRes.ok) {
    return { success: false, status: 'PENDING', orderId: globalOrder.id, retryable: true, message: 'Payment gateway verification is unavailable. Please retry.' };
  }
  let verifyData: any;
  try {
    verifyData = await verifyRes.json();
  } catch {
    return { success: false, status: 'PENDING', orderId: globalOrder.id, retryable: true, message: 'Payment gateway response could not be verified. Please retry.' };
  }
  const payment = verifyData?.data;
  if (Number(verifyData?.status) !== 1 || !matchesEasebuzzPaymentIdentity(payment, globalOrder, EASEBUZZ_KEY)) {
    return { success: false, status: 'PENDING', orderId: globalOrder.id, message: 'Payment has not been verified for this order.' };
  }
  const gatewayStatus = String(payment.status || '').toLowerCase();
  if (['failure', 'failed', 'usercancelled', 'cancelled'].includes(gatewayStatus)) {
    // A callback can race with a successful webhook. Never report failure
    // after a different handler has already stored a verified paid order.
    const latestOrder = await FirebaseRtdb.getGlobalOrder(globalOrder.id);
    if (latestOrder?.paymentStatus === 'PAID' && latestOrder.paymentProvider === 'Easebuzz' && latestOrder.transactionId) {
      return verifyAndSyncEasebuzzOrder(globalOrder.id, source);
    }
    return { success: false, status: 'FAILED', orderId: globalOrder.id, message: 'Easebuzz reported that this payment failed.' };
  }
  if (!matchesVerifiedEasebuzzPayment(payment, globalOrder, EASEBUZZ_KEY)) {
    return { success: false, status: 'PENDING', orderId: globalOrder.id, message: 'Payment is still pending at Easebuzz.' };
  }

  const easebuzzId = payment.easepayid || payment.transaction_id || txnid;
  const expectedAmount = Number(globalOrder.total).toFixed(2);
  const now = new Date().toISOString();
  globalOrder.status = 'PAID';
  globalOrder.paymentStatus = 'PAID';
  globalOrder.orderStatus = 'PAID';
  globalOrder.deliveryStatus = 'PENDING';
  globalOrder.downloadStatus = 'UNAVAILABLE';
  globalOrder.paymentVerifiedAt = now;
  globalOrder.invoiceNumber = globalOrder.invoiceNumber || `INV-${globalOrder.id}`;
  globalOrder.transactionId = easebuzzId;
  globalOrder.paymentId = easebuzzId;
  globalOrder.paymentProvider = 'Easebuzz';
  globalOrder.updatedAt = now;

  // Save to BOTH global and user orders via saveGlobalOrder
  await FirebaseRtdb.saveGlobalOrder(globalOrder);

  // Record the gateway result before provisioning. A retry can recover a paid
  // order even when a later Firebase, file or email operation fails.
  try {
    await AuditLogger.log({
    requestId: generateRequestId(),
    userId: globalOrder.userId,
    orderId: globalOrder.id,
    eventType: 'PAYMENT_VERIFICATION_SUCCESS',
    eventStatus: 'SUCCESS',
    source,
    metadata: { easebuzzId, amount: expectedAmount },
    });
  } catch (error) {
    console.error('Payment audit log needs repair:', globalOrder.id, error);
  }

  try {
    await fulfillPaidOrder(globalOrder);
    await sendPurchaseEmailSafely(globalOrder);
  } catch (error) {
    console.error('Paid order fulfillment needs retry:', globalOrder.id, error);
  }

  return { success: true, status: 'PAID', orderId: globalOrder.id,
    message: globalOrder.deliveryStatus === 'DELIVERED' ? 'Payment confirmed.' : 'Payment confirmed. Delivery is still being prepared.' };
}

const notificationMatchesOrder = (params: any, order: any): boolean =>
  Boolean(order && params.key === EASEBUZZ_KEY && params.txnid === order.easebuzzTxnId &&
    Number.isFinite(Number(params.amount)) && Number(params.amount) === Number(order.total));

const isFailedEasebuzzStatus = (status: unknown): boolean =>
  ['failure', 'failed', 'usercancelled', 'cancelled'].includes(String(status || '').toLowerCase());

const recordPaymentNotification = async (req: Request, order: any, source: 'EASEBUZZ_CALLBACK' | 'EASEBUZZ_WEBHOOK') => {
  try {
    await AuditLogger.log({
      requestId: generateRequestId(), userId: order.userId, orderId: order.id,
      eventType: source === 'EASEBUZZ_CALLBACK' ? 'EASEBUZZ_CALLBACK_RECEIVED' : 'WEBHOOK_RECEIVED',
      eventStatus: 'PENDING', source,
      metadata: { txnid: req.body.txnid, gatewayStatus: String(req.body.status || '').slice(0, 40) },
      ip: getPaymentRequestIp(req), userAgent: req.headers['user-agent'],
    });
  } catch (error) {
    console.error('Payment notification audit could not be saved:', order.id, error);
  }
};

app.post('/api/payments/easebuzz/callback', async (req: Request, res: Response) => {
  try {
    if (!EASEBUZZ_KEY || !EASEBUZZ_SALT || !EASEBUZZ_ENV_VALID) {
      return res.status(503).send('Easebuzz payment gateway is not configured yet.');
    }

    const params = req.body;
    if (!params || typeof params.txnid !== 'string' || typeof params.status !== 'string' ||
        !verifyEasebuzzCallbackHash(params, EASEBUZZ_SALT)) {
      return res.status(400).send('Invalid signature');
    }

    const txnid = params.txnid;
    const globalOrder = await FirebaseRtdb.getGlobalOrder(txnid);
    if (!notificationMatchesOrder(params, globalOrder)) {
      return res.status(400).send('Payment notification does not match an order');
    }

    const baseAppUrl = getHostUrl(req);
    await recordPaymentNotification(req, globalOrder, 'EASEBUZZ_CALLBACK');
    const syncResult = await verifyAndSyncEasebuzzOrder(txnid, 'EASEBUZZ_CALLBACK');
    if (syncResult.success) {
      return res.redirect(`${baseAppUrl}/checkout?status=success&orderId=${globalOrder.id}`);
    }
    if (syncResult.status === 'FAILED' || isFailedEasebuzzStatus(params.status)) {
      return res.redirect(`${baseAppUrl}/checkout?status=failed&orderId=${globalOrder.id}`);
    }
    return res.redirect(`${baseAppUrl}/checkout?status=pending&orderId=${globalOrder.id}`);
  } catch (err: any) {
    res.status(500).send('Internal server error');
  }
});

// Optional gateway notification. The browser callback and authenticated
// reconciliation paths remain independent safety nets.
app.post('/api/payments/easebuzz/webhook', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  try {
    if (!EASEBUZZ_KEY || !EASEBUZZ_SALT || !EASEBUZZ_ENV_VALID) {
      return res.status(503).json({ success: false, message: 'Payment gateway is not configured.' });
    }

    const params = req.body;
    if (!params || typeof params !== 'object' ||
        typeof params.txnid !== 'string' || typeof params.key !== 'string' ||
        params.key !== EASEBUZZ_KEY || !verifyEasebuzzCallbackHash(params, EASEBUZZ_SALT)) {
      return res.status(400).json({ success: false, message: 'Invalid payment notification.' });
    }

    const order = await FirebaseRtdb.getGlobalOrder(params.txnid);
    if (!notificationMatchesOrder(params, order)) {
      return res.status(400).json({ success: false, message: 'Payment notification does not match an order.' });
    }

    await recordPaymentNotification(req, order, 'EASEBUZZ_WEBHOOK');
    // Success and failure reports use the same authoritative retrieval path.
    const result = await verifyAndSyncEasebuzzOrder(order.id, 'EASEBUZZ_WEBHOOK');
    if (result.retryable) {
      return res.status(503).json({ success: false, status: 'PENDING' });
    }
    return res.json({ success: true, status: result.status || 'PENDING' });
  } catch (error) {
    console.error('Easebuzz webhook processing failed:', error);
    return res.status(503).json({ success: false, message: 'Payment notification could not be processed.' });
  }
});

// Reconcile Safety Net endpoint (Admin, owning user, or CRON_SECRET header)
app.post('/api/payments/easebuzz/reconcile/:orderId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const cronHeader = req.headers['x-cron-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    const isCron = cronHeader && CRON_SECRET && cronHeader === CRON_SECRET;

    if (!isCron) {
      const sid = req.cookies?.sid;
      if (!sid) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      const payload = await AuthServiceServer.verifyOpaqueSession(sid);
      if (!payload || !payload.userId) {
        return res.status(401).json({ success: false, message: 'Invalid session.' });
      }
      const order = await FirebaseRtdb.getGlobalOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }
      const profile = await FirebaseRtdb.getUserProfile(payload.userId);
      const isAdmin = profile && profile.role === 'admin';
      if (!isAdmin && order.userId !== payload.userId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const result = await verifyAndSyncEasebuzzOrder(orderId);
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Reconciliation failed.' });
  }
});

// Vercel Cron invokes GET with Authorization: Bearer <CRON_SECRET>.
const reconcileCron = async (req: Request, res: Response) => {
  try {
    const cronHeader = req.headers['x-cron-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!CRON_SECRET || cronHeader !== CRON_SECRET) {
      return res.status(403).json({ success: false, message: 'Unauthorized cron request.' });
    }

    const allOrders = await FirebaseRtdb.getAllGlobalOrders();
    const tenMinsAgo = Date.now() - 10 * 60 * 1000;
    const reconciliationOrders = allOrders.filter((order) => {
      const paymentStatus = String(order.paymentStatus).toUpperCase();
      const isStuckPayment = Boolean(order.easebuzzTxnId) && (
        order.status === 'PENDING_PAYMENT' || paymentStatus === 'PENDING'
      ) && new Date(order.updatedAt || order.createdAt || order.date || 0).getTime() < tenMinsAgo;
      const lastEmailAttempt = new Date(order.emailDelivery?.lastAttemptAt || 0).getTime();
      const needsEmailRetry = (
        paymentStatus === 'PAID' &&
        (order.emailDelivery?.status !== 'sent' || !order.fulfilledAt || !order.deliveredAt) &&
        lastEmailAttempt < tenMinsAgo
      );
      return isStuckPayment || needsEmailRetry;
    }).slice(0, 20);

    const results = [];
    for (const ord of reconciliationOrders) {
      const resSync = await verifyAndSyncEasebuzzOrder(ord.id);
      results.push({ orderId: ord.id, ...resSync });
    }

    res.json({ success: true, reconciledCount: results.length, results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Cron reconciliation failed.' });
  }
};
app.get('/api/payments/easebuzz/reconcile-cron', reconcileCron);
app.post('/api/payments/easebuzz/reconcile-cron', reconcileCron);

// ============================================
// SECURE DOWNLOAD TOKENS & STREAMING (RTDB ONLY)
// ============================================
app.post('/api/downloads/:productId/token', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const productId = req.params.productId;
    const requestedOrderId = typeof req.body?.orderId === 'string' ? req.body.orderId : undefined;
    const purchase = await findPaidPurchase(userId, productId, undefined, requestedOrderId);

    if (!purchase) {
      return res.status(403).json({ success: false, message: 'Active purchase access not found for this product.' });
    }

    if (purchase.downloadCount >= (purchase.downloadLimit || 10)) {
      return res.status(403).json({ success: false, message: 'Download limit has been reached for this purchase.' });
    }

    const tokenId = `DL-TOK-${crypto.randomBytes(24).toString('base64url')}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const tokenData = {
      tokenId,
      userId,
      productId,
      productTitle: purchase.productName || 'Digital Product',
      orderId: purchase.orderId,
      purchaseId: purchase.purchaseId,
      expiresAt,
      used: false,
    };

    await FirebaseRtdb.set(`downloadTokens/${tokenId}`, tokenData);

    res.json({
      success: true,
      token: tokenId,
      expiresAt,
      downloadUrl: `/api/downloads/stream?token=${tokenId}`,
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate download token.' });
  }
});

app.get('/api/downloads/stream', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (typeof token !== 'string' || !/^DL-TOK-[A-Za-z0-9_-]{32}$/.test(token)) {
      return res.status(400).send('A valid download token is required.');
    }

    const tokenData = await FirebaseRtdb.get<any>(`downloadTokens/${token}`);
    if (!tokenData) {
      return res.status(403).send('Invalid download token.');
    }

    if (Date.now() > tokenData.expiresAt) {
      await FirebaseRtdb.delete(`downloadTokens/${token}`);
      return res.status(403).send('Download link has expired.');
    }

    if (tokenData.used) {
      return res.status(403).send('Download link has already been used.');
    }

    // Re-check the active purchase immediately before opening the protected file.
    const purchase = await findPaidPurchase(tokenData.userId, tokenData.productId, tokenData.purchaseId, tokenData.orderId);

    if (!purchase) {
      return res.status(403).send('Active purchase access not found for this download.');
    }

    const currentCount = purchase.downloadCount || 0;
    const limit = purchase.downloadLimit || 10;
    if (currentCount >= limit) {
      return res.status(403).send('Download limit has been reached for this purchase.');
    }

    // Open the remote object before consuming the one-time token. This avoids
    // burning a customer's token when storage is temporarily unavailable.
    const source = await SecureFileManager.openProductFile(tokenData.productId);

    tokenData.used = true;
    await FirebaseRtdb.set(`downloadTokens/${token}`, tokenData);

    purchase.downloadCount = currentCount + 1;
    await FirebaseRtdb.savePurchase(tokenData.userId, purchase.purchaseId, purchase);

    const filename = `${tokenData.productId}-package.zip`;
    SecureFileManager.streamProductFileToResponse(source, filename, res);
  } catch (err: any) {
    if (!res.headersSent) {
      const isConfigurationError = String(err?.message || '').includes('PRODUCT_DOWNLOAD_URL');
      return res
        .status(isConfigurationError ? 503 : 502)
        .send(isConfigurationError ? 'Product download is not configured yet.' : 'Product download is temporarily unavailable.');
    }
    res.destroy(err);
  }
});

app.get('/api/downloads/email', async (req: Request, res: Response) => {
  try {
    const rawToken = typeof req.query.token === 'string' ? req.query.token : '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
      return res.status(400).send('A valid email download token is required.');
    }

    const tokenHash = hashEmailDownloadToken(rawToken);
    const tokenPath = `emailDownloadTokens/${tokenHash}`;
    const tokenData = await FirebaseRtdb.get<any>(tokenPath);
    if (!tokenData) {
      return res.status(403).send('Invalid download link.');
    }

    if (Date.now() > tokenData.expiresAt) {
      await FirebaseRtdb.delete(tokenPath);
      return res.status(403).send('Download link has expired. Sign in to your account to create a new link.');
    }

    if (tokenData.used) {
      return res.status(403).send('Download link has already been used. Sign in to your account to create a new link.');
    }

    const purchase = await findPaidPurchase(tokenData.userId, tokenData.productId, tokenData.purchaseId, tokenData.orderId);

    if (!purchase) {
      return res.status(403).send('Active purchase access not found for this download.');
    }

    const currentCount = Number(purchase.downloadCount || 0);
    const limit = Number(purchase.downloadLimit || 10);
    if (currentCount >= limit) {
      return res.status(403).send('Download limit has been reached for this purchase.');
    }

    const source = await SecureFileManager.openProductFile(tokenData.productId);

    tokenData.used = true;
    tokenData.usedAt = new Date().toISOString();
    await FirebaseRtdb.set(tokenPath, tokenData);

    purchase.downloadCount = currentCount + 1;
    await FirebaseRtdb.savePurchase(tokenData.userId, purchase.purchaseId, purchase);

    SecureFileManager.streamProductFileToResponse(source, `${tokenData.productId}-package.zip`, res);
  } catch (err: any) {
    if (!res.headersSent) {
      const isConfigurationError = String(err?.message || '').includes('PRODUCT_DOWNLOAD_URL');
      return res
        .status(isConfigurationError ? 503 : 502)
        .send(isConfigurationError ? 'Product download is not configured yet.' : 'Product download is temporarily unavailable.');
    }
    res.destroy(err);
  }
});

app.get('/api/invoices/email', async (req: Request, res: Response) => {
  try {
    const rawToken = typeof req.query.token === 'string' ? req.query.token : '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
      return res.status(400).send('A valid invoice token is required.');
    }

    const tokenHash = hashEmailDownloadToken(rawToken);
    const tokenPath = `invoiceDownloadTokens/${tokenHash}`;
    const tokenData = await FirebaseRtdb.get<any>(tokenPath);
    if (!tokenData) {
      return res.status(403).send('Invalid invoice link.');
    }

    if (Date.now() > tokenData.expiresAt) {
      await FirebaseRtdb.delete(tokenPath);
      return res.status(403).send('Invoice link has expired. Sign in to your account to view the order.');
    }

    const currentCount = Number(tokenData.downloadCount || 0);
    const limit = Number(tokenData.downloadLimit || 10);
    if (currentCount >= limit) {
      return res.status(403).send('Invoice download limit has been reached.');
    }

    const order = await FirebaseRtdb.getGlobalOrder(tokenData.orderId);
    if (
      !order || !Array.isArray(order.items) ||
      !order.items.some((item: any) => isPaidOrderForProduct(order, tokenData.userId, item.productId))
    ) {
      return res.status(403).send('Paid order not found for this invoice.');
    }

    const invoice = await buildInvoicePdf(order);
    tokenData.downloadCount = currentCount + 1;
    tokenData.lastDownloadedAt = new Date().toISOString();
    await FirebaseRtdb.set(tokenPath, tokenData);

    const orderNumber = String(order.orderNumber || order.id || 'order')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 80);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderNumber}.pdf"`);
    res.setHeader('Content-Length', invoice.length);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).send(invoice);
  } catch {
    return res.status(500).send('Invoice is temporarily unavailable.');
  }
});

// Admin Audit Logs & Analytics
app.get('/api/admin/audit-logs', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await AuditLogger.getAllLogs(100);
    res.json({ success: true, logs });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

export default app;
