// server/app.ts
import express from "express";
import crypto4 from "crypto";
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
  static getUrl(path2) {
    const cleanPath = path2.replace(/^\/+|\/+$/g, "");
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
  static async get(path2) {
    try {
      const url = this.getUrl(path2);
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5e3)
      });
      if (res.ok) {
        const data = await res.json();
        if (data !== null) {
          setPathValue(localStore, path2, data);
          saveLocalStore();
        }
        return data;
      }
    } catch (err) {
    }
    const cached = getPathValue(localStore, path2);
    return cached;
  }
  /**
   * Generic PUT to RTDB with local store backup
   */
  static async set(path2, data) {
    setPathValue(localStore, path2, data);
    saveLocalStore();
    try {
      const url = this.getUrl(path2);
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5e3)
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Firebase RTDB Remote Warning] ${path2} returned HTTP ${res.status}: ${errorText}. Account data saved in local persistent store.`);
      } else {
        console.log(`[Firebase RTDB Remote Success] Successfully synced ${path2} to Firebase Realtime Database.`);
      }
    } catch (err) {
      console.warn(`[Firebase RTDB Remote Offline] ${path2}: ${err?.message}. Account data saved in local persistent store.`);
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
  static async update(path2, data) {
    const updated = updatePathValue(localStore, path2, data);
    saveLocalStore();
    try {
      const url = this.getUrl(path2);
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
  static async delete(path2) {
    deletePathValue(localStore, path2);
    saveLocalStore();
    try {
      const url = this.getUrl(path2);
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
    const displayName = name && name.trim().length >= 2 ? name.trim() : cleanEmail.split("@")[0];
    const cleanNameForId = displayName.replace(/[\s\W_]+/g, "").toLowerCase();
    const frontFour = cleanMobile.slice(0, 4);
    const baseUserId = `${cleanNameForId}${frontFour}`;
    let userId = baseUserId;
    const isCollision = await FirebaseRtdb.get(`users/${userId}`);
    if (isCollision) {
      const shortSuffix = crypto.randomBytes(2).toString("hex").toLowerCase();
      userId = `${baseUserId}_${shortSuffix}`;
    }
    const cleanUsername = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || `user${cleanMobile.slice(-4)}`;
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
import crypto2 from "crypto";
import { Readable } from "node:stream";
import { File as MegaFile } from "megajs";
var downloadTokens = /* @__PURE__ */ new Map();
var SecureFileManager = class {
  /**
   * Generates a short-lived (15 minute) single-use download token
   */
  static async generateToken(params) {
    const tokenId = `DL-TOK-${crypto2.randomBytes(24).toString("base64url")}`;
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
  static getProductDownloadEnvironmentKey(productId) {
    const normalizedId = productId.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    return `PRODUCT_DOWNLOAD_URL_${normalizedId}`;
  }
  static isMegaFileUrl(sourceUrl) {
    return (sourceUrl.hostname === "mega.nz" || sourceUrl.hostname === "mega.co.nz") && sourceUrl.pathname.startsWith("/file/");
  }
  static async verifyZipStream(source) {
    const iterator = source[Symbol.asyncIterator]();
    const chunks = [];
    let bytesRead = 0;
    while (bytesRead < 4) {
      const result = await iterator.next();
      if (result.done) break;
      const chunk = Buffer.isBuffer(result.value) ? result.value : Buffer.from(result.value);
      chunks.push(chunk);
      bytesRead += chunk.length;
    }
    const initialBytes = Buffer.concat(chunks);
    const validSignature = initialBytes.length >= 4 && initialBytes[0] === 80 && initialBytes[1] === 75 && (initialBytes[2] === 3 && initialBytes[3] === 4 || initialBytes[2] === 5 && initialBytes[3] === 6 || initialBytes[2] === 7 && initialBytes[3] === 8);
    if (!validSignature) {
      source.destroy();
      throw new Error("Configured download source is not a valid ZIP file.");
    }
    async function* replay() {
      try {
        yield initialBytes;
        while (true) {
          const result = await iterator.next();
          if (result.done) return;
          yield Buffer.isBuffer(result.value) ? result.value : Buffer.from(result.value);
        }
      } finally {
        await iterator.return?.();
      }
    }
    return Readable.from(replay());
  }
  /**
   * Opens and verifies a server-only HTTPS ZIP source. MEGA shared-file URLs
   * are decrypted on the server; no source URL is returned to the browser.
   */
  static async openProductFile(productId) {
    const environmentKey = this.getProductDownloadEnvironmentKey(productId);
    const configuredUrl = process.env[environmentKey] || process.env.PRODUCT_DOWNLOAD_URL;
    if (!configuredUrl) {
      throw new Error(`Download source is not configured. Set ${environmentKey} in Vercel.`);
    }
    let sourceUrl;
    try {
      sourceUrl = new URL(configuredUrl);
    } catch {
      throw new Error(`${environmentKey} must contain a valid HTTPS URL.`);
    }
    if (sourceUrl.protocol !== "https:") {
      throw new Error(`${environmentKey} must use HTTPS.`);
    }
    if (sourceUrl.hostname === "mega.nz" || sourceUrl.hostname === "mega.co.nz") {
      if (!this.isMegaFileUrl(sourceUrl) || !sourceUrl.hash) {
        throw new Error(`${environmentKey} must contain a complete MEGA file link, including its key.`);
      }
      const megaFile = MegaFile.fromURL(configuredUrl);
      if (megaFile.directory) {
        throw new Error(`${environmentKey} must point to a MEGA file, not a folder.`);
      }
      await megaFile.loadAttributes();
      const contentLength2 = megaFile.size;
      if (!Number.isSafeInteger(contentLength2) || contentLength2 <= 0) {
        throw new Error("Configured MEGA file has an invalid size.");
      }
      return {
        stream: await this.verifyZipStream(megaFile.download({})),
        contentLength: contentLength2
      };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3e4);
    let upstream;
    try {
      upstream = await fetch(sourceUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Configured download source returned HTTP ${upstream.status}.`);
    }
    const contentLengthHeader = upstream.headers.get("content-length");
    const contentLength = !upstream.headers.has("content-encoding") && contentLengthHeader && /^\d+$/.test(contentLengthHeader) ? Number(contentLengthHeader) : void 0;
    return {
      stream: await this.verifyZipStream(Readable.fromWeb(upstream.body)),
      contentLength
    };
  }
  /**
   * Proxies the configured ZIP through the authenticated API response.
   */
  static streamProductFileToResponse(source, filename, res) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const headers = {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Content-Type-Options": "nosniff"
    };
    if (Number.isSafeInteger(source.contentLength) && source.contentLength > 0) {
      headers["Content-Length"] = String(source.contentLength);
    }
    res.writeHead(200, headers);
    source.stream.on("error", (error) => res.destroy(error));
    source.stream.pipe(res);
  }
};

