import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import { AuthServiceServer } from './auth';
import { FirebaseRtdb } from './firebaseRtdb';
import { AuditLogger, generateRequestId } from './audit';
import { SecureFileManager } from './secureFiles';
import { PRODUCTS, COUPONS } from '../src/data/products';
import { adminRouter } from './adminRoutes';
import { runServerSeed } from './seed';
import { mergeProductCatalog } from './productCatalog';
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

// Run initial seed on startup
runServerSeed().catch(err => console.warn('Startup seed error:', err));

const EASEBUZZ_KEY = (process.env.EASEBUZZ_KEY || '').trim();
const EASEBUZZ_SALT = (process.env.EASEBUZZ_SALT || '').trim();
const rawEasebuzzEnv = (process.env.EASEBUZZ_ENV || 'test').trim().toLowerCase();
const EASEBUZZ_ENV: 'prod' | 'test' = rawEasebuzzEnv.startsWith('prod') ? 'prod' : 'test';
const CRON_SECRET = process.env.CRON_SECRET || '';

const EASEBUZZ_BASE_URL = EASEBUZZ_ENV === 'prod' 
  ? 'https://pay.easebuzz.in' 
  : 'https://testpay.easebuzz.in';

const getHostUrl = (req: Request): string => {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.startsWith('http')) {
    return origin.replace(/\/+$/, '');
  }
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || req.headers.host);
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
  if (host) {
    const cleanHost = String(host).split(',')[0].trim();
    return `${proto}://${cleanHost}`.replace(/\/+$/, '');
  }
  return 'https://www.ffdigital.shop';
};

const easebuzzHash = (data: string): string => {
  return crypto.createHash('sha512').update(data).digest('hex');
};

const getProductCatalog = async (): Promise<any[]> => {
  const databaseProducts = await FirebaseRtdb.getAllProducts();
  return mergeProductCatalog(PRODUCTS, databaseProducts);
};

const verifyEasebuzzHash = (params: any, salt: string): boolean => {
  if (!params || !params.hash || !salt) return false;
  const { hash, status, udf10, udf9, udf8, udf7, udf6, udf5, udf4, udf3, udf2, udf1, email, firstname, productinfo, amount, txnid, key } = params;
  const hashString = [
    salt,
    status ?? '',
    udf10 ?? '',
    udf9 ?? '',
    udf8 ?? '',
    udf7 ?? '',
    udf6 ?? '',
    udf5 ?? '',
    udf4 ?? '',
    udf3 ?? '',
    udf2 ?? '',
    udf1 ?? '',
    email ?? '',
    firstname ?? '',
    productinfo ?? '',
    amount ?? '',
    txnid ?? '',
    key ?? ''
  ].join('|');
  const calculatedHash = easebuzzHash(hashString);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(String(hash).toLowerCase()),
      Buffer.from(calculatedHash.toLowerCase())
    );
  } catch {
    return false;
  }
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
    callback(null, true);
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
    next();
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
      databaseUrl: status.url,
      connected: status.connected,
      mode: status.mode,
      error: status.error,
    },
  });
});

// Public Product API: static products and Admin/Firebase products are merged.
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, products: await getProductCatalog() });
  } catch {
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
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Password reset failed.' });
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

app.get('/api/orders/:orderId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await FirebaseRtdb.getUserOrderById(req.userId!, req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
});

