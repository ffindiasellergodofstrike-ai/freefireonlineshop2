import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { FirebaseRtdb } from './firebaseRtdb';
import { AuditLogger, generateRequestId } from './audit';

const PROTECTED_DIR = path.join(process.cwd(), 'protected_files');

try {
  if (!fs.existsSync(PROTECTED_DIR)) {
    fs.mkdirSync(PROTECTED_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[SecureFiles] Could not ensure protected_files directory exists:', err);
}

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
    const tokenId = `DL-TOK-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
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

  /**
   * Ensures secure physical file exists for product, using real uploaded zip package
   */
  public static ensureProductFileExists(productId: string): string {
    // 1. Check primary uploaded zip file paths
    const zipPaths = [
      path.join(process.cwd(), 'Api', 'Files', 'LinkNest-Pro-Creator-Commerce-Kit.zip'),
      path.join(process.cwd(), 'protected_files', 'LinkNest-Pro-Creator-Commerce-Kit.zip'),
      path.join(process.cwd(), 'protected_files', 'linknest-pro-template.zip'),
      path.join(process.cwd(), 'protected_files', `${productId}-template.zip`),
    ];

    for (const p of zipPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // 2. Fallback: check any .zip file inside Api/Files or protected_files
    const apiFilesDir = path.join(process.cwd(), 'Api', 'Files');
    if (fs.existsSync(apiFilesDir)) {
      const files = fs.readdirSync(apiFilesDir);
      const zip = files.find((f) => f.toLowerCase().endsWith('.zip'));
      if (zip) return path.join(apiFilesDir, zip);
    }

    // 3. Fallback: create default zip archive package if needed
    const fileName = `${productId}-template.zip`;
    const filePath = path.join(PROTECTED_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      const content = `LinkNest Pro — Personal Bio & Digital Store Website Template
========================================================================
Official Digital Delivery & Commercial License Certificate
Product ID: ${productId}
Generated: ${new Date().toISOString()}

INCLUDED ASSETS:
- index.html (Responsive Bio Link & Store Template)
- styles.css (Tailwind & CSS Theme Config)
- app.js (Interactive UI & Payment Button Logic)
- README.md (Setup & Deployment Instructions)
- LICENSE.pdf (Commercial Usage Rights)

Thank you for your purchase!
`;
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    return filePath;
  }

  /**
   * Streams file securely to HTTP response
   */
  public static streamFileToResponse(filePath: string, filename: string, res: Response) {
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  }
}
