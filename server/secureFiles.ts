import crypto from 'crypto';
import { Readable } from 'stream';
import { Response as ExpressResponse } from 'express';
import { FirebaseRtdb } from './firebaseRtdb';
import { generateRequestId } from './audit';

export interface DownloadTokenData {
  tokenId: string;
  userId: string;
  productId: string;
  productTitle: string;
  orderId: string;
  purchaseId: string;
  expiresAt: number; // Unix timestamp ms
  used: boolean;
  requestId: string;
  ip?: string;
  userAgent?: string;
}

// In-memory token storage + fallback
const downloadTokens = new Map<string, DownloadTokenData>();

export class SecureFileManager {
  /**
   * Generates a short-lived (15 minute) single-use download token
   */
  public static async generateToken(params: {
    userId: string;
    productId: string;
    productTitle: string;
    orderId: string;
    purchaseId: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ token: string; expiresAt: number; downloadUrl: string }> {
    const tokenId = `DL-TOK-${crypto.randomBytes(24).toString('base64url')}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const reqId = params.requestId || generateRequestId();

    const data: DownloadTokenData = {
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
      userAgent: params.userAgent,
    };

    downloadTokens.set(tokenId, data);
    await FirebaseRtdb.set(`downloadTokens/${tokenId}`, data);

    return {
      token: tokenId,
      expiresAt,
      downloadUrl: `/api/downloads/stream?token=${tokenId}`,
    };
  }

  /**
   * Validates and consumes token, returning token data or error message
   */
  public static async validateAndConsumeToken(tokenId: string): Promise<{ valid: boolean; tokenData?: DownloadTokenData; error?: string }> {
    let data = downloadTokens.get(tokenId);
    if (!data) {
      const remoteData = await FirebaseRtdb.get<DownloadTokenData>(`downloadTokens/${tokenId}`);
      if (remoteData) {
        data = remoteData;
        downloadTokens.set(tokenId, data);
      }
    }

    if (!data) {
      return { valid: false, error: 'Invalid or expired download token.' };
    }

    if (Date.now() > data.expiresAt) {
      return { valid: false, error: 'Download link has expired. Please request a new download link.' };
    }

    if (data.used) {
      return { valid: false, error: 'This download link has already been used. Please request a fresh download link.' };
    }

    // Mark used
    data.used = true;
    downloadTokens.set(tokenId, data);
    await FirebaseRtdb.set(`downloadTokens/${tokenId}`, data);

    return { valid: true, tokenData: data };
  }

  public static getProductDownloadEnvironmentKey(productId: string): string {
    const normalizedId = productId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return `PRODUCT_DOWNLOAD_URL_${normalizedId}`;
  }

  /**
   * Opens a server-only object-storage URL. The URL is configured in Vercel and
   * is never returned to the browser.
   */
  public static async fetchProductFile(productId: string): Promise<globalThis.Response> {
    const environmentKey = this.getProductDownloadEnvironmentKey(productId);
    const configuredUrl = process.env[environmentKey] || process.env.PRODUCT_DOWNLOAD_URL;

    if (!configuredUrl) {
      throw new Error(`Download source is not configured. Set ${environmentKey} in Vercel.`);
    }

    let sourceUrl: URL;
    try {
      sourceUrl = new URL(configuredUrl);
    } catch {
      throw new Error(`${environmentKey} must contain a valid HTTPS URL.`);
    }

    if (sourceUrl.protocol !== 'https:') {
      throw new Error(`${environmentKey} must use HTTPS.`);
    }

    const upstream = await fetch(sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok || !upstream.body) {
      throw new Error(`Configured download source returned HTTP ${upstream.status}.`);
    }

    return upstream;
  }

  /**
   * Proxies the configured ZIP through the authenticated API response.
   */
  public static streamProductFileToResponse(upstream: globalThis.Response, filename: string, res: ExpressResponse): void {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const contentLength = upstream.headers.get('content-length');
    const headers: Record<string, string> = {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    };

    if (contentLength && /^\d+$/.test(contentLength)) {
      headers['Content-Length'] = contentLength;
    }

    res.writeHead(200, headers);
    const source = Readable.fromWeb(upstream.body as any);
    source.on('error', (error) => res.destroy(error));
    source.pipe(res);
  }
}