// src/data/products.ts
var linknestCover = "/product-images/linknest-pro.jpg";
var neuraAiCover = "/product-images/neura-ai.png";
var finoraCover = "/product-images/finora.png";
var learnifyCover = "/product-images/learnify.png";
var veloraCover = "/product-images/velora.png";
var workhubCover = "/product-images/workhub.png";
var PRODUCTS = [
  {
    id: "linknest-pro",
    slug: "linknest-pro",
    title: "LinkNest Pro \u2014 Bio Link & Digital Store",
    shortDescription: "Create your own professional bio link page and showcase your digital products, social links, WhatsApp, email and payment links \u2014 all in one place.",
    description: "LinkNest Pro is a modern, responsive personal bio and digital-store website template designed for creators, freelancers, developers, influencers and small businesses.\n\nTurn one simple link into your own professional online profile where visitors can:\n\n\u{1F464} View your profile & bio\n\u{1F517} Access all your important links\n\u{1F4F1} Connect through WhatsApp\n\u{1F4E7} Contact you by email\n\u{1F310} Visit your website and social profiles\n\u{1F6CD}\uFE0F Browse your digital products\n\u{1F4B0} See product prices\n\u{1F525} Click Buy Now and continue to your payment/checkout page\n\nNo monthly subscription. No framework required. Just customize, deploy and use.",
    category: "templates",
    categoryLabel: "Website Templates",
    productType: "DOWNLOAD",
    price: 550,
    originalPrice: 999,
    rating: 4.9,
    reviewCount: 42,
    image: linknestCover,
    gallery: [
      linknestCover
    ],
    fileFormat: "HTML, CSS, JS (ZIP Archive)",
    fileSize: "6.7 KB",
    downloadUrl: "/downloads/linknest-pro-template.zip",
    previewUrl: "/demos/linknest-pro/",
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
      "Setup and customization guide"
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
  },
  {
    id: "neura-ai",
    slug: "neura-ai",
    title: "NeuraAI \u2014 Premium AI SaaS Template",
    shortDescription: "A premium, modern AI SaaS website template designed for AI startups, automation platforms, productivity tools, and next-generation software products.",
    description: "NeuraAI \u2014 Premium AI SaaS Website is a professionally designed, modern website template built for AI startups, SaaS companies, automation platforms, AI tools, and technology products.\n\nIt combines a sophisticated visual system with clear product storytelling, feature sections, pricing layouts, integrations, testimonials, FAQs, and conversion-focused call-to-action sections.\n\nThe template is designed to help you launch a professional AI/SaaS website quickly while keeping the codebase clean, responsive, customizable, and deployment-ready.\n\nWhether you're launching an AI writing tool, automation platform, productivity application, analytics product, or another SaaS product, NeuraAI provides a strong foundation that can be customized to your brand.",
    category: "templates",
    categoryLabel: "Website Templates",
    productType: "DOWNLOAD",
    price: 750,
    originalPrice: 1500,
    rating: 5,
    reviewCount: 18,
    image: neuraAiCover,
    gallery: [
      neuraAiCover
    ],
    fileFormat: "React/Vite-ready (ZIP Archive)",
    fileSize: "1.2 MB",
    downloadUrl: "/downloads/neura-ai-template.zip",
    previewUrl: "/demos/neura-ai/",
    version: "1.0.0",
    features: [
      "\u{1F916} AI SaaS Design: Modern interface specifically designed for AI and SaaS products.",
      "\u{1F319} Dark Modern UI: Premium dark-first visual system with subtle gradients, borders, and modern typography.",
      "\u26A1 SaaS Product Sections: Professionally structured sections for AI features, use cases, pricing, and integrations.",
      "\u{1F4CA} Dashboard Preview: Realistic dashboard-style interface with analytics, AI workspace, and metrics.",
      "\u{1F4B3} Pricing Section: Ready-made monthly/yearly pricing structure for Free, Pro, Business, and Enterprise.",
      "\u{1F4F1} Fully Responsive: Optimized layout for desktop, laptop, tablet, and mobile browsers."
    ],
    whatsIncluded: [
      "React & Vite-ready source structure",
      "CSS/Tailwind styling layout config",
      "Reusable premium UI components",
      "Responsive dashboard preview mockups",
      "Feature icons & SVG assets",
      "Demo content and configuration",
      "Full deployment & customization guides"
    ],
    requirements: [
      "Modern desktop or laptop",
      "Node.js 18+ and npm 9+",
      "VS Code or another code editor",
      "Modern web browser (Chrome, Edge, Firefox, Safari)"
    ],
    faqs: [
      {
        question: "What is NeuraAI?",
        answer: "NeuraAI is a premium AI SaaS website template designed for AI startups, SaaS businesses, automation tools, productivity platforms, and technology products."
      },
      {
        question: "Is this a complete website template?",
        answer: "Yes. The package contains the editable website source files and required frontend assets."
      },
      {
        question: "Can I change the brand name?",
        answer: "Yes. You can replace the NeuraAI branding with your own company, product, or startup name."
      },
      {
        question: "Can I change the colors and design?",
        answer: "Yes. The styling is customizable, allowing you to modify colors, typography, spacing, content, and other visual elements."
      },
      {
        question: "Is it mobile responsive?",
        answer: "Yes. The website is designed to adapt to desktop, tablet, and mobile screen sizes."
      },
      {
        question: "Can I deploy it on Vercel?",
        answer: "Yes. The project is designed to be compatible with Vercel deployment."
      },
      {
        question: "Can I use it for my SaaS business?",
        answer: "Yes. You can customize the template for your own SaaS, AI, software, automation, or technology project. The original package may not be redistributed or resold as a competing product."
      },
      {
        question: "Does it include a real AI backend?",
        answer: "No. NeuraAI is a frontend website template. AI APIs, authentication, databases, subscriptions, and other backend services need to be connected separately if required."
      },
      {
        question: "Does it include a real payment gateway?",
        answer: "No. The template provides the frontend pricing/checkout presentation. A real payment provider must be integrated separately."
      },
      {
        question: "Can I connect my own API?",
        answer: "Yes. The frontend structure can be connected to your own API, backend, database, AI provider, authentication system, or other services."
      },
      {
        question: "Do I need coding knowledge?",
        answer: "Basic web-development knowledge is recommended for advanced customization. The included documentation can help with setup and deployment."
      },
      {
        question: "Are the included images and content real?",
        answer: "Demo content is fictional and intended for showcasing the template. Replace it with your own content and assets you have permission to use before publishing."
      },
      {
        question: "Can I sell this template again?",
        answer: "No. You may customize the purchased template for your own project, but you should not redistribute, resell, or repackage the original source files as another competing template."
      },
      {
        question: "Is technical support included?",
        answer: "Product-specific support can be provided according to the support terms listed on the product page."
      },
      {
        question: "Is a refund available?",
        answer: "Digital-product refund eligibility is subject to the store's published Refund & Cancellation Policy and applicable payment-provider/legal requirements."
      }
    ],
    status: "active",
    tags: ["AI SaaS", "Website Template", "React", "Tailwind CSS", "Dark Mode", "Product Dashboard", "SaaS Landing Page"],
    isFeatured: true,
    isNew: true,
    releasedAt: "2026-09-22",
    updatedAt: "2026-09-22"
  },
  {
    id: "finora",
    slug: "finora",
    title: "Finora \u2014 Premium Fintech Template",
    shortDescription: "Build a professional fintech presence with Finora \u2014 a modern responsive website template for digital banking, payments, investment platforms, financial SaaS, wallets and finance applications.",
    description: "Finora is a professional fintech website template created for modern financial technology businesses that need a trustworthy, premium, and conversion-focused online presence.\n\nThe design combines a clean financial interface with modern dashboards, analytics, payment-focused sections, investment visuals, pricing layouts, feature showcases, and responsive components.\n\nWhether you are launching a fintech startup, digital banking platform, digital wallet, or a financial SaaS, Finora provides a high-quality frontend starting point that saves dozens of hours of design and development time.",
    category: "templates",
    categoryLabel: "Website Templates",
    productType: "DOWNLOAD",
    price: 1100,
    originalPrice: 1999,
    rating: 4.9,
    reviewCount: 34,
    image: finoraCover,
    gallery: [
      finoraCover
    ],
    fileFormat: "React/Vite-ready (ZIP Archive)",
    fileSize: "1.4 MB",
    downloadUrl: "/downloads/finora-template.zip",
    previewUrl: "/demos/finora/",
    version: "1.0.0",
    features: [
      "\u{1F4B3} Fintech-Focused Design: Designed specifically around modern financial technology products and services.",
      "\u{1F4CA} Financial Dashboard: Professional dashboard layouts for displaying balances, transactions, and account activity.",
      "\u{1F4C8} Analytics & Charts: Visual sections suitable for financial analytics, trends, and business metrics.",
      "\u{1F4B0} Payment UI: Modern interfaces for presenting transfers, payments, balances, and payment-related workflows.",
      "\u{1F510} Authentication Pages: Ready-made professional screens for Login and Sign Up screens.",
      "\u{1F4F1} Fully Responsive: Mobile-first optimized layouts for desktop, tablet, and mobile browsers.",
      "\u{1F319} Dark & Light Mode: Premium visual modes to match different user preferences."
    ],
    whatsIncluded: [
      "Complete React & Vite website structure",
      "JavaScript responsive source files",
      "Sleek Tailwind & CSS theme config",
      "Reusable premium UI components",
      "Pricing layout sections for subscription SaaS",
      "FAQ, Testimonials, and Contact form layouts",
      "Custom Fintech SVG icons and illustration elements",
      "Detailed customization & deployment guidance"
    ],
    requirements: [
      "Modern Windows, macOS, or Linux computer",
      "Node.js 18+ and npm 9+",
      "Git installed (recommended)",
      "VS Code or another modern text editor",
      "Modern web browser (Chrome, Edge, Firefox, Safari)"
    ],
    faqs: [
      {
        question: "What is Finora?",
        answer: "Finora is a premium fintech website template designed for financial technology startups, digital banking products, payment platforms, investment applications, and financial SaaS businesses."
      },
      {
        question: "Is Finora a complete banking application?",
        answer: "No. Finora is a frontend website/template. Banking APIs, payment processing, authentication infrastructure, KYC, financial data providers, and backend services must be integrated separately."
      },
      {
        question: "Can I customize the brand name?",
        answer: "Yes. You can replace the Finora branding, logo, colors, text, images, pricing and other content with your own brand."
      },
      {
        question: "Can I connect my own API?",
        answer: "Yes. The frontend structure can be connected to your own backend APIs, payment services, financial-data providers, authentication system, or database."
      },
      {
        question: "Is payment processing included?",
        answer: "No. The template provides payment/transaction-related UI. A real payment gateway or financial API must be integrated separately."
      },
      {
        question: "Is it responsive?",
        answer: "Yes. The design is intended to work across desktop, tablet and mobile screen sizes."
      },
      {
        question: "Can I deploy it on Vercel?",
        answer: "Yes. The project can be configured and deployed through a standard GitHub + Vercel workflow."
      },
      {
        question: "Can I use Finora for a fintech SaaS?",
        answer: "Yes. The UI can be customized for fintech SaaS, payment platforms, finance management tools, investment products and similar applications."
      },
      {
        question: "Does Finora include a real financial backend?",
        answer: "No. It is a website template. Real financial operations require your own secure backend and appropriate third-party services."
      },
      {
        question: "Can I change the colors and layout?",
        answer: "Yes. The components, styling and visual system can be customized according to your brand."
      },
      {
        question: "Is the financial data real?",
        answer: "No. Any financial figures or transaction information included in the template are demonstration content only."
      },
      {
        question: "Can I resell the template?",
        answer: "The source package may be customized for your own project, but it should not be redistributed or resold as a competing template."
      }
    ],
    status: "active",
    tags: ["Fintech", "Fintech SaaS", "Digital Banking", "Payment Gateway", "Landing Page", "React Template", "Tailwind CSS"],
    isFeatured: true,
    isNew: true,
    releasedAt: "2026-09-22",
    updatedAt: "2026-09-22"
  },
  {
    id: "learnify",
    slug: "learnify",
    title: "Learnify \u2014 Premium LMS Template",
    shortDescription: "Build a professional e-learning experience with Learnify \u2014 a modern responsive website template for online courses, instructors, academies, coaching businesses and digital education platforms.",
    description: "Learnify is a premium online education and Learning Management System (LMS) website template designed to create a professional learning experience for students, instructors, and education businesses.\n\nThe template provides a complete visual foundation for showcasing courses, instructors, learning paths, student progress, lessons, quizzes, certificates, pricing plans, and educational content.\n\nWhether you are launching an online academy, code camp, corporate training portal, or a coaching website, Learnify gives you a clean modern starting point with modular, reusable layouts.",
    category: "templates",
    categoryLabel: "Website Templates",
    productType: "DOWNLOAD",
    price: 1400,
    originalPrice: 2499,
    rating: 4.9,
    reviewCount: 26,
    image: learnifyCover,
    gallery: [
      learnifyCover
    ],
    fileFormat: "React/Vite-ready (ZIP Archive)",
    fileSize: "1.6 MB",
    downloadUrl: "/downloads/learnify-template.zip",
    previewUrl: "/demos/learnify/",
    version: "1.0.0",
    features: [
      "\u{1F393} Complete E-Learning Design: A professional education-focused interface designed around online courses.",
      "\u{1F4DA} Course Catalog: Showcase courses with categories, instructors, ratings, pricing, and difficulty levels.",
      "\u{1F50E} Course Search & Filters: Allow students to discover courses using real-time search and category filtering.",
      "\u{1F468}\u200D\u{1F3EB} Instructor Profiles: Dedicated instructor layouts for displaying biography, expertise, courses, and rating metrics.",
      "\u{1F4CA} Student Dashboard: A clean dashboard concept for displaying enrolled courses, recently accessed lessons, and progress indicators.",
      "\u{1F4DD} Lessons & Curriculum Layouts: Dedicated templates for video lessons, curriculum modules, and interactive learning materials.",
      "\u{1F3C6} Quiz & Certificate UI: Built-in layout blocks for rendering course assessments and completion certificates."
    ],
    whatsIncluded: [
      "Complete React & Vite educational structure",
      "JavaScript responsive source components",
      "Sleek Tailwind & CSS course interface configurations",
      "Modular student and instructor dashboards",
      "Quiz/assessment and certificate interfaces",
      "Interactive course categorization templates",
      "Course wishlist and bookmark layouts",
      "Detailed customization & Vercel deployment guides"
    ],
    requirements: [
      "Windows, macOS, or Linux computer",
      "Node.js 18+ and npm 9+",
      "Git installed (recommended)",
      "VS Code or another modern code editor",
      "Modern web browser (Chrome, Edge, Firefox, Safari)"
    ],
    faqs: [
      {
        question: "What is Learnify?",
        answer: "Learnify is a premium online course and e-learning website template designed for educators, instructors, academies, training companies and LMS businesses."
      },
      {
        question: "Is Learnify a complete LMS?",
        answer: "No. Learnify is primarily a frontend website/template. A production LMS backend, database, authentication, video hosting and course-management system need to be integrated separately."
      },
      {
        question: "Can I sell courses using Learnify?",
        answer: "Yes. The UI can be customized for paid courses, subscriptions, memberships or other education business models. Real payment functionality requires integration with your preferred payment gateway."
      },
      {
        question: "Does it include real course videos?",
        answer: "No. Demo course content is placeholder content. You can connect your own video hosting or learning-content system."
      },
      {
        question: "Can I connect my own backend?",
        answer: "Yes. The frontend can be connected to your own API, database, authentication system and LMS backend."
      },
      {
        question: "Can I customize the branding?",
        answer: "Yes. You can change the logo, brand name, colors, typography, images, course information and other content."
      },
      {
        question: "Is Learnify mobile responsive?",
        answer: "Yes. The interface is designed for desktop, tablet and mobile screen sizes."
      },
      {
        question: "Can I deploy Learnify on Vercel?",
        answer: "Yes. The project can be configured for deployment through GitHub and Vercel."
      },
      {
        question: "Does Learnify include authentication?",
        answer: "It includes authentication UI screens such as Login and Registration. Real authentication functionality requires backend/API integration."
      },
      {
        question: "Does it include a payment gateway?",
        answer: "No. Payment-related UI can be included, but real payment processing must be connected separately."
      },
      {
        question: "Can I use it for a coaching website?",
        answer: "Yes. Learnify can be adapted for coaching programs, training businesses, workshops, academies and instructor-led education platforms."
      },
      {
        question: "Can I use it for a school or university?",
        answer: "Yes. The UI can be customized for schools, universities, training centers and educational institutions."
      },
      {
        question: "Can I change the courses and instructors?",
        answer: "Yes. All demo course and instructor information should be replaced with your own content."
      },
      {
        question: "Can I resell the source code?",
        answer: "The source may be customized for your own project, but it should not be redistributed or resold as a competing template."
      }
    ],
    status: "active",
    tags: ["LMS", "E-learning", "Online Course", "Website Template", "React", "Tailwind CSS", "Education Portal", "Course Dashboard"],
    isFeatured: true,
    isNew: true,
    releasedAt: "2026-09-22",
    updatedAt: "2026-09-22"
  },
  {
    id: "velora",
    slug: "velora",
    title: "Velora \u2014 Complete E-Commerce Template",
    shortDescription: "Build a premium online shopping experience with Velora \u2014 a complete responsive e-commerce frontend for fashion, electronics, beauty, lifestyle, accessories and modern retail brands.",
    description: "Velora is a premium complete e-commerce frontend template designed to provide a polished, high-end online shopping experience.\n\nInstead of being just a simple e-commerce landing page, Velora includes the complete customer-facing shopping journey \u2014 from discovering products and browsing categories to product details, wishlist, cart, checkout, account management and order tracking.\n\nIts modern visual system combines premium typography, spacious layouts, product-focused imagery, smooth interactions, responsive components and a conversion-focused shopping experience.",
    category: "templates",
    categoryLabel: "Website Templates",
    productType: "DOWNLOAD",
    price: 5500,
    originalPrice: 9999,
    rating: 5,
    reviewCount: 42,
    image: veloraCover,
    gallery: [
      veloraCover
    ],
    fileFormat: "React/Vite-ready (ZIP Archive)",
    fileSize: "2.1 MB",
    downloadUrl: "/downloads/velora-template.zip",
    previewUrl: "/demos/velora/",
    version: "1.0.0",
    features: [
      "\u{1F6CD}\uFE0F Complete Shopping Experience: A complete frontend shopping flow from product discovery to checkout and order confirmation.",
      "\u{1F6D2} Product Catalog: Professional product grid with image sliders, discount pricing, wishlist toggles, and Quick View triggers.",
      "\u{1F50E} Search, Filtering & Sorting: Advanced sidebar search, sorting metrics, and filter options by price, rating, brand, and size.",
      "\u{1F455} Product Variants: Full UI options for colors, sizes, variant styles, and custom product quantities.",
      "\u{1F6D2} Drawer Mini Cart & Checkout: Fully designed mini cart drawer with complete order summary and responsive checkout fields.",
      "\u{1F464} Customer Account Pages: Account dashboard detailing customer profile, order history, addresses, and order tracking timeline.",
      "\u{1F4F1} Fully Responsive: Optimized design for desktop, laptop, tablet, and mobile shopping devices."
    ],
    whatsIncluded: [
      "Complete React & Vite storefront structure",
      "JavaScript responsive source components",
      "Premium CSS & Tailwind styling settings",
      "Curated mockup product datasets & assets",
      "Fully designed cart, checkout, and wishlist states",
      "Customer order tracking visual components",
      "Authentication UI (Login, Signup, Forgot password)",
      "Detailed installation, Vercel setup, and customization guides"
    ],
    requirements: [
      "Windows, macOS, or Linux computer",
      "Node.js 18+ and npm 9+",
      "Git installed (recommended)",
      "VS Code or another modern text editor",
      "Modern web browser (Chrome, Edge, Firefox, Safari)"
    ],
    faqs: [
      {
        question: "What is Velora?",
        answer: "Velora is a premium complete e-commerce frontend template designed for modern online stores and retail brands."
      },
      {
        question: "Is Velora a complete e-commerce backend?",
        answer: "No. Velora provides the frontend shopping experience. Backend services such as databases, authentication, inventory, order processing and payment processing need to be integrated separately."
      },
      {
        question: "Can I use Velora for my clothing store?",
        answer: "Yes. Velora is suitable for clothing, fashion, footwear, accessories and other retail businesses."
      },
      {
        question: "Can I use it for electronics?",
        answer: "Yes. The product catalog and product-detail structure can be customized for electronics and technology products."
      },
      {
        question: "Does it include a payment gateway?",
        answer: "No. The checkout contains payment-related UI. A real payment gateway must be connected separately."
      },
      {
        question: "Does it include real authentication?",
        answer: "The package includes authentication UI screens. Real user authentication requires a backend or authentication service."
      },
      {
        question: "Can I connect Firebase or my own API?",
        answer: "Yes. The frontend structure can be connected to Firebase, REST APIs, GraphQL APIs or another backend system."
      },
      {
        question: "Does it include an admin panel?",
        answer: "The standard Velora package focuses on the customer-facing e-commerce store. An admin dashboard can be developed separately or added as an extended version."
      },
      {
        question: "Can I change the products?",
        answer: "Yes. Demo products, images, prices, categories, descriptions and other content can be replaced with your own products."
      },
      {
        question: "Can I change the branding?",
        answer: "Yes. You can customize the logo, colors, typography, content, images and overall visual identity."
      },
      {
        question: "Is Velora mobile responsive?",
        answer: "Yes. The design is optimized for mobile, tablet and desktop shopping experiences."
      },
      {
        question: "Can I deploy it on Vercel?",
        answer: "Yes. Velora is structured for a standard GitHub + Vercel deployment workflow."
      },
      {
        question: "Can I connect a real payment system?",
        answer: "Yes. The checkout frontend can be connected to a compatible payment gateway through a secure backend integration."
      },
      {
        question: "Can I connect a real inventory system?",
        answer: "Yes. Product and inventory data can be connected through your own backend/API."
      },
      {
        question: "Are the products and prices real?",
        answer: "No. Demo products, prices, customer information and order data are placeholder content intended to demonstrate the template."
      },
      {
        question: "Can I resell the template?",
        answer: "The source code may be customized for your own project, but it should not be redistributed or sold as a competing template."
      }
    ],
    status: "active",
    tags: ["E-Commerce", "Shopping Cart", "Store Template", "React Template", "Tailwind CSS", "Checkout UI", "Product Catalog", "D2C Store"],
    isFeatured: true,
    isNew: true,
    releasedAt: "2026-09-22",
    updatedAt: "2026-09-22"
  },
  {
    id: "workhub",
    slug: "workhub",
    title: "WorkHub \u2014 Freelancer Marketplace Template",
    shortDescription: "Build a complete Fiverr-style freelance marketplace with WorkHub \u2014 a premium React frontend template featuring buyer accounts, seller profiles, service listings, packages, orders, messaging, reviews, analytics, earnings and admin dashboard.",
    description: "WorkHub is a premium freelancer marketplace website template designed for businesses that want to build their own online freelance platform.\n\nThe template provides a complete marketplace experience where users can register as buyers, sellers, or both. Buyers can discover freelancers and services, compare packages, place orders, communicate with sellers and manage their projects. Sellers can create professional profiles, publish services, manage orders, communicate with clients and monitor their earnings and performance.\n\nWorkHub includes the complete frontend experience for a modern freelance marketplace, from user registration and service discovery to checkout, order management, messaging, reviews, seller analytics and platform administration.",
    category: "templates",
    categoryLabel: "Website Templates",
    productType: "DOWNLOAD",
    price: 7500,
    originalPrice: 19999,
    rating: 4.9,
    reviewCount: 15,
    image: workhubCover,
    gallery: [
      workhubCover
    ],
    fileFormat: "React/Vite-ready (ZIP Archive)",
    fileSize: "3.4 MB",
    downloadUrl: "/downloads/workhub-template.zip",
    previewUrl: "/demos/workhub/",
    version: "1.0.0",
    features: [
      "\u{1F464} Dual Buyer & Seller accounts: Smooth seller onboarding with profile bio, custom skills, languages, education and certs.",
      "\u{1F6CD}\uFE0F Professional Gig & Service Market: Categorized service explorer with basic, standard, and premium package comparison tables.",
      "\u{1F4AC} Multi-mode Instant Chat UI: Elegant messaging layout for buyer-seller discussion with chat list, status cues and order linkages.",
      "\u{1F4E6} Complete Order Workflow: Order lifecycle showing order timelines, active milestones, revision requests, and completion cues.",
      "\u{1F4C8} Advanced Seller Analytics: Insight dashboards demonstrating clicks, conversions, gig impressions, and earnings charts.",
      "\u{1F6E0}\uFE0F Full Platform Admin Panel: Complete backend-ready frontend management console for platform metrics, users, services, orders, and reports."
    ],
    whatsIncluded: [
      "Complete React & Vite marketplace structure",
      "JavaScript fully responsive source pages",
      "Highly flexible Tailwind CSS UI styles",
      "Interactive buyer dashboard pages",
      "Comprehensive seller dashboard and stats consoles",
      "Advanced platform admin management UI console",
      "Mock marketplace service datasets & assets",
      "Comprehensive step-by-step launch & deployment guides"
    ],
    requirements: [
      "Windows, macOS, or Linux computer",
      "Node.js 18+ and npm 9+",
      "Git installed (recommended)",
      "VS Code or another modern text editor",
      "Modern web browser (Chrome, Edge, Firefox, Safari)"
    ],
    faqs: [
      {
        question: "Is this a complete Fiverr clone?",
        answer: "No. WorkHub is an original freelancer marketplace frontend template inspired by common marketplace workflows."
      },
      {
        question: "Does it include real authentication?",
        answer: "No. Authentication UI and demo account flows are included. A real authentication backend must be connected."
      },
      {
        question: "Does it include real payment gateway integration?",
        answer: "No. Checkout and payment screens are frontend/demo UI only."
      },
      {
        question: "Can users become sellers?",
        answer: "Yes. The template includes seller onboarding and seller profile creation flows."
      },
      {
        question: "Can sellers create services?",
        answer: "Yes. Sellers can create Basic, Standard and Premium service packages through the frontend UI."
      },
      {
        question: "Is real-time chat included?",
        answer: "No. The complete chat interface is included, but a real-time messaging backend is required."
      },
      {
        question: "Is an admin panel included?",
        answer: "Yes. WorkHub includes a complete admin dashboard frontend."
      },
      {
        question: "Can I connect Firebase or another backend?",
        answer: "Yes. The frontend is structured so you can connect your own API, database and authentication system."
      },
      {
        question: "Is it mobile responsive?",
        answer: "Yes. The marketplace, dashboards, service pages, checkout and messaging interfaces are designed for desktop, tablet and mobile."
      },
      {
        question: "Can I deploy it on Vercel?",
        answer: "Yes. WorkHub is designed to be GitHub and Vercel compatible."
      },
      {
        question: "Are the users and services real?",
        answer: "No. Demo users, sellers, services and orders are fictional sample data."
      },
      {
        question: "Are seller payouts real?",
        answer: "No. Earnings and withdrawal pages are frontend UI demonstrations."
      },
      {
        question: "Can I customize the branding?",
        answer: "Yes. You can change the logo, colors, typography, categories, services, content and branding."
      },
      {
        question: "Is technical support included?",
        answer: "Basic setup/customization documentation is included. Backend development and custom integrations are not included unless separately provided."
      }
    ],
    status: "active",
    tags: ["Freelancer", "Marketplace", "Fiverr Clone", "SaaS platform", "React Template", "Tailwind CSS", "Seller Dashboard", "Buyer Dashboard"],
    isFeatured: true,
    isNew: true,
    releasedAt: "2026-09-22",
    updatedAt: "2026-09-22"
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

// server/productPreview.ts
var BLOCKED_PREVIEW_HOSTS = /* @__PURE__ */ new Set(["vercel.app"]);
var LOCAL_PREVIEW_PATH = /^\/demos\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
function normalizeProductPreviewUrl(value, productId) {
  if (typeof value !== "string" || value.trim() === "") return void 0;
  const previewUrl = value.trim();
  if (LOCAL_PREVIEW_PATH.test(previewUrl)) {
    if (typeof productId === "string" && previewUrl !== `/demos/${productId}/`) return void 0;
    return previewUrl;
  }
  if (previewUrl.startsWith("/")) return void 0;
  try {
    const url = new URL(previewUrl);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return void 0;
    if (hostname === "localhost" || hostname.endsWith(".localhost")) return void 0;
    if (BLOCKED_PREVIEW_HOSTS.has(hostname) || hostname.endsWith(".vercel.app")) return void 0;
    url.hash = "";
    return url.toString();
  } catch {
    return void 0;
  }
}
function isAllowedProductPreviewUrl(value) {
  return normalizeProductPreviewUrl(value) !== void 0;
}

// server/adminRoutes.ts
var adminRouter = Router();
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});
var previewUrlSchema = z.union([z.literal(""), z.string().trim().max(2048)]).optional().refine(
  (value) => !value || isAllowedProductPreviewUrl(value),
  "Live preview must use an HTTPS custom domain. Direct *.vercel.app URLs are not allowed."
).transform((value) => value?.trim() || void 0);
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
  features: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  faqs: z.array(z.any()).optional(),
  previewUrl: previewUrlSchema
}).superRefine((product, context) => {
  if (product.previewUrl?.startsWith("/") && product.previewUrl !== `/demos/${product.id}/`) {
    context.addIssue({
      code: "custom",
      path: ["previewUrl"],
      message: `Built-in preview path must match this product ID: /demos/${product.id}/`
    });
  }
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
      const isPaid = String(o.paymentStatus).toUpperCase() === "PAID";
      if (isPaid) {
        totalRevenue += amount;
        if (now - orderTime <= oneDay) revenueToday += amount;
        if (now - orderTime <= sevenDays) revenue7d += amount;
        if (now - orderTime <= thirtyDays) revenue30d += amount;
        paidCount++;
      } else if (String(o.paymentStatus).toUpperCase() === "FAILED") {
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
    const bucket = process.env.FIREBASE_STORAGE_BUCKET || "freefireshop.appspot.com";
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
      const totalSpent = userOrders.reduce(
        (sum, o) => sum + (String(o.paymentStatus).toUpperCase() === "PAID" ? o.total : 0),
        0
      );
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

// server/productCatalog.ts
var HIDDEN_PRODUCT_STATUSES = /* @__PURE__ */ new Set(["archived", "draft", "inactive"]);
function isBrowserSafeAssetUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  const url = value.trim();
  return url.startsWith("/") && !url.startsWith("//") || /^https:\/\//i.test(url);
}
function normalizeGallery(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isBrowserSafeAssetUrl);
}
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim() !== "");
}
function normalizeProductAssets(product, fallback) {
  const safeImage = isBrowserSafeAssetUrl(product?.image) ? product.image.trim() : isBrowserSafeAssetUrl(fallback?.image) ? fallback.image.trim() : "";
  const productGallery = normalizeGallery(product?.gallery);
  const fallbackGallery = normalizeGallery(fallback?.gallery);
  const normalized = {
    ...product,
    title: typeof product?.title === "string" && product.title.trim() ? product.title.trim() : String(product?.id || "Untitled Product"),
    slug: typeof product?.slug === "string" && product.slug ? product.slug : product?.id,
    shortDescription: typeof product?.shortDescription === "string" ? product.shortDescription : "",
    description: typeof product?.description === "string" ? product.description : "",
    category: typeof product?.category === "string" && product.category ? product.category : "other",
    categoryLabel: typeof product?.categoryLabel === "string" && product.categoryLabel ? product.categoryLabel : product?.category || "Digital Product",
    productType: typeof product?.productType === "string" && product.productType ? product.productType : "DOWNLOAD",
    price: Number.isFinite(Number(product?.price)) ? Number(product.price) : Number(fallback?.price || 0),
    image: safeImage,
    gallery: productGallery.length > 0 ? productGallery : fallbackGallery,
    tags: normalizeStringArray(product?.tags),
    features: normalizeStringArray(product?.features),
    requirements: normalizeStringArray(product?.requirements),
    whatsIncluded: normalizeStringArray(product?.whatsIncluded),
    faqs: Array.isArray(product?.faqs) ? product.faqs : [],
    previewUrl: normalizeProductPreviewUrl(product?.previewUrl, product?.id) || normalizeProductPreviewUrl(fallback?.previewUrl, fallback?.id)
  };
  delete normalized.licenseTypes;
  delete normalized.licenseTerms;
  delete normalized.extendedPrice;
  return normalized;
}
function mergeProductCatalog(staticProducts, databaseProducts) {
  const catalog = /* @__PURE__ */ new Map();
  for (const product of staticProducts || []) {
    if (!product?.id || typeof product.id !== "string") continue;
    catalog.set(product.id, normalizeProductAssets(product));
  }
  for (const databaseProduct of databaseProducts || []) {
    if (!databaseProduct?.id || typeof databaseProduct.id !== "string") continue;
    const staticProduct = catalog.get(databaseProduct.id);
    const merged = staticProduct ? { ...staticProduct, ...databaseProduct } : { ...databaseProduct };
    catalog.set(databaseProduct.id, normalizeProductAssets(merged, staticProduct));
  }
  return Array.from(catalog.values()).filter((product) => {
    const status = String(product.status || "active").toLowerCase();
    return !HIDDEN_PRODUCT_STATUSES.has(status);
  });
}

