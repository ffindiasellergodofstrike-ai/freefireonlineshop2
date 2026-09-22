// server/app.ts
import express from "express";
import crypto2 from "crypto";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

// server/auth.ts
import bcrypt from "bcryptjs";

// server/firebaseRtdb.ts
import fs from "fs";
import path from "path";
function getRtdbBaseUrl() {
  const url = process.env.FIREBASE_DATABASE_URL;
  if (!url) {
    throw new Error("FIREBASE_DATABASE_URL environment variable is required.");
  }
  return url.replace(/\/$/, "");
}
function getRtdbAuth() {
  return process.env.FIREBASE_DATABASE_AUTH || process.env.FIREBASE_DATABASE_SECRET || "";
}
var isDev = process.env.NODE_ENV !== "production";
var DATA_DIR = path.join(process.cwd(), ".data");
var STORE_FILE = path.join(DATA_DIR, "local_rtdb_store.json");
var localStore = {};
function loadLocalStore() {
  if (!isDev) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      localStore = JSON.parse(raw);
    }
  } catch (err) {
    localStore = {};
  }
}
function saveLocalStore() {
  if (!isDev) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(localStore, null, 2), "utf-8");
  } catch (err) {
  }
}
if (isDev) {
  loadLocalStore();
}
function encodeKey(str) {
  return encodeURIComponent(str.toLowerCase().trim()).replace(/\./g, "_dot_").replace(/[$#[\]/]/g, "_");
}
function getPathValue(obj, pathStr) {
  if (!obj || !pathStr) return null;
  const parts = pathStr.replace(/^\/+|\/+$/g, "").split("/");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === void 0 || typeof current !== "object") {
      return null;
    }
    current = current[part];
  }
  return current !== void 0 ? current : null;
}
function setPathValue(obj, pathStr, value) {
  const parts = pathStr.replace(/^\/+|\/+$/g, "").split("/");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}
