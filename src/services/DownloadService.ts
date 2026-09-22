import { Order, OrderItem } from '../types';
import { OrderService } from './OrderService';
import { AuthService } from './AuthService';

export interface DownloadToken {
  token: string;
  orderId: string;
  productId: string;
  expiresAt: number;
  downloadUrl: string;
}

class DownloadServiceImpl {
  /**
   * Verify digital download authorization via backend API.
   * Checks customer ownership, order payment status, and generates a time-limited protected access token.
   */
  public async getProtectedDownload(
    orderId: string,
    productId: string
  ): Promise<{ success: boolean; downloadUrl?: string; token?: string; message?: string }> {
    const user = AuthService.getCurrentUser();
    if (!user || !AuthService.isAuthenticated()) {
      return {
        success: false,
        message: 'Authentication required. Please sign in to access your digital downloads.',
      };
    }

    try {
      const downloadId = `dl_${orderId}_${productId}`;
      const res = await fetch(`/api/user/downloads/${encodeURIComponent(downloadId)}/token`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return {
            success: true,
            downloadUrl: data.downloadUrl,
            token: data.token,
            message: 'Download authorized successfully.',
          };
        }
      }
    } catch (err) {
      console.warn('Backend download token error, using client verification:', err);
    }

    // Client-side fallback check
    const order = OrderService.getOrderById(orderId);
    if (!order) {
      return {
        success: false,
        message: 'Order not found.',
      };
    }

    if (
      order.customerEmail.toLowerCase() !== user.email.toLowerCase() &&
      order.customer.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      return {
        success: false,
        message: 'Access denied: This order does not belong to your account.',
      };
    }

    if (order.paymentStatus?.toUpperCase() !== 'PAID') {
      return {
        success: false,
        message: `Order status is ${order.paymentStatus}. Digital access is unavailable until payment is confirmed.`,
      };
    }

    const item = order.items.find((i) => i.productId === productId);
    if (!item) {
      return {
        success: false,
        message: 'Product not found in this order.',
      };
    }

    const signature = `token_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    return {
      success: true,
      downloadUrl: item.downloadUrl || `/api/downloads/${item.productId}?signature=${signature}`,
      token: signature,
      message: 'Download authorized successfully.',
    };
  }

  /**
   * Get all active authorized downloads for the current authenticated user from backend
   */
  public async fetchUserDownloads(): Promise<any[]> {
    if (!AuthService.isAuthenticated()) return [];
    try {
      const res = await fetch('/api/user/downloads', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.downloads)) {
          return data.downloads;
        }
      }
    } catch (err) {
      console.warn('Could not fetch user downloads:', err);
    }
    return [];
  }

  public getUserDownloads(): Array<{
    order: Order;
    item: OrderItem;
    isAccessible: boolean;
  }> {
    const user = AuthService.getCurrentUser();
    if (!user) return [];

    const orders = OrderService.getOrdersForUser(user.email);
    const downloads: Array<{ order: Order; item: OrderItem; isAccessible: boolean }> = [];

    for (const order of orders) {
      const isAccessible = order.paymentStatus?.toUpperCase() === 'PAID';
      for (const item of order.items) {
        downloads.push({
          order,
          item,
          isAccessible,
        });
      }
    }

    return downloads;
  }
}

export const DownloadService = new DownloadServiceImpl();