// Secure Order Creation with strict validation
const handleOrderCreation = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  try {
    const userId = req.userId!;
    const { items, customer, discountCode, paymentMethod } = req.body;

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

      const quantity = parseInt(ci.quantity || 1, 10);
      if (isNaN(quantity) || quantity < 1 || quantity > 10) {
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
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
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
      customerEmail: customer?.email || req.userEmail,
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
        email: customer?.email || req.userEmail,
        phone: customer?.phone || '',
        company: customer?.company || '',
        country: customer?.country || 'India',
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

    if (!EASEBUZZ_KEY || !EASEBUZZ_SALT) {
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

    if (String(order.paymentStatus).toUpperCase() === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }

    const rawPhone = order.customer?.phone || order.customerPhone || '';
    const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required for payment.' });
    }
    const phone = cleanPhone;

    const amount = Number(order.total ?? order.amount ?? 0).toFixed(2);
    const txnid = `${order.orderNumber || 'ORD'}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 35);
    
    const rawFirstname = order.customer?.fullName || order.customerName || 'Customer';
    const firstname = String(rawFirstname).trim().split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') || 'Customer';
    
    const email = String(order.customer?.email || order.customerEmail || req.userEmail || '').trim().toLowerCase();
    const productinfo = 'FFDigital Products';

    const baseAppUrl = getHostUrl(req);
    const surl = `${baseAppUrl}/api/payments/easebuzz/callback`;
    const furl = `${baseAppUrl}/api/payments/easebuzz/callback`;

    const hashSequence = [
      EASEBUZZ_KEY,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      '', // udf1
      '', // udf2
      '', // udf3
      '', // udf4
      '', // udf5
      '', // udf6
      '', // udf7
      '', // udf8
      '', // udf9
      '', // udf10
      EASEBUZZ_SALT
    ];
    const hashString = hashSequence.join('|');
    const hash = easebuzzHash(hashString);

    const formData = new URLSearchParams();
    formData.append('key', EASEBUZZ_KEY);
    formData.append('txnid', txnid);
    formData.append('amount', amount);
    formData.append('productinfo', productinfo);
    formData.append('firstname', firstname);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('surl', surl);
    formData.append('furl', furl);
    formData.append('hash', hash);
    formData.append('udf1', '');
    formData.append('udf2', '');
    formData.append('udf3', '');
    formData.append('udf4', '');
    formData.append('udf5', '');
    formData.append('udf6', '');
    formData.append('udf7', '');

    const ebzResponse = await fetch(`${EASEBUZZ_BASE_URL}/payment/initiateLink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData.toString()
    });

    const responseText = await ebzResponse.text();
    let ebzData: any = null;
    try {
      ebzData = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ success: false, message: 'Invalid response from Easebuzz payment gateway.' });
    }

    if (ebzData && ebzData.status === 1 && ebzData.data) {
      order.transactionId = txnid;
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
      const errorMessage = typeof ebzData?.data === 'string'
        ? ebzData.data
        : (ebzData?.error_desc || ebzData?.message || 'Failed to initiate Easebuzz payment.');
      console.error('[Easebuzz Gateway Error Response]:', ebzData);
      return res.status(400).json({ success: false, message: errorMessage });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Easebuzz payment initiation failed.' });
  }
});