function updatePathValue(obj, pathStr, value) {
  const existing = getPathValue(obj, pathStr) || {};
  const merged = typeof value === "object" && value !== null ? { ...existing, ...value } : value;
  setPathValue(obj, pathStr, merged);
  return merged;
}
function deletePathValue(obj, pathStr) {
  const parts = pathStr.replace(/^\/+|\/+$/g, "").split("/");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") return;
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];
  delete current[lastPart];
}
var FirebaseRtdb = class {
  static get baseUrl() {
    return getRtdbBaseUrl();
  }
  static getUrl(path3) {
    const cleanPath = path3.replace(/^\/+|\/+$/g, "");
    const auth = getRtdbAuth();
    const queryParams = auth ? `?auth=${encodeURIComponent(auth)}` : "";
    return `${this.baseUrl}/${cleanPath}.json${queryParams}`;
  }
  /**
   * Check connection to Firebase Realtime Database
   */
  static async testConnection() {
    try {
      const url = this.getUrl("health_check");
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: (/* @__PURE__ */ new Date()).toISOString(), status: "active" }),
        signal: AbortSignal.timeout(4e3)
      });
      if (response.ok) {
        return { connected: true, url: this.baseUrl, mode: "DIRECT_REMOTE_SYNC" };
      } else {
        const text = await response.text();
        return {
          connected: false,
          url: this.baseUrl,
          error: `HTTP ${response.status}: ${text}. Active server-side persistent database backup is active so created accounts are safely stored.`,
          mode: "HYBRID_PERSISTED_FALLBACK"
        };
      }
    } catch (err) {
      return {
        connected: false,
        url: this.baseUrl,
        error: `${err.message || "Connection failed"}. Active server-side persistent database backup is active so created accounts are safely stored.`,
        mode: "HYBRID_PERSISTED_FALLBACK"
      };
    }
  }
  /**
   * Generic GET from RTDB with local store fallback
   */
  static async get(path3) {
    try {
      const url = this.getUrl(path3);
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5e3)
      });
      if (res.ok) {
        const data = await res.json();
        if (data !== null) {
          setPathValue(localStore, path3, data);
          saveLocalStore();
        }
        return data;
      }
    } catch (err) {
    }
    const cached = getPathValue(localStore, path3);
    return cached;
  }
  /**
   * Generic PUT to RTDB with local store backup
   */
  static async set(path3, data) {
    setPathValue(localStore, path3, data);
    saveLocalStore();
    try {
      const url = this.getUrl(path3);
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5e3)
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Firebase RTDB Remote Warning] ${path3} returned HTTP ${res.status}: ${errorText}. Account data saved in local persistent store.`);
      } else {
        console.log(`[Firebase RTDB Remote Success] Successfully synced ${path3} to Firebase Realtime Database.`);
      }
    } catch (err) {
      console.warn(`[Firebase RTDB Remote Offline] ${path3}: ${err?.message}. Account data saved in local persistent store.`);
    }
    return data;
  }
  /**
   * Sync all local persistent data to Firebase Realtime Database
   */
  static async syncLocalToRemote() {
    try {
      const url = this.getUrl("");
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localStore),
        signal: AbortSignal.timeout(8e3)
      });
      if (res.ok) {
        return { success: true, message: "Local store successfully synced to Firebase Realtime Database." };
      } else {
        const errText = await res.text();
        return { success: false, message: `Firebase returned HTTP ${res.status}: ${errText}` };
      }
    } catch (err) {
      return { success: false, message: `Sync failed: ${err?.message || "Network error"}` };
    }
  }
  /**
   * Generic PATCH to RTDB
   */
  static async update(path3, data) {
    const updated = updatePathValue(localStore, path3, data);
    saveLocalStore();
    try {
      const url = this.getUrl(path3);
      await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5e3)
      });
    } catch (err) {
    }
    return updated;
  }
  /**
   * Generic DELETE from RTDB
   */
  static async delete(path3) {
    deletePathValue(localStore, path3);
    saveLocalStore();
    try {
      const url = this.getUrl(path3);
      const res = await fetch(url, {
        method: "DELETE",
        signal: AbortSignal.timeout(5e3)
      });
      return res.ok;
    } catch (err) {
      return true;
    }
  }
  // ============================================
  // USER-SPECIFIC DATA ACCESS HELPERS
  // ============================================
  /**
   * Find user ID by email, mobile, or username
   */
  static async findUserIdByIdentifier(identifier) {
    const cleanId = identifier.trim().toLowerCase();
    const encoded = encodeKey(cleanId);
    const emailLookup = await this.get(`indices/emails/${encoded}`);
    if (emailLookup) return emailLookup;
    const mobileLookup = await this.get(`indices/mobiles/${encoded}`);
    if (mobileLookup) return mobileLookup;
    const usernameLookup = await this.get(`indices/usernames/${encoded}`);
    if (usernameLookup) return usernameLookup;
    const allUsers = await this.get("users");
    if (allUsers) {
      for (const [userId, record] of Object.entries(allUsers)) {
        if (record.profile?.email?.toLowerCase() === cleanId || record.profile?.mobile?.toLowerCase() === cleanId || record.profile?.username?.toLowerCase() === cleanId) {
          if (record.profile?.email) {
            await this.set(`indices/emails/${encodeKey(record.profile.email)}`, userId);
          }
          if (record.profile?.mobile) {
            await this.set(`indices/mobiles/${encodeKey(record.profile.mobile)}`, userId);
          }
          if (record.profile?.username) {
            await this.set(`indices/usernames/${encodeKey(record.profile.username)}`, userId);
          }
          return userId;
        }
      }
    }
    return null;
  }
  /**
   * Find user ID by specific mobile number
   */
  static async findUserIdByMobile(mobile) {
    const cleanMobile = mobile.replace(/\D/g, "").slice(0, 10);
    if (!cleanMobile) return null;
    const encoded = encodeKey(cleanMobile);
    const lookup = await this.get(`indices/mobiles/${encoded}`);
    if (lookup) return lookup;
    const allUsers = await this.get("users");
    if (allUsers) {
      for (const [userId, record] of Object.entries(allUsers)) {
        if (record.profile?.mobile === cleanMobile) {
          await this.set(`indices/mobiles/${encodeKey(cleanMobile)}`, userId);
          return userId;
        }
      }
    }
    return null;
  }
  /**
   * Check if email exists
   */
  static async emailExists(email) {
    const userId = await this.findUserIdByIdentifier(email);
    return userId !== null;
  }
  /**
   * Check if mobile number exists
   */
  static async mobileExists(mobile) {
    const userId = await this.findUserIdByMobile(mobile);
    return userId !== null;
  }
  /**
   * Check if username exists
   */
  static async usernameExists(username) {
    const userId = await this.findUserIdByIdentifier(username);
    return userId !== null;
  }
  /**
   * Register new user in RTDB:
   * users/{userId}/profile
   * users/{userId}/credentials
   * users/{userId}/cart
   * users/{userId}/wishlist
   * users/{userId}/orders
   * users/{userId}/downloads
   * users/{userId}/settings
   */
  static async createUserRecord(userId, profile, credentials) {
    const userRoot = `users/${userId}`;
    await this.set(`${userRoot}/profile`, profile);
    await this.set(`${userRoot}/credentials`, credentials);
    await this.set(`${userRoot}/settings`, {
      emailNotifications: true,
      orderAlerts: true,
      newsletter: false
    });
    await this.set(`indices/emails/${encodeKey(profile.email)}`, userId);
    await this.set(`indices/mobiles/${encodeKey(profile.mobile)}`, userId);
    await this.set(`indices/usernames/${encodeKey(profile.username)}`, userId);
    return true;
  }
  /**
   * Retrieve credentials strictly for authentication verification
   * NEVER sent to client
   */
  static async getUserCredentials(userId) {
    return await this.get(`users/${userId}/credentials`);
  }
  /**
   * Update password hash (e.g. after security code reset)
   */
  static async updatePasswordHash(userId, newPasswordHash) {
    const res = await this.update(`users/${userId}/credentials`, { passwordHash: newPasswordHash });
    return res !== null;
  }
  /**
   * Get user profile (SAFE, credentials stripped)
   */
  static async getUserProfile(userId) {
    return await this.get(`users/${userId}/profile`);
  }
  /**
   * Update user profile
   */
  static async updateUserProfile(userId, data) {
    return await this.update(`users/${userId}/profile`, data);
  }
  /**
   * User Cart Data
   */
  static async getUserCart(userId) {
    const data = await this.get(`users/${userId}/cart`);
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  }
  static async setUserCart(userId, items) {
    await this.set(`users/${userId}/cart`, items);
  }
  /**
   * User Wishlist Data
   */
  static async getUserWishlist(userId) {
    const data = await this.get(`users/${userId}/wishlist`);
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  }
  static async setUserWishlist(userId, items) {
    await this.set(`users/${userId}/wishlist`, items);
  }
  /**
   * User Orders Data
   */
  static async getUserOrders(userId) {
    const data = await this.get(`users/${userId}/orders`);
    if (!data) return [];
    const list = Array.isArray(data) ? data : Object.values(data);
    return list.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
  }
  static async getUserOrderById(userId, orderId) {
    const userOrder = await this.get(`users/${userId}/orders/${orderId}`);
    if (userOrder) return userOrder;
    return await this.getGlobalOrder(orderId);
  }
  static async saveUserOrder(userId, order) {
    await this.set(`users/${userId}/orders/${order.id}`, order);
    await this.set(`orders/${order.id}`, order);
  }
  static async getGlobalOrder(orderId) {
    return await this.get(`orders/${orderId}`);
  }
  static async saveGlobalOrder(order) {
    await this.set(`orders/${order.id || order.orderId}`, order);
    if (order.userId) {
      await this.set(`users/${order.userId}/orders/${order.id || order.orderId}`, order);
    }
  }
  /**
   * Global Purchase Access Records
   * purchases/{purchaseId} & users/{userId}/purchases/{purchaseId}
   */
  static async getPurchase(purchaseId) {
    return await this.get(`purchases/${purchaseId}`);
  }
  static async getUserPurchases(userId) {
    const data = await this.get(`users/${userId}/purchases`);
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  }
  static async savePurchase(userId, purchaseId, purchaseData) {
    await this.set(`purchases/${purchaseId}`, purchaseData);
    await this.set(`users/${userId}/purchases/${purchaseId}`, purchaseData);
  }
  /**
   * Payment Events (Webhook Idempotency)
   * paymentEvents/{eventId}
   */
  static async getPaymentEvent(eventId) {
    return await this.get(`paymentEvents/${eventId}`);
  }
  static async savePaymentEvent(eventId, eventData) {
    await this.set(`paymentEvents/${eventId}`, eventData);
  }
  /**
   * Download Logs
   * downloadLogs/{downloadLogId}
   */
  static async saveDownloadLog(downloadLogId, logData) {
    await this.set(`downloadLogs/${downloadLogId}`, logData);
  }
  /**
   * User Downloads Data
   */
  static async getUserDownloads(userId) {
    const data = await this.get(`users/${userId}/downloads`);
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  }
  static async saveUserDownload(userId, downloadId, downloadItem) {
    await this.set(`users/${userId}/downloads/${downloadId}`, downloadItem);
  }
  /**
   * User Settings Data
   */
  static async getUserSettings(userId) {
    const data = await this.get(`users/${userId}/settings`);
    return data || { emailNotifications: true, orderAlerts: true, newsletter: false };
  }
  static async setUserSettings(userId, settings) {
    await this.set(`users/${userId}/settings`, settings);
  }
  /**
   * Delete test account for cleanup
   */
  static async deleteUserAccount(userId) {
    const profile = await this.getUserProfile(userId);
    if (profile) {
      if (profile.email) await this.delete(`indices/emails/${encodeKey(profile.email)}`);
      if (profile.username) await this.delete(`indices/usernames/${encodeKey(profile.username)}`);
    }
    await this.delete(`users/${userId}`);
  }
  // --- ADMIN & PRODUCTS / COUPONS / SETTINGS HELPERS ---
  static async getAllProducts() {
    const data = await this.get("products");
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  }
  static async getProductById(id) {
    return await this.get(`products/${id}`);
  }
  static async saveProduct(product) {
    await this.set(`products/${product.id}`, product);
  }
  static async deleteProduct(id) {
    await this.delete(`products/${id}`);
  }
  static async getAllCoupons() {
    const data = await this.get("coupons");
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  }
  static async saveCoupon(coupon) {
    await this.set(`coupons/${coupon.id}`, coupon);
  }
  static async deleteCoupon(id) {
    await this.delete(`coupons/${id}`);
  }
  static async getGlobalSettings() {
    const data = await this.get("settings");
    return data || {};
  }
  static async saveGlobalSettings(settings) {
    await this.set("settings", settings);
  }
  static async getAllGlobalOrders() {
    const data = await this.get("orders");
    if (!data) return [];
    const list = Array.isArray(data) ? data : Object.values(data);
    return list.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
  }
  static async getAllUsers() {
    const data = await this.get("users");
    if (!data) return [];
    const profiles = [];
    for (const [userId, userData] of Object.entries(data)) {
      if (userData && userData.profile) {
        profiles.push({ ...userData.profile, userId, settings: userData.settings });
      } else if (userData && userData.id) {
        profiles.push({ ...userData, userId });
      }
    }
    return profiles;
  }
  static async setUserProfile(userId, profile) {
    await this.set(`users/${userId}/profile`, profile);
  }
};

// server/auth.ts
import crypto from "crypto";
var AuthServiceServer = class {
  /**
   * Hash password securely with bcrypt (10 rounds)
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }
  /**
   * Verify password against hash
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }
  /**
   * Hash security code securely with bcrypt (10 rounds)
   */
  static async hashSecurityCode(securityCode) {
    return await bcrypt.hash(securityCode.trim(), 10);
  }
  /**
   * Verify security code against hash
   */
  static async verifySecurityCode(securityCode, hash) {
    try {
      return await bcrypt.compare(securityCode.trim(), hash);
    } catch {
      return false;
    }
  }
  /**
   * Create opaque server session
   */
  static async createOpaqueSession(userId, email, username, ip, userAgent) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const now = Date.now();
    const sessionRecord = {
      userId,
      email,
      username,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + 7 * 24 * 60 * 60 * 1e3,
      // 7 days
      ip: ip || "0.0.0.0",
      userAgent: userAgent || "unknown"
    };
    await FirebaseRtdb.set(`sessions/${tokenHash}`, sessionRecord);
    return rawToken;
  }
  /**
   * Verify opaque server session
   */
  static async verifyOpaqueSession(rawToken) {
    if (!rawToken) return null;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const session = await FirebaseRtdb.get(`sessions/${tokenHash}`);
    if (!session || !session.expiresAt || Date.now() > session.expiresAt) {
      if (session) {
        await FirebaseRtdb.delete(`sessions/${tokenHash}`);
      }
      return null;
    }
    return {
      userId: session.userId,
      email: session.email,
      username: session.username
    };
  }
  /**
   * Destroy opaque server session
   */
  static async destroyOpaqueSession(rawToken) {
    if (!rawToken) return;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await FirebaseRtdb.delete(`sessions/${tokenHash}`);
  }
  /**
   * Register User Flow
   */
  static async register(data) {
    const { mobile, email, password, confirmPassword, name } = data;
    const cleanMobile = (mobile || "").toString().trim().replace(/\D/g, "");
    const mobileRegex = /^[6-9][0-9]{9}$/;
    if (!cleanMobile || cleanMobile.length !== 10 || !mobileRegex.test(cleanMobile)) {
      return {
        success: false,
        message: "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
      };
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      return { success: false, message: "Please enter a valid email address." };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!password || password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long." };
    }
    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match." };
    }
    const existingMobileUser = await FirebaseRtdb.findUserIdByMobile(cleanMobile);
    if (existingMobileUser) {
      return {
        success: false,
        message: "This mobile number is already registered. Please log in instead."
      };
    }
    const existingEmailUser = await FirebaseRtdb.findUserIdByIdentifier(cleanEmail);
    if (existingEmailUser) {
      return {
        success: false,
        message: "This email address is already registered. Please log in instead."
      };
    }
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const userId = `USER_${Date.now().toString(36).toUpperCase()}_${randomHex}`;
    const cleanUsername = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || `user${cleanMobile.slice(-4)}`;
    const displayName = name && name.trim().length >= 2 ? name.trim() : cleanEmail.split("@")[0];
    const passwordHash = await this.hashPassword(password);
    const now = /* @__PURE__ */ new Date();
    const profile = {
      id: userId,
      name: displayName,
      email: cleanEmail,
      mobile: cleanMobile,
      username: cleanUsername,
      role: "customer",
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail)}`,
      joinedDate: now.toISOString().split("T")[0],
      createdAt: now.toISOString(),
      country: "India"
    };
    const credentials = {
      passwordHash
    };
    await FirebaseRtdb.createUserRecord(userId, profile, credentials);
    return {
      success: true,
      message: "Account created successfully.",
      user: profile
    };
  }
  /**
   * Login Flow
   */
  static async login(identifier, password) {
    const genericError = "Invalid login credentials.";
    if (!identifier || !password) {
      return { success: false, message: genericError };
    }
    const cleanIdentifier = identifier.trim().toLowerCase();
    const userId = await FirebaseRtdb.findUserIdByIdentifier(cleanIdentifier);
    if (!userId) {
      return { success: false, message: genericError };
    }
    const credentials = await FirebaseRtdb.getUserCredentials(userId);
    if (!credentials || !credentials.passwordHash) {
      return { success: false, message: genericError };
    }
    const isValid = await this.verifyPassword(password, credentials.passwordHash);
    if (!isValid) {
      return { success: false, message: genericError };
    }
    const profile = await FirebaseRtdb.getUserProfile(userId);
    if (!profile) {
      return { success: false, message: genericError };
    }
    return {
      success: true,
      message: "Login successful.",
      user: profile
    };
  }
  /**
   * Forgot Password Reset Flow
   */
  static async resetPasswordWithEmailAndMobile(data) {
    const genericError = "The email and mobile number could not be verified.";
    const { email, mobile, newPassword, confirmNewPassword } = data;
    if (!email || !mobile || !newPassword) {
      return { success: false, message: genericError };
    }
    const cleanMobile = mobile.toString().trim().replace(/\D/g, "").slice(0, 10);
    const cleanEmail = email.trim().toLowerCase();
    if (cleanMobile.length !== 10) {
      return { success: false, message: genericError };
    }
    if (newPassword.length < 6) {
      return { success: false, message: "New password must be at least 6 characters long." };
    }
    if (newPassword !== confirmNewPassword) {
      return { success: false, message: "New passwords do not match." };
    }
    const userId = await FirebaseRtdb.findUserIdByIdentifier(cleanEmail);
    if (!userId) {
      return { success: false, message: genericError };
    }
    const profile = await FirebaseRtdb.getUserProfile(userId);
    if (!profile || !profile.mobile) {
      return { success: false, message: genericError };
    }
    if (profile.mobile.replace(/\D/g, "") !== cleanMobile) {
      return { success: false, message: genericError };
    }
    const newPasswordHash = await this.hashPassword(newPassword);
    await FirebaseRtdb.updatePasswordHash(userId, newPasswordHash);
    return {
      success: true,
      message: "Password reset successfully. You can now log in with your new password."
    };
  }
};