// server/seed.ts
async function runServerSeed() {
  try {
    const existingProducts = await FirebaseRtdb.get("products");
    const existingProductList = existingProducts ? Array.isArray(existingProducts) ? existingProducts : Object.values(existingProducts) : [];
    const existingById = new Map(
      existingProductList.filter((product) => product?.id).map((product) => [product.id, product])
    );
    for (const p of PRODUCTS) {
      const prod = normalizeProductAssets(p);
      const existing = existingById.get(prod.id);
      if (!existing) {
        const productRecord = {
          ...prod,
          createdAt: prod.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          status: "published",
          stock: prod.stock !== void 0 ? prod.stock : 999,
          unlimitedStock: true
        };
        await FirebaseRtdb.set(`products/${prod.id}`, productRecord);
        continue;
      }
      const hasUnsafeImage = !isBrowserSafeAssetUrl(existing.image);
      const hasUnsafeGallery = !Array.isArray(existing.gallery) || existing.gallery.length === 0 || existing.gallery.some((item) => !isBrowserSafeAssetUrl(item));
      const hasLegacyLicenseFields = "licenseTypes" in existing || "licenseTerms" in existing || "extendedPrice" in existing;
      if (hasUnsafeImage || hasUnsafeGallery || hasLegacyLicenseFields) {
        const repaired = normalizeProductAssets(existing, prod);
        await FirebaseRtdb.set(`products/${prod.id}`, repaired);
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

// server/purchaseEmail.ts
import crypto3 from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
var getAppUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
var escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
var toPdfText = (value) => String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "?");
var money = (value) => `INR ${Number(value || 0).toFixed(2)}`;
var createEmailDownloadToken = () => crypto3.randomBytes(32).toString("base64url");
var hashEmailDownloadToken = (token) => crypto3.createHash("sha256").update(token).digest("hex");
var getPurchaseEmailLinkTtlMs = () => {
  const configuredHours = Number(process.env.PURCHASE_EMAIL_LINK_TTL_HOURS || 168);
  const safeHours = Number.isFinite(configuredHours) ? Math.min(720, Math.max(1, configuredHours)) : 168;
  return safeHours * 60 * 60 * 1e3;
};
var buildEmailDownloadUrl = (token) => `${getAppUrl()}/api/downloads/email?token=${encodeURIComponent(token)}`;
var buildInvoiceDownloadUrl = (token) => `${getAppUrl()}/api/invoices/email?token=${encodeURIComponent(token)}`;
async function buildInvoicePdf(order) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const height = page.getHeight();
  const margin = 42;
  const ink = rgb(0.09, 0.11, 0.17);
  const muted = rgb(0.39, 0.42, 0.5);
  const line = rgb(0.88, 0.89, 0.93);
  const purple = rgb(0.31, 0.25, 0.74);
  const purpleLight = rgb(0.96, 0.95, 1);
  const green = rgb(0.02, 0.55, 0.34);
  const drawText = (value, x, y2, size = 9, font = regular, color = ink) => page.drawText(toPdfText(value), { x, y: y2, size, font, color });
  const drawRight = (value, right, y2, size = 9, font = regular, color = ink) => {
    const text = toPdfText(value);
    drawText(text, right - font.widthOfTextAtSize(text, size), y2, size, font, color);
  };
  const businessName = process.env.INVOICE_BUSINESS_NAME || "FreeFireShop";
  const supportEmail = process.env.INVOICE_SUPPORT_EMAIL || "support@yourdomain.com";
  const businessAddress = process.env.INVOICE_BUSINESS_ADDRESS || "Digital Products Store, India";
  const gstin = process.env.INVOICE_GSTIN?.trim();
  const receiptTitle = gstin ? "TAX INVOICE" : "PAYMENT RECEIPT";
  page.drawRectangle({ x: 0, y: height - 116, width, height: 116, color: purple });
  page.drawRectangle({ x: margin, y: height - 82, width: 34, height: 34, color: rgb(1, 1, 1), opacity: 0.16 });
  drawText("FS", margin + 9, height - 71, 12, bold, rgb(1, 1, 1));
  drawText(businessName, margin + 46, height - 62, 18, bold, rgb(1, 1, 1));
  drawText("DIGITAL PRODUCTS & SERVICES", margin + 46, height - 78, 7.5, bold, rgb(0.85, 0.83, 1));
  drawRight(receiptTitle, width - margin, height - 62, 15, bold, rgb(1, 1, 1));
  drawRight("PAID", width - margin, height - 84, 9, bold, rgb(0.77, 1, 0.88));
  let y = height - 148;
  const orderNumber = order.orderNumber || order.id || "N/A";
  const orderDate = order.updatedAt || order.createdAt || (/* @__PURE__ */ new Date()).toISOString();
  const formattedDate = new Date(orderDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  page.drawRectangle({ x: margin, y: y - 84, width: 244, height: 92, color: rgb(0.98, 0.98, 0.99), borderColor: line, borderWidth: 1 });
  drawText("BILLED TO", margin + 14, y - 12, 8, bold, purple);
  drawText(order.customer?.fullName || order.customerName || "Customer", margin + 14, y - 31, 11, bold);
  drawText(order.customer?.email || order.customerEmail || "", margin + 14, y - 48, 8.5, regular, muted);
  drawText(order.customer?.phone || order.customer?.country || "India", margin + 14, y - 64, 8.5, regular, muted);
  const orderCardX = width - margin - 244;
  page.drawRectangle({ x: orderCardX, y: y - 84, width: 244, height: 92, color: purpleLight, borderColor: rgb(0.86, 0.84, 0.98), borderWidth: 1 });
  drawText("ORDER DETAILS", orderCardX + 14, y - 12, 8, bold, purple);
  drawText("Order ID", orderCardX + 14, y - 31, 8, regular, muted);
  drawRight(orderNumber, orderCardX + 230, y - 31, 8.5, bold);
  drawText("Date", orderCardX + 14, y - 48, 8, regular, muted);
  drawRight(formattedDate.slice(0, 22), orderCardX + 230, y - 48, 8, regular);
  drawText("Transaction", orderCardX + 14, y - 65, 8, regular, muted);
  drawRight(String(order.transactionId || order.paymentId || "N/A").slice(0, 24), orderCardX + 230, y - 65, 8, regular);
  y -= 120;
  page.drawRectangle({ x: margin, y: y - 8, width: width - margin * 2, height: 29, color: ink });
  drawText("ITEM DESCRIPTION", margin + 12, y + 2, 8, bold, rgb(1, 1, 1));
  drawText("QTY", 348, y + 2, 8, bold, rgb(1, 1, 1));
  drawText("UNIT PRICE", 392, y + 2, 8, bold, rgb(1, 1, 1));
  drawText("AMOUNT", 493, y + 2, 8, bold, rgb(1, 1, 1));
  y -= 31;
  for (const item of order.items || []) {
    const title = toPdfText(item.productTitle || item.title || item.productId || "Digital Product").slice(0, 45);
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.price || 0);
    const amount = unitPrice * quantity;
    drawText(title, margin + 12, y, 9.5, bold);
    drawText(`ID: ${String(item.productId || "digital-product").slice(0, 36)}`, margin + 12, y - 14, 7.5, regular, muted);
    drawText(String(quantity), 353, y - 2, 9, regular);
    drawRight(money(unitPrice), 468, y - 2, 8.5, regular);
    drawRight(money(amount), width - margin - 10, y - 2, 8.5, bold);
    y -= 36;
    page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: width - margin, y: y + 10 }, thickness: 0.7, color: line });
  }
  y -= 3;
  const totals = [
    ["Subtotal", money(order.subtotal)],
    ["Discount", Number(order.discount || 0) > 0 ? `- ${money(order.discount)}` : money(0)],
    ["Tax", money(order.tax)]
  ];
  for (const [label, value] of totals) {
    drawText(label, 375, y, 8.5, regular, muted);
    drawRight(value, width - margin - 10, y, 8.5, regular);
    y -= 17;
  }
  page.drawRectangle({ x: 363, y: y - 9, width: width - margin - 363, height: 31, color: purple });
  drawText("TOTAL PAID", 375, y + 2, 9, bold, rgb(1, 1, 1));
  drawRight(money(order.total ?? order.amount), width - margin - 10, y + 2, 10, bold, rgb(1, 1, 1));
  const termsY = Math.min(y - 72, 286);
  page.drawRectangle({ x: margin, y: termsY - 105, width: width - margin * 2, height: 116, color: rgb(0.98, 0.98, 0.99), borderColor: line, borderWidth: 1 });
  drawText("TERMS & CONDITIONS", margin + 14, termsY - 8, 8.5, bold, purple);
  const terms = [
    "1. Digital goods are delivered electronically; no physical item will be shipped.",
    "2. Download links are confidential and must not be shared, resold, or redistributed.",
    "3. Email item links are time-limited and single-use; account download limits still apply.",
    "4. Refunds and support are governed by the Terms & Conditions and Refund Policy on the website."
  ];
  terms.forEach((term, index) => drawText(term, margin + 14, termsY - 29 - index * 17, 7.7, regular, muted));
  drawText(`Payment method: ${order.paymentProvider || order.paymentMethod || "Online payment"}`, margin, 106, 8, regular, muted);
  drawText(`Business: ${businessAddress}`, margin, 91, 8, regular, muted);
  if (gstin) drawText(`GSTIN: ${gstin}`, margin, 76, 8, regular, muted);
  drawText(`Support: ${supportEmail}`, margin, 61, 8, regular, muted);
  page.drawLine({ start: { x: margin, y: 44 }, end: { x: width - margin, y: 44 }, thickness: 0.8, color: line });
  drawText("Computer-generated receipt - no signature required.", margin, 27, 7.5, regular, muted);
  drawRight(`Invoice ${orderNumber}`, width - margin, 27, 7.5, regular, muted);
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
function buildPurchaseEmailHtml(order, links, options = {}) {
  const customerName = escapeHtml(order.customer?.fullName || order.customerName || "Customer");
  const orderNumber = escapeHtml(order.orderNumber || order.id || "");
  const total = escapeHtml(money(order.total ?? order.amount));
  const orderDate = escapeHtml(new Date(order.updatedAt || order.createdAt || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  const supportEmail = escapeHtml(process.env.INVOICE_SUPPORT_EMAIL || "support@yourdomain.com");
  const accountUrl = `${getAppUrl()}/account`;
  const linkRows = links.map((link) => {
    const expiry = new Date(link.expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid #e6e7ec;border-radius:12px;background:#ffffff"><tr>
      <td style="padding:17px 18px"><div style="font-size:15px;font-weight:700;color:#171923">${escapeHtml(link.productTitle)}</div><div style="font-size:12px;color:#747887;margin-top:5px">Secure ZIP package \xB7 One-time download</div></td>
      <td align="right" style="padding:17px 18px"><a href="${escapeHtml(link.downloadUrl)}" style="display:inline-block;background:#5b45d6;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:8px;font-size:13px;font-weight:700">Download Item</a></td>
    </tr><tr><td colspan="2" style="padding:0 18px 14px;font-size:11px;color:#8a8e9d">Link expires ${escapeHtml(expiry)} IST and works once.</td></tr></table>`;
  }).join("");
  const invoiceButton = options.invoiceUrl ? `<a href="${escapeHtml(options.invoiceUrl)}" style="display:inline-block;background:#ffffff;color:#4f3fc0;text-decoration:none;padding:12px 18px;border:1px solid #cfc9f7;border-radius:8px;font-size:13px;font-weight:700;margin:0 8px 8px 0">Download Invoice</a>` : "";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#f3f4f8;font-family:Arial,Helvetica,sans-serif;color:#171923">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent">Payment confirmed. Your order and invoice are ready.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f8"><tr><td align="center" style="padding:30px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(23,25,35,.08)">
        <tr><td style="background:#5546c9;padding:30px 34px;color:#ffffff"><table role="presentation" width="100%"><tr><td><div style="font-size:21px;font-weight:800">FreeFireShop</div><div style="font-size:11px;color:#dcd8ff;margin-top:4px;letter-spacing:1px">DIGITAL PRODUCTS & SERVICES</div></td><td align="right"><span style="display:inline-block;background:#d9fae8;color:#087647;padding:7px 11px;border-radius:99px;font-size:11px;font-weight:800">PAYMENT CONFIRMED</span></td></tr></table></td></tr>
        <tr><td style="padding:34px">
          <h1 style="font-size:25px;line-height:1.25;margin:0 0 12px;color:#171923">Your order is ready</h1>
          <p style="font-size:15px;line-height:1.65;color:#5f6372;margin:0 0 24px">Hi ${customerName}, thank you for your purchase. Your payment was successful and your digital products are ready to download.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6ff;border:1px solid #e3e0fb;border-radius:12px;margin-bottom:26px"><tr>
            <td style="padding:17px"><div style="font-size:10px;color:#77738f;letter-spacing:.7px;font-weight:700">ORDER NUMBER</div><div style="font-size:14px;font-weight:800;margin-top:5px">${orderNumber}</div></td>
            <td style="padding:17px"><div style="font-size:10px;color:#77738f;letter-spacing:.7px;font-weight:700">ORDER DATE</div><div style="font-size:13px;font-weight:700;margin-top:5px">${orderDate} IST</div></td>
            <td align="right" style="padding:17px"><div style="font-size:10px;color:#77738f;letter-spacing:.7px;font-weight:700">TOTAL PAID</div><div style="font-size:15px;font-weight:800;margin-top:5px;color:#4f3fc0">${total}</div></td>
          </tr></table>

          <h2 style="font-size:17px;margin:0 0 6px">Download your order items</h2>
          <p style="font-size:12px;line-height:1.55;color:#747887;margin:0 0 14px">For security, each email link is private, time-limited and can be used once.</p>
          ${linkRows}

          <div style="margin:24px 0;padding:20px;background:#f7f6ff;border-radius:12px">
            <div style="font-size:15px;font-weight:800;margin-bottom:6px">Invoice & account</div>
            <div style="font-size:12px;line-height:1.55;color:#747887;margin-bottom:15px">A PDF invoice is attached to this email. You can also download it securely below.</div>
            ${invoiceButton}<a href="${escapeHtml(accountUrl)}" style="display:inline-block;color:#4f3fc0;text-decoration:none;padding:12px 8px;font-size:13px;font-weight:700">View My Account \u2192</a>
          </div>

          <div style="border-top:1px solid #ececf1;padding-top:22px;margin-top:26px"><div style="font-size:13px;font-weight:800;margin-bottom:10px">Important terms</div>
            <ul style="padding-left:18px;margin:0;color:#686c7b;font-size:11px;line-height:1.7"><li>Digital products are delivered electronically; no physical item will be shipped.</li><li>Links and purchased files are for the purchaser only and must not be shared, resold or redistributed.</li><li>Account download limits continue to apply after an email link is used or expires.</li><li>Refunds and support follow the Terms & Conditions and Refund Policy published on our website.</li></ul>
          </div>
        </td></tr>
        <tr><td style="background:#171923;padding:24px 34px;color:#b9bdc9;font-size:11px;line-height:1.6"><strong style="color:#ffffff">Need help?</strong> Contact <a href="mailto:${supportEmail}" style="color:#c8c1ff">${supportEmail}</a>.<br>Please keep this email private because it contains secure access links.</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}
function buildPurchaseEmailText(order, links, options = {}) {
  const rows = links.map((link) => `${link.productTitle}: ${link.downloadUrl}
Expires: ${new Date(link.expiresAt).toISOString()}`).join("\n\n");
  const invoice = options.invoiceUrl ? `

Download invoice: ${options.invoiceUrl}` : "";
  return `Payment successful

Order: ${order.orderNumber || order.id}
Amount paid: ${money(order.total ?? order.amount)}

Download your order items:
${rows}${invoice}

A PDF invoice is attached. Keep these private links secure. Terms and refund rules are available on our website.`;
}
async function sendPurchaseConfirmationEmail(order, links, options = {}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = String(order.customer?.email || order.customerEmail || "").trim();
  if (!apiKey || !from) {
    return { status: "not_configured", reason: "Resend environment variables are not configured." };
  }
  if (!to) {
    return { status: "failed", reason: "The order does not contain a customer email address." };
  }
  const invoice = await buildInvoicePdf(order);
  const orderNumber = String(order.orderNumber || order.id || "order");
  const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from,
    to,
    subject: `Your order ${orderNumber} is ready`,
    html: buildPurchaseEmailHtml(order, links, options),
    text: buildPurchaseEmailText(order, links, options),
    attachments: [{
      filename: `invoice-${safeOrderNumber}.pdf`,
      content: invoice,
      contentType: "application/pdf"
    }],
    tags: [{ name: "order_id", value: safeOrderNumber || "order" }]
  }, {
    idempotencyKey: `purchase-confirmation/${safeOrderNumber || "order"}`
  });
  if (response.error || !response.data?.id) {
    return { status: "failed", reason: response.error?.message || "Resend did not accept the email." };
  }
  return { status: "sent", emailId: response.data.id };
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
  return crypto4.createHash("sha512").update(data).digest("hex");
};
var getProductCatalog = async () => {
  const databaseProducts = await FirebaseRtdb.getAllProducts();
  return mergeProductCatalog(PRODUCTS, databaseProducts);
};
var verifyEasebuzzHash = (params, salt) => {
  const { hash, status, udf10, udf9, udf8, udf7, udf6, udf5, udf4, udf3, udf2, udf1, email, firstname, productinfo, amount, txnid, key } = params;
  const hashString = `${salt}|${status}|${udf10 || ""}|${udf9 || ""}|${udf8 || ""}|${udf7 || ""}|${udf6 || ""}|${udf5 || ""}|${udf4 || ""}|${udf3 || ""}|${udf2 || ""}|${udf1 || ""}|${email || ""}|${firstname || ""}|${productinfo || ""}|${amount || ""}|${txnid || ""}|${key || ""}`;
  const calculatedHash = easebuzzHash(hashString);
  try {
    return crypto4.timingSafeEqual(Buffer.from(hash || ""), Buffer.from(calculatedHash));
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
    res.json({ success: true, products: await getProductCatalog() });
  } catch {
    res.json({ success: true, products: mergeProductCatalog(PRODUCTS, []) });
  }
});
app.get("/api/products/:slugOrId", async (req, res) => {
  try {
    const identifier = req.params.slugOrId.toLowerCase();
    const list = await getProductCatalog();
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
    const productList = await getProductCatalog();
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
      validatedItems.push({
        productId: matchedProduct.id,
        productTitle: matchedProduct.title,
        productSlug: matchedProduct.slug,
        productImage: matchedProduct.image,
        category: matchedProduct.categoryLabel || matchedProduct.category,
        productType: matchedProduct.productType || "DOWNLOAD",
        price: serverPrice,
        quantity,
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
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
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
    const { orderId, agreeTerms } = req.body;
    const userId = req.userId;
    if (!EASEBUZZ_KEY || !EASEBUZZ_SALT) {
      return res.status(503).json({ success: false, message: "Easebuzz payment gateway is not configured yet." });
    }
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }
    if (agreeTerms !== true) {
      return res.status(400).json({ success: false, message: "You must accept the terms before starting payment." });
    }
    const order = await FirebaseRtdb.getUserOrderById(userId, orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (String(order.paymentStatus).toUpperCase() === "PAID") {
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
      order.paymentStatus = "PENDING";
      await FirebaseRtdb.saveGlobalOrder(order);
      res.json({
        success: true,
        accessKey: ebzData.data,
        merchantKey: EASEBUZZ_KEY,
        environment: EASEBUZZ_ENV
      });
    } else {
      res.status(400).json({ success: false, message: ebzData.data || "Failed to initiate Easebuzz payment." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Easebuzz payment initiation failed." });
  }
});
var isOrderFulfilled = async (order) => {
  if (order.fulfillmentStatus === "READY") return true;
  if (!order.userId || !Array.isArray(order.items) || order.items.length === 0) return false;
  const purchases = await FirebaseRtdb.getUserPurchases(order.userId);
  const hasEveryEntitlement = order.items.every((item) => purchases.some((purchase) => purchase.orderId === order.id && purchase.productId === item.productId && purchase.accessStatus === "active"));
  if (hasEveryEntitlement) {
    order.fulfillmentStatus = "READY";
    order.fulfilledAt = order.fulfilledAt || order.updatedAt || (/* @__PURE__ */ new Date()).toISOString();
    await FirebaseRtdb.saveGlobalOrder(order);
  }
  return hasEveryEntitlement;
};
var createPurchaseEmailLinks = async (order) => {
  const createdAt = Date.now();
  const expiresAt = createdAt + getPurchaseEmailLinkTtlMs();
  const links = [];
  const linkedProductIds = /* @__PURE__ */ new Set();
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
      productTitle: item.productTitle || item.productId || "Digital Product",
      createdAt,
      expiresAt,
      used: false
    });
    links.push({
      productId: item.productId,
      productTitle: item.productTitle || item.productId || "Digital Product",
      downloadUrl: buildEmailDownloadUrl(rawToken),
      expiresAt
    });
  }
  return links;
};
var createPurchaseInvoiceLink = async (order) => {
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
    downloadLimit: 10
  });
  return buildInvoiceDownloadUrl(rawToken);
};
var sendPurchaseEmailSafely = async (order) => {
  if (order.emailDelivery?.status === "sent") return;
  const attemptedAt = (/* @__PURE__ */ new Date()).toISOString();
  const previousAttempts = Number(order.emailDelivery?.attempts || 0);
  try {
    if (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim()) {
      order.emailDelivery = {
        status: "not_configured",
        attempts: previousAttempts,
        lastAttemptAt: attemptedAt,
        message: "Resend is not configured."
      };
      await FirebaseRtdb.saveGlobalOrder(order);
      return;
    }
    if (!String(order.customer?.email || order.customerEmail || "").trim()) {
      order.emailDelivery = {
        status: "failed",
        attempts: previousAttempts,
        lastAttemptAt: attemptedAt,
        message: "The order does not contain a customer email address."
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
      ...result.status === "sent" ? { sentAt: attemptedAt, emailId: result.emailId } : {},
      ...result.reason ? { message: result.reason.slice(0, 240) } : {}
    };
    await FirebaseRtdb.saveGlobalOrder(order);
  } catch (error) {
    order.emailDelivery = {
      status: "failed",
      attempts: previousAttempts + 1,
      lastAttemptAt: attemptedAt,
      message: String(error?.message || "Purchase email delivery failed.").slice(0, 240)
    };
    try {
      await FirebaseRtdb.saveGlobalOrder(order);
    } catch {
    }
  }
};
async function verifyAndSyncEasebuzzOrder(orderIdOrTxnId) {
  if (!EASEBUZZ_KEY || !EASEBUZZ_SALT) {
    return { success: false, message: "Easebuzz payment gateway is not configured yet." };
  }
  const globalOrder = await FirebaseRtdb.getGlobalOrder(orderIdOrTxnId);
  if (!globalOrder) {
    return { success: false, message: "Order not found" };
  }
  if (String(globalOrder.paymentStatus).toUpperCase() === "PAID") {
    try {
      if (await isOrderFulfilled(globalOrder)) {
        await sendPurchaseEmailSafely(globalOrder);
      }
    } catch {
    }
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
    globalOrder.paymentStatus = "FAILED";
    globalOrder.orderStatus = "FAILED";
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
  globalOrder.paymentStatus = "PAID";
  globalOrder.orderStatus = "PAID";
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
      fileFormat: item.fileFormat
    });
  }
  await FirebaseRtdb.setUserCart(userId, []);
  globalOrder.fulfillmentStatus = "READY";
  globalOrder.fulfilledAt = now;
  await FirebaseRtdb.saveGlobalOrder(globalOrder);
  await AuditLogger.log({
    requestId: generateRequestId(),
    userId,
    orderId: globalOrder.id,
    eventType: "PAYMENT_VERIFICATION_SUCCESS",
    eventStatus: "SUCCESS",
    source: "EASEBUZZ_CALLBACK",
    metadata: { easebuzzId, amount: expectedAmount }
  });
  await sendPurchaseEmailSafely(globalOrder);
  return { success: true, status: "PAID", orderId: globalOrder.id };
}
app.post("/api/payments/easebuzz/callback", async (req, res) => {
  try {
    if (!EASEBUZZ_KEY || !EASEBUZZ_SALT) {
      return res.status(503).send("Easebuzz payment gateway is not configured yet.");
    }
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
      globalOrder.paymentStatus = "FAILED";
      globalOrder.orderStatus = "FAILED";
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
    const reconciliationOrders = allOrders.filter((order) => {
      const paymentStatus = String(order.paymentStatus).toUpperCase();
      const isStuckPayment = (order.status === "PENDING_PAYMENT" || paymentStatus === "PENDING") && new Date(order.createdAt || order.date || 0).getTime() < tenMinsAgo;
      const lastEmailAttempt = new Date(order.emailDelivery?.lastAttemptAt || 0).getTime();
      const needsEmailRetry = paymentStatus === "PAID" && order.emailDelivery?.status !== "sent" && lastEmailAttempt < tenMinsAgo;
      return isStuckPayment || needsEmailRetry;
    });
    const results = [];
    for (const ord of reconciliationOrders) {
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
      return res.status(403).json({ success: false, message: "Active purchase access not found for this product." });
    }
    if (purchase.downloadCount >= (purchase.downloadLimit || 10)) {
      return res.status(403).json({ success: false, message: "Download limit has been reached for this purchase." });
    }
    const tokenId = `DL-TOK-${crypto4.randomBytes(24).toString("base64url")}`;
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
    const purchases = await FirebaseRtdb.getUserPurchases(tokenData.userId);
    const purchase = purchases.find(
      (p) => (p.purchaseId === tokenData.purchaseId || p.productId === tokenData.productId) && p.accessStatus === "active"
    );
    if (!purchase) {
      return res.status(403).send("Active purchase access not found for this download.");
    }
    const currentCount = purchase.downloadCount || 0;
    const limit = purchase.downloadLimit || 10;
    if (currentCount >= limit) {
      return res.status(403).send("Download limit has been reached for this purchase.");
    }
    const source = await SecureFileManager.openProductFile(tokenData.productId);
    tokenData.used = true;
    await FirebaseRtdb.set(`downloadTokens/${token}`, tokenData);
    purchase.downloadCount = currentCount + 1;
    await FirebaseRtdb.savePurchase(tokenData.userId, purchase.purchaseId, purchase);
    const filename = `${tokenData.productId}-package.zip`;
    SecureFileManager.streamProductFileToResponse(source, filename, res);
  } catch (err) {
    if (!res.headersSent) {
      const isConfigurationError = String(err?.message || "").includes("PRODUCT_DOWNLOAD_URL");
      return res.status(isConfigurationError ? 503 : 502).send(isConfigurationError ? "Product download is not configured yet." : "Product download is temporarily unavailable.");
    }
    res.destroy(err);
  }
});
app.get("/api/downloads/email", async (req, res) => {
  try {
    const rawToken = typeof req.query.token === "string" ? req.query.token : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
      return res.status(400).send("A valid email download token is required.");
    }
    const tokenHash = hashEmailDownloadToken(rawToken);
    const tokenPath = `emailDownloadTokens/${tokenHash}`;
    const tokenData = await FirebaseRtdb.get(tokenPath);
    if (!tokenData) {
      return res.status(403).send("Invalid download link.");
    }
    if (Date.now() > tokenData.expiresAt) {
      await FirebaseRtdb.delete(tokenPath);
      return res.status(403).send("Download link has expired. Sign in to your account to create a new link.");
    }
    if (tokenData.used) {
      return res.status(403).send("Download link has already been used. Sign in to your account to create a new link.");
    }
    const purchases = await FirebaseRtdb.getUserPurchases(tokenData.userId);
    const purchase = purchases.find((candidate) => candidate.purchaseId === tokenData.purchaseId && candidate.orderId === tokenData.orderId && candidate.productId === tokenData.productId && candidate.accessStatus === "active");
    if (!purchase) {
      return res.status(403).send("Active purchase access not found for this download.");
    }
    const currentCount = Number(purchase.downloadCount || 0);
    const limit = Number(purchase.downloadLimit || 10);
    if (currentCount >= limit) {
      return res.status(403).send("Download limit has been reached for this purchase.");
    }
    const source = await SecureFileManager.openProductFile(tokenData.productId);
    tokenData.used = true;
    tokenData.usedAt = (/* @__PURE__ */ new Date()).toISOString();
    await FirebaseRtdb.set(tokenPath, tokenData);
    purchase.downloadCount = currentCount + 1;
    await FirebaseRtdb.savePurchase(tokenData.userId, purchase.purchaseId, purchase);
    SecureFileManager.streamProductFileToResponse(source, `${tokenData.productId}-package.zip`, res);
  } catch (err) {
    if (!res.headersSent) {
      const isConfigurationError = String(err?.message || "").includes("PRODUCT_DOWNLOAD_URL");
      return res.status(isConfigurationError ? 503 : 502).send(isConfigurationError ? "Product download is not configured yet." : "Product download is temporarily unavailable.");
    }
    res.destroy(err);
  }
});
app.get("/api/invoices/email", async (req, res) => {
  try {
    const rawToken = typeof req.query.token === "string" ? req.query.token : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
      return res.status(400).send("A valid invoice token is required.");
    }
    const tokenHash = hashEmailDownloadToken(rawToken);
    const tokenPath = `invoiceDownloadTokens/${tokenHash}`;
    const tokenData = await FirebaseRtdb.get(tokenPath);
    if (!tokenData) {
      return res.status(403).send("Invalid invoice link.");
    }
    if (Date.now() > tokenData.expiresAt) {
      await FirebaseRtdb.delete(tokenPath);
      return res.status(403).send("Invoice link has expired. Sign in to your account to view the order.");
    }
    const currentCount = Number(tokenData.downloadCount || 0);
    const limit = Number(tokenData.downloadLimit || 10);
    if (currentCount >= limit) {
      return res.status(403).send("Invoice download limit has been reached.");
    }
    const order = await FirebaseRtdb.getGlobalOrder(tokenData.orderId);
    if (!order || order.userId !== tokenData.userId || String(order.paymentStatus).toUpperCase() !== "PAID") {
      return res.status(403).send("Paid order not found for this invoice.");
    }
    const invoice = await buildInvoicePdf(order);
    tokenData.downloadCount = currentCount + 1;
    tokenData.lastDownloadedAt = (/* @__PURE__ */ new Date()).toISOString();
    await FirebaseRtdb.set(tokenPath, tokenData);
    const orderNumber = String(order.orderNumber || order.id || "order").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${orderNumber}.pdf"`);
    res.setHeader("Content-Length", invoice.length);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    return res.status(200).send(invoice);
  } catch {
    return res.status(500).send("Invoice is temporarily unavailable.");
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