const isOrderFulfilled = async (order: any): Promise<boolean> => {
  if (order.fulfillmentStatus === 'READY') return true;
  if (!order.userId || !Array.isArray(order.items) || order.items.length === 0) return false;

  const purchases = await FirebaseRtdb.getUserPurchases(order.userId);
  const hasEveryEntitlement = order.items.every((item: any) => purchases.some((purchase: any) => (
    purchase.orderId === order.id &&
    purchase.productId === item.productId &&
    purchase.accessStatus === 'active'
  )));

  if (hasEveryEntitlement) {
    order.fulfillmentStatus = 'READY';
    order.fulfilledAt = order.fulfilledAt || order.updatedAt || new Date().toISOString();
    await FirebaseRtdb.saveGlobalOrder(order);
  }
  return hasEveryEntitlement;
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
async function verifyAndSyncEasebuzzOrder(orderIdOrTxnId: string): Promise<{ success: boolean; status?: string; message?: string; orderId?: string }> {
  if (!EASEBUZZ_KEY || !EASEBUZZ_SALT) {
    return { success: false, message: 'Easebuzz payment gateway is not configured yet.' };
  }

  const globalOrder = await FirebaseRtdb.getGlobalOrder(orderIdOrTxnId);
  if (!globalOrder) {
    return { success: false, message: 'Order not found' };
  }

  if (String(globalOrder.paymentStatus).toUpperCase() === 'PAID') {
    try {
      if (await isOrderFulfilled(globalOrder)) {
        await sendPurchaseEmailSafely(globalOrder);
      }
    } catch {
      // A retryable email/fulfillment lookup issue must not change a paid order
      // into a failed payment response.
    }
    return { success: true, status: 'PAID', orderId: globalOrder.id, message: 'Already paid' };
  }

  const txnid = String(globalOrder.orderNumber || globalOrder.id).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 40);
  const amount = Number(globalOrder.total || globalOrder.amount).toFixed(2);
  const email = String(globalOrder.customer?.email || globalOrder.customerEmail || '').trim().toLowerCase();
  const rawPhone = globalOrder.customer?.phone || globalOrder.customerPhone || '';
  const phone = String(rawPhone).replace(/\D/g, '').slice(-10);

  const transHashStr = [EASEBUZZ_KEY, txnid, amount, email, phone, EASEBUZZ_SALT].join('|');
  const transHash = easebuzzHash(transHashStr);

  const transFormData = new URLSearchParams();
  transFormData.append('key', EASEBUZZ_KEY);
  transFormData.append('txnid', txnid);
  transFormData.append('amount', amount);
  transFormData.append('email', email);
  transFormData.append('phone', phone);
  transFormData.append('hash', transHash);

  const verifyRes = await fetch(`${EASEBUZZ_BASE_URL}/transaction/v2.1/retrieve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: transFormData.toString()
  });

  const verifyData = await verifyRes.json();
  if (!verifyData.status || !verifyData.data || verifyData.data.status !== 'success') {
    const errorReason = verifyData.data?.error_Message || verifyData.data?.status || 'Verification failed';
    globalOrder.status = 'FAILED';
    globalOrder.paymentStatus = 'FAILED';
    globalOrder.orderStatus = 'FAILED';
    globalOrder.failureReason = errorReason;
    globalOrder.updatedAt = new Date().toISOString();
    await FirebaseRtdb.saveGlobalOrder(globalOrder);
    return { success: false, status: 'FAILED', orderId: globalOrder.id, message: errorReason };
  }

  const verifiedAmount = Number(verifyData.data.amount).toFixed(2);
  const expectedAmount = Number(globalOrder.total || globalOrder.amount).toFixed(2);
  if (verifiedAmount !== expectedAmount) {
    return { success: false, orderId: globalOrder.id, message: 'Amount mismatch during retrieval' };
  }

  const easebuzzId = verifyData.data.easepayid || verifyData.data.transaction_id || `EBZ-${Date.now()}`;
  const now = new Date().toISOString();
  const userId = globalOrder.userId;

  globalOrder.status = 'PAID';
  globalOrder.paymentStatus = 'PAID';
  globalOrder.orderStatus = 'PAID';
  globalOrder.deliveryStatus = 'DELIVERED';
  globalOrder.downloadStatus = 'AVAILABLE';
  globalOrder.transactionId = easebuzzId;
  globalOrder.paymentId = easebuzzId;
  globalOrder.paymentProvider = 'Easebuzz';
  globalOrder.updatedAt = now;

  globalOrder.items = (globalOrder.items || []).map((item: any) => ({
    ...item,
    downloadStatus: 'AVAILABLE',
  }));

  // Save to BOTH global and user orders via saveGlobalOrder
  await FirebaseRtdb.saveGlobalOrder(globalOrder);

  for (const item of globalOrder.items || []) {
    const purchaseId = `pur_${globalOrder.id}_${item.productId}`;
    const downloadId = `dl_${globalOrder.id}_${item.productId}`;

    await FirebaseRtdb.savePurchase(userId, purchaseId, {
      purchaseId, userId, orderId: globalOrder.id,
      productId: item.productId, productTitle: item.productTitle,
      purchasedAt: now, accessStatus: 'active',
      downloadLimit: 10, downloadCount: 0
    });

    await FirebaseRtdb.saveUserDownload(userId, downloadId, {
      id: downloadId, downloadId, orderId: globalOrder.id,
      productId: item.productId, productTitle: item.productTitle,
      status: 'AVAILABLE', createdAt: now,
      downloadUrl: item.downloadUrl, fileSize: item.fileSize,
      fileFormat: item.fileFormat
    });
  }

  await FirebaseRtdb.setUserCart(userId, []);

  globalOrder.fulfillmentStatus = 'READY';
  globalOrder.fulfilledAt = now;
  await FirebaseRtdb.saveGlobalOrder(globalOrder);

  await AuditLogger.log({
    requestId: generateRequestId(),
    userId,
    orderId: globalOrder.id,
    eventType: 'PAYMENT_VERIFICATION_SUCCESS',
    eventStatus: 'SUCCESS',
    source: 'EASEBUZZ_CALLBACK',
    metadata: { easebuzzId, amount: expectedAmount },
  });

  await sendPurchaseEmailSafely(globalOrder);

  return { success: true, status: 'PAID', orderId: globalOrder.id };
}

app.post('/api/payments/easebuzz/callback', async (req: Request, res: Response) => {
  try {
    if (!EASEBUZZ_KEY || !EASEBUZZ_SALT) {
      return res.status(503).send('Easebuzz payment gateway is not configured yet.');
    }

    const params = req.body;
    if (!verifyEasebuzzHash(params, EASEBUZZ_SALT)) {
      return res.status(400).send('Invalid signature');
    }

    const txnid = params.txnid;
    const status = params.status;

    const globalOrder = await FirebaseRtdb.getGlobalOrder(txnid);
    if (!globalOrder) {
      return res.status(404).send('Order not found');
    }

    const baseAppUrl = getHostUrl(req);
    if (status !== 'success') {
      globalOrder.status = 'FAILED';
      globalOrder.paymentStatus = 'FAILED';
      globalOrder.orderStatus = 'FAILED';
      globalOrder.failureReason = params.error_Message || 'Payment failed on gateway';
      globalOrder.updatedAt = new Date().toISOString();
      await FirebaseRtdb.saveGlobalOrder(globalOrder);
      return res.redirect(`${baseAppUrl}/checkout?status=failed&orderId=${globalOrder.id}`);
    }

    const syncResult = await verifyAndSyncEasebuzzOrder(txnid);
    if (syncResult.success) {
      return res.redirect(`${baseAppUrl}/checkout?status=success&orderId=${globalOrder.id}`);
    } else {
      return res.redirect(`${baseAppUrl}/checkout?status=failed&orderId=${globalOrder.id}`);
    }
  } catch (err: any) {
    res.status(500).send('Internal server error');
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
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Reconciliation failed.' });
  }
});

// Cron reconciliation for stuck payments and retryable purchase emails.
app.post('/api/payments/easebuzz/reconcile-cron', async (req: Request, res: Response) => {
  try {
    const cronHeader = req.headers['x-cron-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!CRON_SECRET || cronHeader !== CRON_SECRET) {
      return res.status(403).json({ success: false, message: 'Unauthorized cron request.' });
    }

    const allOrders = await FirebaseRtdb.getAllGlobalOrders();
    const tenMinsAgo = Date.now() - 10 * 60 * 1000;
    const reconciliationOrders = allOrders.filter((order) => {
      const paymentStatus = String(order.paymentStatus).toUpperCase();
      const isStuckPayment = (
        order.status === 'PENDING_PAYMENT' || paymentStatus === 'PENDING'
      ) && new Date(order.createdAt || order.date || 0).getTime() < tenMinsAgo;
      const lastEmailAttempt = new Date(order.emailDelivery?.lastAttemptAt || 0).getTime();
      const needsEmailRetry = (
        paymentStatus === 'PAID' &&
        order.emailDelivery?.status !== 'sent' &&
        lastEmailAttempt < tenMinsAgo
      );
      return isStuckPayment || needsEmailRetry;
    });

    const results = [];
    for (const ord of reconciliationOrders) {
      const resSync = await verifyAndSyncEasebuzzOrder(ord.id);
      results.push({ orderId: ord.id, ...resSync });
    }

    res.json({ success: true, reconciledCount: results.length, results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Cron reconciliation failed.' });
  }
});

// ============================================
// SECURE DOWNLOAD TOKENS & STREAMING (RTDB ONLY)
// ============================================
app.post('/api/downloads/:productId/token', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const productId = req.params.productId;
    const purchases = await FirebaseRtdb.getUserPurchases(userId);
    const purchase = purchases.find((p: any) => p.productId === productId && p.accessStatus === 'active');

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
    if (!token) {
      return res.status(400).send('Download token is required.');
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
    const purchases = await FirebaseRtdb.getUserPurchases(tokenData.userId);
    const purchase = purchases.find(
      (p: any) =>
        (p.purchaseId === tokenData.purchaseId || p.productId === tokenData.productId) &&
        p.accessStatus === 'active'
    );

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

    const purchases = await FirebaseRtdb.getUserPurchases(tokenData.userId);
    const purchase = purchases.find((candidate: any) => (
      candidate.purchaseId === tokenData.purchaseId &&
      candidate.orderId === tokenData.orderId &&
      candidate.productId === tokenData.productId &&
      candidate.accessStatus === 'active'
    ));

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
      !order ||
      order.userId !== tokenData.userId ||
      String(order.paymentStatus).toUpperCase() !== 'PAID'
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