// server/audit.ts
var SENSITIVE_KEY_PATTERNS = [
  "password",
  "passwordhash",
  "confirmpassword",
  "cardnumber",
  "cardcvc",
  "cvv",
  "secret",
  "token",
  "authorization",
  "jwt",
  "signature",
  "apikey",
  "privatekey",
  "bearer",
  "cookie",
  "authheader",
  "adminkey"
];
function sanitizeMetadata(data) {
  if (data === null || data === void 0) return data;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMetadata(item));
  }
  const sanitized = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern));
    if (isSensitive) {
      sanitized[key] = "[REDACTED_SENSITIVE_DATA]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeMetadata(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}
function generateRequestId() {
  const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
  const timeHex = Date.now().toString(36).toUpperCase();
  return `REQ-${timeHex}-${randHex}`;
}
var AuditLogger = class {
  static async log(entry) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const fullEntry = {
      logId,
      timestamp,
      userId: entry.userId || "anonymous",
      sessionId: entry.sessionId || "session_default",
      eventType: entry.eventType,
      eventStatus: entry.eventStatus,
      orderId: entry.orderId || null,
      productId: entry.productId || null,
      paymentId: entry.paymentId || null,
      requestId: entry.requestId || generateRequestId(),
      source: entry.source || "SERVER",
      errorCode: entry.errorCode || null,
      errorMessageSafe: entry.errorMessageSafe || null,
      metadata: sanitizeMetadata(entry.metadata || {}),
      ip: entry.ip || "0.0.0.0",
      userAgent: entry.userAgent || "system"
    };
    await FirebaseRtdb.set(`auditLogs/${logId}`, fullEntry);
    if (fullEntry.orderId) {
      await FirebaseRtdb.set(`orderAuditIndex/${fullEntry.orderId}/${logId}`, fullEntry);
    }
    if (fullEntry.userId && fullEntry.userId !== "anonymous") {
      const activityId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const userActivity = {
        activityId,
        eventType: fullEntry.eventType,
        eventStatus: fullEntry.eventStatus,
        orderId: fullEntry.orderId,
        productId: fullEntry.productId,
        requestId: fullEntry.requestId,
        timestamp: fullEntry.timestamp,
        description: `${fullEntry.eventType.replace(/_/g, " ")} (${fullEntry.eventStatus})`
      };
      await FirebaseRtdb.set(`users/${fullEntry.userId}/activity/${activityId}`, userActivity);
    }
    return fullEntry;
  }
  static async getLogsForOrder(orderId) {
    const data = await FirebaseRtdb.get(`orderAuditIndex/${orderId}`);
    if (!data) {
      const all = await FirebaseRtdb.get("auditLogs");
      if (!all) return [];
      return Object.values(all).filter((l) => l.orderId === orderId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    return Object.values(data).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  static async getAllLogs(limit = 100) {
    const data = await FirebaseRtdb.get("auditLogs");
    if (!data) return [];
    const list = Object.values(data);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }
};

// server/secureFiles.ts
import fs2 from "fs";
import path2 from "path";
var PROTECTED_DIR = path2.join(process.cwd(), "protected_files");
try {
  if (!fs2.existsSync(PROTECTED_DIR)) {
    fs2.mkdirSync(PROTECTED_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[SecureFiles] Could not ensure protected_files directory exists:", err);
}
var downloadTokens = /* @__PURE__ */ new Map();
var SecureFileManager = class {
  /**
   * Generates a short-lived (15 minute) single-use download token
   */
  static async generateToken(params) {
    const tokenId = `DL-TOK-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const expiresAt = Date.now() + 15 * 60 * 1e3;
    const reqId = params.requestId || generateRequestId();
    const data = {
      tokenId,
      userId: params.userId,
      productId: params.productId,
      productTitle: params.productTitle,
      orderId: params.orderId,
      purchaseId: params.purchaseId,
      expiresAt,
      used: false,
      requestId: reqId,
      ip: params.ip,
      userAgent: params.userAgent
    };
    downloadTokens.set(tokenId, data);
    await FirebaseRtdb.set(`downloadTokens/${tokenId}`, data);
    return {
      token: tokenId,
      expiresAt,
      downloadUrl: `/api/downloads/stream?token=${tokenId}`
    };
  }
  /**
   * Validates and consumes token, returning token data or error message
   */
  static async validateAndConsumeToken(tokenId) {
    let data = downloadTokens.get(tokenId);
    if (!data) {
      const remoteData = await FirebaseRtdb.get(`downloadTokens/${tokenId}`);
      if (remoteData) {
        data = remoteData;
        downloadTokens.set(tokenId, data);
      }
    }
    if (!data) {
      return { valid: false, error: "Invalid or expired download token." };
    }
    if (Date.now() > data.expiresAt) {
      return { valid: false, error: "Download link has expired. Please request a new download link." };
    }
    if (data.used) {
      return { valid: false, error: "This download link has already been used. Please request a fresh download link." };
    }
    data.used = true;
    downloadTokens.set(tokenId, data);
    await FirebaseRtdb.set(`downloadTokens/${tokenId}`, data);
    return { valid: true, tokenData: data };
  }
  /**
   * Ensures secure physical file exists for product, using real uploaded zip package
   */
  static ensureProductFileExists(productId) {
    const zipPaths = [
      path2.join(process.cwd(), "Api", "Files", "LinkNest-Pro-Creator-Commerce-Kit.zip"),
      path2.join(process.cwd(), "protected_files", "LinkNest-Pro-Creator-Commerce-Kit.zip"),
      path2.join(process.cwd(), "protected_files", "linknest-pro-template.zip"),
      path2.join(process.cwd(), "protected_files", `${productId}-template.zip`)
    ];
    for (const p of zipPaths) {
      if (fs2.existsSync(p)) {
        return p;
      }
    }
    const apiFilesDir = path2.join(process.cwd(), "Api", "Files");
    if (fs2.existsSync(apiFilesDir)) {
      const files = fs2.readdirSync(apiFilesDir);
      const zip = files.find((f) => f.toLowerCase().endsWith(".zip"));
      if (zip) return path2.join(apiFilesDir, zip);
    }
    const fileName = `${productId}-template.zip`;
    const filePath = path2.join(PROTECTED_DIR, fileName);
    if (!fs2.existsSync(filePath)) {
      const content = `LinkNest Pro \u2014 Personal Bio & Digital Store Website Template
========================================================================
Official Digital Delivery & Commercial License Certificate
Product ID: ${productId}
Generated: ${(/* @__PURE__ */ new Date()).toISOString()}

INCLUDED ASSETS:
- index.html (Responsive Bio Link & Store Template)
- styles.css (Tailwind & CSS Theme Config)
- app.js (Interactive UI & Payment Button Logic)
- README.md (Setup & Deployment Instructions)
- LICENSE.pdf (Commercial Usage Rights)

Thank you for your purchase!
`;
      fs2.writeFileSync(filePath, content, "utf-8");
    }
    return filePath;
  }
  /**
   * Streams file securely to HTTP response
   */
  static streamFileToResponse(filePath, filename, res) {
    const stat = fs2.statSync(filePath);
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Length": stat.size,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const readStream = fs2.createReadStream(filePath);
    readStream.pipe(res);
  }
};

// src/data/products.ts
var PRODUCTS = [
  {
    id: "linknest-pro",
    slug: "linknest-pro",
    title: "LinkNest Pro \u2014 Personal Bio & Digital Store Website Template",
    shortDescription: "Create your own professional bio link page and showcase your digital products, social links, WhatsApp, email and payment links \u2014 all in one place.",
    description: "LinkNest Pro is a modern, responsive personal bio and digital-store website template designed for creators, freelancers, developers, influencers and small businesses.\n\nTurn one simple link into your own professional online profile where visitors can:\n\n\u{1F464} View your profile & bio\n\u{1F517} Access all your important links\n\u{1F4F1} Connect through WhatsApp\n\u{1F4E7} Contact you by email\n\u{1F310} Visit your website and social profiles\n\u{1F6CD}\uFE0F Browse your digital products\n\u{1F4B0} See product prices\n\u{1F525} Click Buy Now and continue to your payment/checkout page\n\nNo monthly subscription. No framework required. Just customize, deploy and use.",
    category: "templates",
    categoryLabel: "Website Templates",
    productType: "DOWNLOAD",
    price: 550,
    originalPrice: 999,
    rating: 4.9,
    reviewCount: 42,
    image: "/images/branding/LinkNest-Pro.png",
    gallery: [
      "/images/branding/LinkNest-Pro.png"
    ],
    fileFormat: "HTML, CSS, JS (ZIP Archive)",
    fileSize: "6.7 KB",
    downloadUrl: "/downloads/linknest-pro-template.zip",
    version: "",
    features: [
      "Responsive Mobile & Desktop Layout",
      "Personal Profile & Bio Showcase",
      "Digital Product Cards with Pricing",
      "Direct Buy Now / Payment Link Support",
      "WhatsApp & Email Direct Action Buttons",
      "Social Media Links Integration",
      "Dark & Light Mode Theme Switcher",
      "SEO-Optimized Meta & OpenGraph Tags",
      "Zero Frameworks / Pure Vanilla JS & CSS"
    ],
    whatsIncluded: [
      "Complete HTML/CSS/JS source code",
      "Responsive mobile & desktop design",
      "Digital product showcase",
      "Product pricing section",
      "Buy Now / payment-link support",
      "Social media links",
      "WhatsApp & Email buttons",
      "Dark/Light mode",
      "SEO-ready metadata",
      "Favicon",
      "Free deployment guide",
      "Product & payment setup guide",
      "Customization guide",
      "Commercial license template"
    ],
    requirements: [
      "Any modern web browser (Chrome, Safari, Firefox, Edge)",
      "Basic text editor (VS Code, Notepad++, or Sublime Text) for editing links and text",
      "Free web hosting (Vercel, Netlify, GitHub Pages, or Cloudflare Pages)"
    ],
    faqs: [
      {
        question: "Do I need a monthly subscription to use LinkNest Pro?",
        answer: "No! There are zero monthly fees or hidden charges. You purchase once and get full lifetime usage rights and source code."
      },
      {
        question: "How do customers buy my products?",
        answer: "You can link each product item to your preferred payment gateway (Stripe, PayPal, Razorpay, UPI, BuyMeACoffee, Gumroad) directly via simple link URLs."
      },
      {
        question: "Can I host it on my own custom domain?",
        answer: "Yes! You can host LinkNest Pro on any custom domain or sub-domain with free hosting platforms like Vercel, Netlify, or GitHub Pages."
      },
      {
        question: "What happens if I lose my download link?",
        answer: "No worries! You can access all your purchased products anytime by logging into your account dashboard on FreeFireShop. Your digital library is permanently stored in your account."
      },
      {
        question: "Do I need to know coding to use this template?",
        answer: "Basic knowledge of HTML/CSS is helpful if you want to make deep customizations, but for simply changing links, text, and images, you just need a basic text editor. We provide a step-by-step guide to help you."
      },
      {
        question: "Is the template SEO friendly?",
        answer: "Yes, LinkNest Pro is built with clean HTML5 semantic structure and includes pre-configured meta tags for SEO and social media (OpenGraph) sharing."
      },
      {
        question: "Is there a refund policy?",
        answer: "As this is a digital downloadable product, we generally do not offer refunds once the file has been accessed. However, if you face any technical issues with the source code, our support team is here to help."
      }
    ],
    status: "active",
    tags: ["Bio Link", "Digital Store", "Landing Page", "Website Template", "HTML/CSS/JS", "Creator Portfolio", "Link in Bio"],
    isFeatured: true,
    isNew: true,
    releasedAt: "2026-09-20",
    updatedAt: "2026-09-21"
  }
];
var COUPONS = [
  {
    code: "SAVE20",
    discountPercent: 20,
    description: "20% off any digital product on FreeFireShop"
  },
  {
    code: "LAUNCH50",
    discountPercent: 50,
    description: "50% off launch discount",
    minSpend: 50
  },
  {
    code: "DEV30",
    discountPercent: 30,
    description: "30% developer discount",
    minSpend: 40
  }
];

// server/adminRoutes.ts
import { Router } from "express";
import { z } from "zod";
import multer from "multer";
var adminRouter = Router();
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});
var productSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  slug: z.string().min(2),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  category: z.string().min(1),
  categoryLabel: z.string().optional(),
  productType: z.string().default("DOWNLOAD"),
  version: z.string().optional(),
  fileSize: z.string().optional(),
  fileFormat: z.string().optional(),
  image: z.string().url().or(z.string().min(1)),
  gallery: z.array(z.string()).optional(),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  isFeatured: z.boolean().optional(),
  stock: z.number().int().nonnegative().optional(),
  unlimitedStock: z.boolean().optional(),
  licenseTypes: z.array(z.any()).optional(),
  features: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  faqs: z.array(z.any()).optional()
});
var couponSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(2),
  discountPercent: z.number().min(0).max(100).optional(),
  flatAmount: z.number().nonnegative().optional(),
  description: z.string().optional(),
  minSpend: z.number().nonnegative().optional(),
  active: z.boolean().default(true),
  usageCount: z.number().int().nonnegative().optional(),
  usageLimit: z.number().int().nonnegative().optional(),
  expiresAt: z.string().optional()
});
adminRouter.get("/me", async (req, res) => {
  try {
    const profile = await FirebaseRtdb.getUserProfile(req.userId);
    const firebaseStatus = await FirebaseRtdb.testConnection();
    res.json({
      success: true,
      admin: profile,
      health: {
        firebase: firebaseStatus,
        easebuzz: { status: "active", environment: process.env.EASEBUZZ_ENV || "test" }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch admin profile." });
  }
});
adminRouter.get("/dashboard/stats", async (req, res) => {
  try {
    const orders = await FirebaseRtdb.getAllGlobalOrders();
    const products = await FirebaseRtdb.getAllProducts();
    const users = await FirebaseRtdb.getAllUsers();
    const auditLogs = await AuditLogger.getAllLogs(50);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1e3;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;
    let revenueToday = 0;
    let revenue7d = 0;
    let revenue30d = 0;
    let totalRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    orders.forEach((o) => {
      const amount = o.total || 0;
      const orderTime = new Date(o.date || o.createdAt || 0).getTime();
      const isPaid = o.paymentStatus === "PAID" || o.paymentStatus === "paid";
      if (isPaid) {
        totalRevenue += amount;
        if (now - orderTime <= oneDay) revenueToday += amount;
        if (now - orderTime <= sevenDays) revenue7d += amount;
        if (now - orderTime <= thirtyDays) revenue30d += amount;
        paidCount++;
      } else if (o.paymentStatus === "FAILED" || o.paymentStatus === "failed") {
        failedCount++;
      } else {
        pendingCount++;
      }
    });
    res.json({
      success: true,
      stats: {
        revenue: { today: revenueToday, last7d: revenue7d, last30d: revenue30d, total: totalRevenue },
        orders: { total: orders.length, paid: paidCount, pending: pendingCount, failed: failedCount },
        productsCount: products.length,
        customersCount: users.length,
        conversionRate: 3.4
      },
      recentOrders: orders.slice(0, 10),
      recentAuditLogs: auditLogs.slice(0, 15)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch dashboard stats." });
  }
});
adminRouter.get("/products", async (req, res) => {
  try {
    const products = await FirebaseRtdb.getAllProducts();
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch products." });
  }
});
adminRouter.post("/products", async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation error", errors: parsed.error.format() });
    }
    const productData = {
      ...parsed.data,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const existing = await FirebaseRtdb.getAllProducts();
    if (existing.some((p) => p.slug === productData.slug && p.id !== productData.id)) {
      return res.status(400).json({ success: false, message: "Product slug must be unique." });
    }
    await FirebaseRtdb.saveProduct(productData);
    await AuditLogger.log({
      requestId: generateRequestId(),
      userId: req.userId,
      eventType: "PRODUCT_VIEWED",
      // or general admin write
      eventStatus: "SUCCESS",
      productId: productData.id,
      source: "ADMIN_PANEL",
      metadata: { action: "CREATE_PRODUCT", productTitle: productData.title },
      ip: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, product: productData, message: "Product created successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to create product." });
  }
});
adminRouter.put("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const existing = await FirebaseRtdb.getProductById(productId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    const parsed = productSchema.safeParse({ ...existing, ...req.body, id: productId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation error", errors: parsed.error.format() });
    }
    const updated = {
      ...parsed.data,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await FirebaseRtdb.saveProduct(updated);
    await AuditLogger.log({
      requestId: generateRequestId(),
      userId: req.userId,
      eventType: "PRODUCT_VIEWED",
      eventStatus: "SUCCESS",
      productId,
      source: "ADMIN_PANEL",
      metadata: { action: "UPDATE_PRODUCT", before: existing, after: updated },
      ip: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, product: updated, message: "Product updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to update product." });
  }
});
adminRouter.delete("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const existing = await FirebaseRtdb.getProductById(productId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    existing.status = "archived";
    existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await FirebaseRtdb.saveProduct(existing);
    await AuditLogger.log({
      requestId: generateRequestId(),
      userId: req.userId,
      eventType: "PRODUCT_VIEWED",
      eventStatus: "SUCCESS",
      productId,
      source: "ADMIN_PANEL",
      metadata: { action: "ARCHIVE_PRODUCT", productId },
      ip: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, message: "Product archived successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to archive product." });
  }
});
adminRouter.post("/products/:id/clone", async (req, res) => {
  try {
    const productId = req.params.id;
    const existing = await FirebaseRtdb.getProductById(productId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    const newId = `${existing.id}-copy-${Math.random().toString(36).substring(2, 6)}`;
    const cloned = {
      ...existing,
      id: newId,
      title: `${existing.title} (Copy)`,
      slug: `${existing.slug}-copy-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await FirebaseRtdb.saveProduct(cloned);
    res.json({ success: true, product: cloned, message: "Product cloned successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to clone product." });
  }
});
adminRouter.post("/uploads/direct", upload.single("image"), async (req, res) => {
  const requestId = generateRequestId();
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided.", requestId });
    }
    const bucket = process.env.FIREBASE_STORAGE_BUCKET || "vexora-724fc.appspot.com";
    const filename = `products/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(filename)}`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.mimetype
      },
      body: file.buffer
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firebase Storage Error: ${errorText}`);
    }
    const data = await response.json();
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filename)}?alt=media&token=${data.downloadTokens || ""}`;
    await AuditLogger.log({
      requestId,
      userId: req.userId,
      eventType: "PRODUCT_VIEWED",
      eventStatus: "SUCCESS",
      source: "ADMIN_UPLOAD",
      metadata: { filename, size: file.size, mimetype: file.mimetype },
      ip: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({
      success: true,
      url: publicUrl,
      message: "Image uploaded successfully to Firebase Storage."
    });
  } catch (err) {
    console.error("[Admin Upload Error]", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload image to storage. Ensure FIREBASE_STORAGE_BUCKET is configured.",
      requestId
    });
  }
});
adminRouter.post("/uploads/sign", async (req, res) => {
  res.json({
    success: true,
    uploadUrl: `/api/admin/uploads/direct`,
    message: "Use direct upload endpoint with multipart/form-data."
  });
});
adminRouter.get("/orders", async (req, res) => {
  try {
    const orders = await FirebaseRtdb.getAllGlobalOrders();
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch orders." });
  }
});
adminRouter.get("/orders/:id/timeline", async (req, res) => {
  try {
    const orderId = req.params.id;
    const auditLogs = await FirebaseRtdb.get(`orderAuditIndex/${orderId}`) || {};
    const timeline = Object.values(auditLogs).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json({ success: true, timeline });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch order timeline." });
  }
});
adminRouter.put("/orders/:id/status", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, paymentStatus, deliveryStatus } = req.body;
    const order = await FirebaseRtdb.getGlobalOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (deliveryStatus) order.deliveryStatus = deliveryStatus;
    order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await FirebaseRtdb.saveGlobalOrder(order);
    await AuditLogger.log({
      requestId: generateRequestId(),
      userId: req.userId,
      eventType: "ORDER_UPDATED",
      eventStatus: "SUCCESS",
      orderId,
      source: "ADMIN_PANEL",
      metadata: { action: "UPDATE_ORDER_STATUS", status, paymentStatus, deliveryStatus },
      ip: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, order, message: "Order status updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to update order status." });
  }
});
adminRouter.get("/customers", async (req, res) => {
  try {
    const users = await FirebaseRtdb.getAllUsers();
    const orders = await FirebaseRtdb.getAllGlobalOrders();
    const customersWithMetrics = users.map((u) => {
      const userOrders = orders.filter((o) => o.customerEmail?.toLowerCase() === u.email?.toLowerCase());
      const totalSpent = userOrders.reduce((sum, o) => sum + (o.paymentStatus === "PAID" ? o.total : 0), 0);
      return {
        ...u,
        ordersCount: userOrders.length,
        totalSpent
      };
    });
    res.json({ success: true, customers: customersWithMetrics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch customers." });
  }
});
adminRouter.put("/customers/:userId/status", async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { role, blocked } = req.body;
    const profile = await FirebaseRtdb.getUserProfile(targetUserId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }
    if (role) profile.role = role;
    if (blocked !== void 0) profile.blocked = blocked;
    await FirebaseRtdb.setUserProfile(targetUserId, profile);
    res.json({ success: true, profile, message: "Customer status updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to update customer status." });
  }
});
adminRouter.get("/coupons", async (req, res) => {
  try {
    const coupons = await FirebaseRtdb.getAllCoupons();
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch coupons." });
  }
});
adminRouter.post("/coupons", async (req, res) => {
  try {
    const parsed = couponSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation error", errors: parsed.error.format() });
    }
    await FirebaseRtdb.saveCoupon(parsed.data);
    res.json({ success: true, coupon: parsed.data, message: "Coupon created successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to create coupon." });
  }
});
adminRouter.delete("/coupons/:id", async (req, res) => {
  try {
    await FirebaseRtdb.deleteCoupon(req.params.id);
    res.json({ success: true, message: "Coupon deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to delete coupon." });
  }
});
adminRouter.get("/settings", async (req, res) => {
  try {
    const settings = await FirebaseRtdb.getGlobalSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch settings." });
  }
});
adminRouter.put("/settings", async (req, res) => {
  try {
    await FirebaseRtdb.saveGlobalSettings(req.body);
    res.json({ success: true, message: "Settings saved successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to save settings." });
  }
});
adminRouter.get("/export/orders", async (req, res) => {
  try {
    const orders = await FirebaseRtdb.getAllGlobalOrders();
    const csvRows = ["Order Number,Date,Customer Name,Customer Email,Status,Payment Status,Total"];
    orders.forEach((o) => {
      csvRows.push(`"${o.orderNumber}","${o.date}","${o.customerName || o.customer?.fullName || ""}","${o.customerEmail || o.customer?.email || ""}","${o.status}","${o.paymentStatus}","${o.total}"`);
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=orders_export.csv");
    res.send(csvRows.join("\n"));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Export failed." });
  }
});
adminRouter.get("/export/customers", async (req, res) => {
  try {
    const users = await FirebaseRtdb.getAllUsers();
    const csvRows = ["Name,Email,Mobile,Role,Joined Date"];
    users.forEach((u) => {
      csvRows.push(`"${u.name || ""}","${u.email || ""}","${u.mobile || ""}","${u.role || "customer"}","${u.joinedDate || ""}"`);
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=customers_export.csv");
    res.send(csvRows.join("\n"));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Export failed." });
  }
});

// server/seed.ts
async function runServerSeed() {
  try {
    const existingProducts = await FirebaseRtdb.get("products");
    if (!existingProducts || Object.keys(existingProducts).length === 0) {
      console.log("Seeding initial products into Firebase RTDB...");
      for (const p of PRODUCTS) {
        const prod = p;
        const productRecord = {
          ...prod,
          createdAt: prod.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          status: "published",
          stock: prod.stock !== void 0 ? prod.stock : 999,
          unlimitedStock: true,
          licenseTypes: prod.licenseTypes || prod.licenseTerms || [
            { id: "standard", name: "Standard License", price: prod.price },
            { id: "extended", name: "Extended Commercial", price: prod.price * 2 }
          ]
        };
        await FirebaseRtdb.set(`products/${prod.id}`, productRecord);
      }
    }
    const existingCoupons = await FirebaseRtdb.get("coupons");
    if (!existingCoupons || Object.keys(existingCoupons).length === 0) {
      console.log("Seeding initial coupons into Firebase RTDB...");
      const defaultCoupons = [
        { id: "coup_1", code: "SAVE10", discountPercent: 10, description: "10% off your entire order", minSpend: 0, active: true, usageCount: 0, usageLimit: 1e3 },
        { id: "coup_2", code: "FREEFIRE20", discountPercent: 20, description: "20% off for FreeFire community", minSpend: 500, active: true, usageCount: 0, usageLimit: 500 },
        { id: "coup_3", code: "WELCOME100", discountPercent: 0, flatAmount: 100, description: "\u20B9100 flat discount", minSpend: 400, active: true, usageCount: 0, usageLimit: 200 }
      ];
      for (const coup of defaultCoupons) {
        await FirebaseRtdb.set(`coupons/${coup.id}`, coup);
      }
    }
    const existingSettings = await FirebaseRtdb.get("settings");
    if (!existingSettings) {
      console.log("Seeding initial store settings...");
      await FirebaseRtdb.set("settings", {
        storeName: "FreeFireShop Digital",
        supportEmail: "support@freefireshop.com",
        supportPhone: "+91 9876543210",
        appUrl: "https://ais-dev-idexjqz7zkbomriwtujuzx-234817242937.asia-southeast1.run.app",
        paymentEnvironment: "test",
        maintenanceMode: false,
        featuredProductIds: ["linknest-pro"],
        termsContent: "Standard terms and conditions for digital downloads and licensing...",
        privacyContent: "Your privacy is important to us. We protect your data securely...",
        refundContent: "Digital products are non-refundable once downloaded unless defective..."
      });
    }
    const adminEmail = "ff.india.seller.god.of.strike@gmail.com";
    const adminUserId = await FirebaseRtdb.findUserIdByIdentifier(adminEmail);
    if (adminUserId) {
      const profile = await FirebaseRtdb.getUserProfile(adminUserId);
      if (profile && profile.role !== "admin") {
        profile.role = "admin";
        await FirebaseRtdb.updateUserProfile(adminUserId, { role: "admin" });
        console.log(`Granted admin privileges to ${adminEmail} (${adminUserId})`);
      }
    }
    console.log("Server seed completed successfully.");
  } catch (err) {
    console.warn("Server seed warning:", err);
  }
}

// server/app.ts
runServerSeed().catch((err) => console.warn("Startup seed error:", err));
var APP_URL = process.env.APP_URL || "http://localhost:3000";
var EASEBUZZ_KEY = process.env.EASEBUZZ_KEY || "";
var EASEBUZZ_SALT = process.env.EASEBUZZ_SALT || "";
var EASEBUZZ_ENV = process.env.EASEBUZZ_ENV || "test";
var CRON_SECRET = process.env.CRON_SECRET || "";
var EASEBUZZ_BASE_URL = EASEBUZZ_ENV === "prod" ? "https://pay.easebuzz.in" : "https://testpay.easebuzz.in";
var easebuzzHash = (data) => {
  return crypto2.createHash("sha512").update(data).digest("hex");
};
var verifyEasebuzzHash = (params, salt) => {
  const { hash, status, udf10, udf9, udf8, udf7, udf6, udf5, udf4, udf3, udf2, udf1, email, firstname, productinfo, amount, txnid, key } = params;
  const hashString = `${salt}|${status}|${udf10 || ""}|${udf9 || ""}|${udf8 || ""}|${udf7 || ""}|${udf6 || ""}|${udf5 || ""}|${udf4 || ""}|${udf3 || ""}|${udf2 || ""}|${udf1 || ""}|${email || ""}|${firstname || ""}|${productinfo || ""}|${amount || ""}|${txnid || ""}|${key || ""}`;
  const calculatedHash = easebuzzHash(hashString);
  try {
    return crypto2.timingSafeEqual(Buffer.from(hash || ""), Buffer.from(calculatedHash));
  } catch {
    return false;
  }
};
var app = express();
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: APP_URL,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
var authRateLimiter = async (req, res, next) => {
  try {
    const ip = (req.ip || req.headers["x-forwarded-for"] || "unknown").replace(/[\.\/]/g, "_");
    const now = Date.now();
    const windowMs = 15 * 60 * 1e3;
    const maxAttempts = 20;
    const key = `rateLimits/${ip}`;
    const record = await FirebaseRtdb.get(key);
    if (!record || now > record.resetTime) {
      await FirebaseRtdb.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    if (record.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: "Too many authentication attempts. Please try again after 15 minutes."
      });
    }
    record.count += 1;
    await FirebaseRtdb.set(key, record);
    next();
  } catch {
    next();
  }
};
var requireAuth = async (req, res, next) => {
  const sid = req.cookies?.sid;
  if (!sid) {
    return res.status(401).json({ success: false, message: "Authentication session required." });
  }
  const payload = await AuthServiceServer.verifyOpaqueSession(sid);
  if (!payload || !payload.userId) {
    res.clearCookie("sid", { path: "/" });
    return res.status(401).json({ success: false, message: "Invalid or expired session. Please log in again." });
  }
  req.userId = payload.userId;
  req.userEmail = payload.email;
  req.username = payload.username;
  next();
};
var requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const profile = await FirebaseRtdb.getUserProfile(req.userId);
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ success: false, message: "Administrative privileges required for this action." });
      }
      next();
    } catch {
      return res.status(403).json({ success: false, message: "Administrative privileges required for this action." });
    }
  });
};
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/firebase-status", async (req, res) => {
  const status = await FirebaseRtdb.testConnection();
  res.json({
    status: "ok",
    firebase: {
      databaseUrl: status.url,
      connected: status.connected,
      mode: status.mode,
      error: status.error
    }
  });
});
app.get("/api/products", async (req, res) => {
  try {
    const products = await FirebaseRtdb.getAllProducts();
    const activeProducts = products && products.length > 0 ? products.filter((p) => p.status !== "archived") : PRODUCTS;
    res.json({ success: true, products: activeProducts });
  } catch {
    res.json({ success: true, products: PRODUCTS });
  }
});
app.get("/api/products/:slugOrId", async (req, res) => {
  try {
    const identifier = req.params.slugOrId.toLowerCase();
    const products = await FirebaseRtdb.getAllProducts();
    const list = products && products.length > 0 ? products : PRODUCTS;
    const found = list.find((p) => p.id.toLowerCase() === identifier || p.slug.toLowerCase() === identifier);
    if (!found) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    res.json({ success: true, product: found });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch product." });
  }
});
app.use("/api/admin", requireAdmin, adminRouter);
app.post("/api/auth/register", authRateLimiter, async (req, res) => {
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
      req.headers["user-agent"]
    );
    res.cookie("sid", rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || req.secure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    res.status(201).json({ success: true, message: result.message, user: result.user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Registration failed." });
  }
});
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
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
      req.headers["user-agent"]
    );
    res.cookie("sid", rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || req.secure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    res.json({ success: true, message: "Login successful.", user: result.user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Invalid login credentials." });
  }
});
app.post("/api/auth/forgot-password", authRateLimiter, async (req, res) => {
  try {
    const { email, mobile, newPassword, confirmNewPassword } = req.body;
    const result = await AuthServiceServer.resetPasswordWithEmailAndMobile({ email, mobile, newPassword, confirmNewPassword });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Password reset failed." });
  }
});
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const profile = await FirebaseRtdb.getUserProfile(req.userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }
    res.json({ success: true, user: profile });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
});
app.post("/api/auth/logout", async (req, res) => {
  try {
    const sid = req.cookies?.sid;
    if (sid) {
      await AuthServiceServer.destroyOpaqueSession(sid);
    }
    res.clearCookie("sid", { path: "/" });
    res.json({ success: true, message: "Logged out successfully." });
  } catch {
    res.clearCookie("sid", { path: "/" });
    res.json({ success: true, message: "Logged out successfully." });
  }
});
app.get("/api/user/sync-all", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const [profile, cart, wishlist, orders, downloads, settings] = await Promise.all([
      FirebaseRtdb.getUserProfile(userId),
      FirebaseRtdb.getUserCart(userId),
      FirebaseRtdb.getUserWishlist(userId),
      FirebaseRtdb.getUserOrders(userId),
      FirebaseRtdb.getUserDownloads(userId),
      FirebaseRtdb.getUserSettings(userId)
    ]);
    res.json({ success: true, data: { profile, cart, wishlist, orders, downloads, settings } });
  } catch {
    res.status(500).json({ success: false, message: "Failed to sync user data." });
  }
});
app.get("/api/user/cart", requireAuth, async (req, res) => {
  try {
    const items = await FirebaseRtdb.getUserCart(req.userId);
    res.json({ success: true, items });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch cart." });
  }
});
app.post("/api/user/cart", requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    await FirebaseRtdb.setUserCart(req.userId, items || []);
    res.json({ success: true, items });
  } catch {
    res.status(500).json({ success: false, message: "Failed to save cart." });
  }
});
app.get("/api/user/wishlist", requireAuth, async (req, res) => {
  try {
    const items = await FirebaseRtdb.getUserWishlist(req.userId);
    res.json({ success: true, items });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch wishlist." });
  }
});
app.post("/api/user/wishlist", requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    await FirebaseRtdb.setUserWishlist(req.userId, items || []);
    res.json({ success: true, items });
  } catch {
    res.status(500).json({ success: false, message: "Failed to save wishlist." });
  }
});
app.get("/api/user/orders", requireAuth, async (req, res) => {
  try {
    const orders = await FirebaseRtdb.getUserOrders(req.userId);
    res.json({ success: true, orders });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch orders." });
  }
});
app.get("/api/orders/:orderId", requireAuth, async (req, res) => {
  try {
    const order = await FirebaseRtdb.getUserOrderById(req.userId, req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    res.json({ success: true, order });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch order." });
  }
});
var handleOrderCreation = async (req, res) => {
  const requestId = generateRequestId();
  try {
    const userId = req.userId;
    const { items, customer, discountCode, paymentMethod } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart items are required.", requestId });
    }
    let calculatedSubtotal = 0;
    const validatedItems = [];
    let primaryProductId = "";
    let primaryProductName = "";
    const dbProducts = await FirebaseRtdb.getAllProducts();
    const productList = dbProducts && dbProducts.length > 0 ? dbProducts : PRODUCTS;
    for (const ci of items) {
      const rawId = ci.productId || ci.product?.id || ci.id;
      const matchedProduct = productList.find((p) => p.id === rawId || p.slug === rawId);
      if (!matchedProduct) {
        return res.status(400).json({ success: false, message: `Unknown product ID: ${rawId}`, requestId });
      }
      const quantity = parseInt(ci.quantity || 1, 10);
      if (isNaN(quantity) || quantity < 1 || quantity > 10) {
        return res.status(400).json({ success: false, message: "Invalid quantity (must be between 1 and 10).", requestId });
      }
      if (!primaryProductId) {
        primaryProductId = matchedProduct.id;
        primaryProductName = matchedProduct.title;
      }
      const serverPrice = matchedProduct.price;
      calculatedSubtotal += serverPrice * quantity;
      const keyHex1 = Math.random().toString(16).substring(2, 6).toUpperCase();
      const keyHex2 = Math.random().toString(16).substring(2, 6).toUpperCase();
      validatedItems.push({
        productId: matchedProduct.id,
        productTitle: matchedProduct.title,
        productSlug: matchedProduct.slug,
        productImage: matchedProduct.image,
        category: matchedProduct.categoryLabel || matchedProduct.category,
        productType: matchedProduct.productType || "DOWNLOAD",
        licenseType: ci.licenseType || "Standard",
        price: serverPrice,
        quantity,
        licenseKey: `KEY-${matchedProduct.slug.substring(0, 3).toUpperCase()}-${keyHex1}-${keyHex2}`,
        downloadUrl: `/api/downloads/${matchedProduct.id}`,
        fileSize: matchedProduct.fileSize || "12.4 MB",
        version: matchedProduct.version || "v1.2.0",
        fileFormat: matchedProduct.fileFormat || "ZIP",
        downloadStatus: "UNAVAILABLE",
        downloadLimit: 10,
        downloadCount: 0,
        product: matchedProduct
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
          calculatedDiscount = Math.round(calculatedSubtotal * coupon.discountPercent / 100);
        }
      }
    }
    const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscount);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `LN-${todayStr}-${randomHex}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newOrder = {
      id: orderId,
      orderId,
      orderNumber: orderId,
      userId,
      date: now.split("T")[0],
      createdAt: now,
      updatedAt: now,
      customerEmail: customer?.email || req.userEmail,
      customerName: customer?.fullName || "Customer",
      productId: primaryProductId,
      productNameSnapshot: primaryProductName,
      status: "PENDING",
      paymentStatus: "pending",
      orderStatus: "pending",
      deliveryStatus: "PENDING",
      downloadStatus: "UNAVAILABLE",
      amount: calculatedTotal,
      currency: "INR",
      customer: {
        fullName: customer?.fullName || "Customer",
        email: customer?.email || req.userEmail,
        phone: customer?.phone || "",
        company: customer?.company || "",
        country: customer?.country || "India"
      },
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount: calculatedDiscount,
      discountCode: discountCode || "",
      tax: 0,
      total: calculatedTotal,
      paymentMethod: paymentMethod || "Card / UPI Gateway",
      checkoutStartedAt: now,
      requestId
    };
    await FirebaseRtdb.saveGlobalOrder(newOrder);
    await AuditLogger.log({
      requestId,
      userId,
      orderId,
      productId: primaryProductId,
      eventType: "ORDER_CREATED",
      eventStatus: "SUCCESS",
      source: "API",
      metadata: { amount: calculatedTotal, currency: "INR", itemsCount: validatedItems.length },
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });
    res.status(201).json({ success: true, order: newOrder, requestId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create order.", requestId });
  }
};
app.post("/api/orders/create", requireAuth, handleOrderCreation);
app.post("/api/user/orders", requireAuth, handleOrderCreation);
app.post("/api/payments/easebuzz/initiate", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.userId;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }
    const order = await FirebaseRtdb.getUserOrderById(userId, orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.paymentStatus === "paid" || order.paymentStatus === "PAID") {
      return res.status(400).json({ success: false, message: "Order is already paid." });
    }
    const phone = order.customer?.phone || "";
    const phoneRegex = /^[6-9][0-9]{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Valid 10-digit phone number is required at checkout for Easebuzz." });
    }
    const amount = Number(order.total || order.amount).toFixed(2);
    const txnid = order.orderNumber;
    const firstname = order.customer?.fullName || "Customer";
    const email = order.customer?.email || req.userEmail || "";
    const productinfo = (order.items || []).map((i) => i.productTitle).join(", ").substring(0, 100);
    const surl = `${APP_URL}/api/payments/easebuzz/callback`;
    const furl = `${APP_URL}/api/payments/easebuzz/callback`;
    const hashString = `${EASEBUZZ_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${EASEBUZZ_SALT}`;
    const hash = easebuzzHash(hashString);
    const formData = new URLSearchParams();
    formData.append("key", EASEBUZZ_KEY);
    formData.append("txnid", txnid);
    formData.append("amount", amount);
    formData.append("productinfo", productinfo);
    formData.append("firstname", firstname);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("surl", surl);
    formData.append("furl", furl);
    formData.append("hash", hash);
    const ebzResponse = await fetch(`${EASEBUZZ_BASE_URL}/payment/initiateLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: formData.toString()
    });
    const ebzData = await ebzResponse.json();
    if (ebzData.status === 1) {
      order.easebuzzAccessKey = ebzData.data;
      order.status = "PENDING_PAYMENT";
      order.paymentStatus = "pending";
      await FirebaseRtdb.saveGlobalOrder(order);
      res.json({ success: true, accessKey: ebzData.data });
    } else {
      res.status(400).json({ success: false, message: ebzData.data || "Failed to initiate Easebuzz payment." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Easebuzz payment initiation failed." });
  }
});
async function verifyAndSyncEasebuzzOrder(orderIdOrTxnId) {
  const globalOrder = await FirebaseRtdb.getGlobalOrder(orderIdOrTxnId);
  if (!globalOrder) {
    return { success: false, message: "Order not found" };
  }
  if (globalOrder.paymentStatus === "paid" || globalOrder.paymentStatus === "PAID") {
    return { success: true, status: "PAID", orderId: globalOrder.id, message: "Already paid" };
  }
  const txnid = globalOrder.orderNumber || globalOrder.id;
  const amount = Number(globalOrder.total || globalOrder.amount).toFixed(2);
  const email = globalOrder.customer?.email || globalOrder.customerEmail || "";
  const phone = globalOrder.customer?.phone || "";
  const transHashStr = `${EASEBUZZ_KEY}|${txnid}|${amount}|${email}|${phone}|${EASEBUZZ_SALT}`;
  const transHash = easebuzzHash(transHashStr);
  const transFormData = new URLSearchParams();
  transFormData.append("key", EASEBUZZ_KEY);
  transFormData.append("txnid", txnid);
  transFormData.append("amount", amount);
  transFormData.append("email", email);
  transFormData.append("phone", phone);
  transFormData.append("hash", transHash);
  const verifyRes = await fetch(`${EASEBUZZ_BASE_URL}/transaction/v2.1/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: transFormData.toString()
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.status || !verifyData.data || verifyData.data.status !== "success") {
    const errorReason = verifyData.data?.error_Message || verifyData.data?.status || "Verification failed";
    globalOrder.status = "FAILED";
    globalOrder.paymentStatus = "failed";
    globalOrder.orderStatus = "failed";
    globalOrder.failureReason = errorReason;
    globalOrder.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await FirebaseRtdb.saveGlobalOrder(globalOrder);
    return { success: false, status: "FAILED", orderId: globalOrder.id, message: errorReason };
  }
  const verifiedAmount = Number(verifyData.data.amount).toFixed(2);
  const expectedAmount = Number(globalOrder.total || globalOrder.amount).toFixed(2);
  if (verifiedAmount !== expectedAmount) {
    return { success: false, orderId: globalOrder.id, message: "Amount mismatch during retrieval" };
  }
  const easebuzzId = verifyData.data.easepayid || verifyData.data.transaction_id || `EBZ-${Date.now()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userId = globalOrder.userId;
  globalOrder.status = "PAID";
  globalOrder.paymentStatus = "paid";
  globalOrder.orderStatus = "paid";
  globalOrder.deliveryStatus = "DELIVERED";
  globalOrder.downloadStatus = "AVAILABLE";
  globalOrder.transactionId = easebuzzId;
  globalOrder.paymentId = easebuzzId;
  globalOrder.paymentProvider = "Easebuzz";
  globalOrder.updatedAt = now;
  globalOrder.items = (globalOrder.items || []).map((item) => ({
    ...item,
    downloadStatus: "AVAILABLE"
  }));
  await FirebaseRtdb.saveGlobalOrder(globalOrder);
  for (const item of globalOrder.items || []) {
    const purchaseId = `pur_${globalOrder.id}_${item.productId}`;
    const downloadId = `dl_${globalOrder.id}_${item.productId}`;
    await FirebaseRtdb.savePurchase(userId, purchaseId, {
      purchaseId,
      userId,
      orderId: globalOrder.id,
      productId: item.productId,
      productTitle: item.productTitle,
      purchasedAt: now,
      accessStatus: "active",
      downloadLimit: 10,
      downloadCount: 0
    });
    await FirebaseRtdb.saveUserDownload(userId, downloadId, {
      id: downloadId,
      downloadId,
      orderId: globalOrder.id,
      productId: item.productId,
      productTitle: item.productTitle,
      status: "AVAILABLE",
      createdAt: now,
      downloadUrl: item.downloadUrl,
      fileSize: item.fileSize,
      fileFormat: item.fileFormat,
      licenseKey: item.licenseKey
    });
  }
  await FirebaseRtdb.setUserCart(userId, []);
  await AuditLogger.log({
    requestId: generateRequestId(),
    userId,
    orderId: globalOrder.id,
    eventType: "PAYMENT_VERIFICATION_SUCCESS",
    eventStatus: "SUCCESS",
    source: "EASEBUZZ_CALLBACK",
    metadata: { easebuzzId, amount: expectedAmount }
  });
  return { success: true, status: "PAID", orderId: globalOrder.id };
}
app.post("/api/payments/easebuzz/callback", async (req, res) => {
  try {
    const params = req.body;
    if (!verifyEasebuzzHash(params, EASEBUZZ_SALT)) {
      return res.status(400).send("Invalid signature");
    }
    const txnid = params.txnid;
    const status = params.status;
    const globalOrder = await FirebaseRtdb.getGlobalOrder(txnid);
    if (!globalOrder) {
      return res.status(404).send("Order not found");
    }
    if (status !== "success") {
      globalOrder.status = "FAILED";
      globalOrder.paymentStatus = "failed";
      globalOrder.orderStatus = "failed";
      globalOrder.failureReason = params.error_Message || "Payment failed on gateway";
      globalOrder.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await FirebaseRtdb.saveGlobalOrder(globalOrder);
      return res.redirect(`${APP_URL}/checkout?status=failed&orderId=${globalOrder.id}`);
    }
    const syncResult = await verifyAndSyncEasebuzzOrder(txnid);
    if (syncResult.success) {
      return res.redirect(`${APP_URL}/checkout?status=success&orderId=${globalOrder.id}`);
    } else {
      return res.redirect(`${APP_URL}/checkout?status=failed&orderId=${globalOrder.id}`);
    }
  } catch (err) {
    res.status(500).send("Internal server error");
  }
});
app.post("/api/payments/easebuzz/reconcile/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const cronHeader = req.headers["x-cron-secret"] || req.headers["authorization"]?.replace("Bearer ", "");
    const isCron = cronHeader && CRON_SECRET && cronHeader === CRON_SECRET;
    if (!isCron) {
      const sid = req.cookies?.sid;
      if (!sid) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }
      const payload = await AuthServiceServer.verifyOpaqueSession(sid);
      if (!payload || !payload.userId) {
        return res.status(401).json({ success: false, message: "Invalid session." });
      }
      const order = await FirebaseRtdb.getGlobalOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
      const profile = await FirebaseRtdb.getUserProfile(payload.userId);
      const isAdmin = profile && profile.role === "admin";
      if (!isAdmin && order.userId !== payload.userId) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }
    }
    const result = await verifyAndSyncEasebuzzOrder(orderId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Reconciliation failed." });
  }
});
app.post("/api/payments/easebuzz/reconcile-cron", async (req, res) => {
  try {
    const cronHeader = req.headers["x-cron-secret"] || req.headers["authorization"]?.replace("Bearer ", "");
    if (!CRON_SECRET || cronHeader !== CRON_SECRET) {
      return res.status(403).json({ success: false, message: "Unauthorized cron request." });
    }
    const allOrders = await FirebaseRtdb.getAllGlobalOrders();
    const tenMinsAgo = Date.now() - 10 * 60 * 1e3;
    const pendingOrders = allOrders.filter(
      (o) => (o.status === "PENDING_PAYMENT" || o.paymentStatus === "pending") && new Date(o.createdAt || o.date || 0).getTime() < tenMinsAgo
    );
    const results = [];
    for (const ord of pendingOrders) {
      const resSync = await verifyAndSyncEasebuzzOrder(ord.id);
      results.push({ orderId: ord.id, ...resSync });
    }
    res.json({ success: true, reconciledCount: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Cron reconciliation failed." });
  }
});
app.post("/api/downloads/:productId/token", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const productId = req.params.productId;
    const purchases = await FirebaseRtdb.getUserPurchases(userId);
    const purchase = purchases.find((p) => p.productId === productId && p.accessStatus === "active");
    if (!purchase) {
      return res.status(403).json({ success: false, message: "Active purchase license not found for this product." });
    }
    if (purchase.downloadCount >= (purchase.downloadLimit || 10)) {
      return res.status(403).json({ success: false, message: "Download limit has been reached for this product license." });
    }
    const tokenId = `DL-TOK-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const expiresAt = Date.now() + 15 * 60 * 1e3;
    const tokenData = {
      tokenId,
      userId,
      productId,
      productTitle: purchase.productName || "Digital Product",
      orderId: purchase.orderId,
      purchaseId: purchase.purchaseId,
      expiresAt,
      used: false
    };
    await FirebaseRtdb.set(`downloadTokens/${tokenId}`, tokenData);
    res.json({
      success: true,
      token: tokenId,
      expiresAt,
      downloadUrl: `/api/downloads/stream?token=${tokenId}`
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to generate download token." });
  }
});
app.get("/api/downloads/stream", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).send("Download token is required.");
    }
    const tokenData = await FirebaseRtdb.get(`downloadTokens/${token}`);
    if (!tokenData) {
      return res.status(403).send("Invalid download token.");
    }
    if (Date.now() > tokenData.expiresAt) {
      await FirebaseRtdb.delete(`downloadTokens/${token}`);
      return res.status(403).send("Download link has expired.");
    }
    if (tokenData.used) {
      return res.status(403).send("Download link has already been used.");
    }
    tokenData.used = true;
    await FirebaseRtdb.set(`downloadTokens/${token}`, tokenData);
    const purchases = await FirebaseRtdb.getUserPurchases(tokenData.userId);
    const purchase = purchases.find((p) => p.purchaseId === tokenData.purchaseId || p.productId === tokenData.productId);
    if (purchase) {
      const currentCount = purchase.downloadCount || 0;
      const limit = purchase.downloadLimit || 10;
      if (currentCount >= limit) {
        return res.status(403).send("Download limit has been reached for this license.");
      }
      purchase.downloadCount = currentCount + 1;
      await FirebaseRtdb.savePurchase(tokenData.userId, purchase.purchaseId, purchase);
    }
    const filePath = SecureFileManager.ensureProductFileExists(tokenData.productId);
    const filename = `${tokenData.productId}-package.zip`;
    SecureFileManager.streamFileToResponse(filePath, filename, res);
  } catch (err) {
    res.status(500).send("Internal server error during download.");
  }
});
app.get("/api/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const logs = await AuditLogger.getAllLogs(100);
    res.json({ success: true, logs });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch audit logs." });
  }
});
var app_default = app;

// server/vercel.ts
var vercel_default = app_default;
export {
  vercel_default as default
};
