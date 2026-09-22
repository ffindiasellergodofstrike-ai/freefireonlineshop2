import { Order, OrderItem, CartItem, Product, OrderStatus, PaymentStatus, DeliveryStatus, DownloadStatus } from '../types';
import { AuthService } from './AuthService';

const ORDERS_STORAGE_KEY = 'freefireshop_orders_v1';

class OrderServiceImpl {
  private orders: Order[] = [];

  constructor() {
    this.loadFromStorage();
    AuthService.subscribe((user) => {
      if (user) {
        this.fetchUserOrders();
      } else {
        this.orders = [];
        this.saveToStorage();
      }
    });
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        this.orders = JSON.parse(stored);
      } else {
        this.orders = [];
      }
    } catch {
      this.orders = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(this.orders));
    } catch {
      // Storage unavailable
    }
  }

  public async fetchUserOrders(): Promise<Order[]> {
    if (!AuthService.isAuthenticated()) return [];
    try {
      const res = await fetch('/api/user/orders', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          this.orders = data.orders;
          this.saveToStorage();
          return this.orders;
        }
      }
    } catch (err) {
      console.warn('Could not fetch user orders from backend:', err);
    }
    return this.orders;
  }

  public async fetchOrderById(orderId: string): Promise<Order | null> {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          return data.order;
        }
      }
    } catch (err) {
      console.warn('Could not fetch order by ID:', err);
    }
    return this.getOrderById(orderId) || null;
  }

  public getOrders(): Order[] {
    return [...this.orders];
  }

  public getOrdersForUser(email?: string): Order[] {
    const user = AuthService.getCurrentUser();
    const effectiveEmail = email || user?.email;
    if (!effectiveEmail) return [...this.orders];
    return this.orders.filter(
      (o) =>
        (o.customer && o.customer.email && o.customer.email.toLowerCase() === effectiveEmail.toLowerCase()) ||
        (o.customerEmail && o.customerEmail.toLowerCase() === effectiveEmail.toLowerCase())
    );
  }

  public getUserOrders(email?: string): Order[] {
    return this.getOrdersForUser(email);
  }

  public getOrderById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id || o.orderNumber === id);
  }

  public getDownloads(): (OrderItem & { product: Product; quantity?: number })[] {
    const map = new Map<string, OrderItem & { product: Product; quantity?: number }>();
    this.orders
      .filter((o) => o.paymentStatus?.toUpperCase() === 'PAID')
      .forEach((o) => {
        o.items.forEach((item) => {
          map.set(item.productId, item);
        });
      });
    return Array.from(map.values());
  }

  public getUserDownloads(email?: string): (OrderItem & { product: Product; quantity?: number })[] {
    const userOrders = this.getOrdersForUser(email);
    const map = new Map<string, OrderItem & { product: Product; quantity?: number }>();
    userOrders
      .filter((o) => o.paymentStatus?.toUpperCase() === 'PAID')
      .forEach((o) => {
        o.items.forEach((item) => {
          map.set(item.productId, item);
        });
      });
    return Array.from(map.values());
  }

  /**
   * Create a pending order on the server
   */
  public async createPendingOrderAsync(
    cartItems: CartItem[],
    customer: { fullName: string; email: string; phone?: string; company?: string; country: string },
    discount = 0,
    discountCode?: string,
    paymentMethod = 'Credit Card'
  ): Promise<Order> {
    if (AuthService.isAuthenticated()) {
      try {
        const res = await fetch('/api/user/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            items: cartItems,
            customer,
            discount,
            discountCode,
            paymentMethod,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.order) {
            this.orders.unshift(data.order);
            this.saveToStorage();
            return data.order;
          }
        }
      } catch (err) {
        console.error('Create order API error, using fallback:', err);
      }
    }

    // Local fallback for offline/guest
    return this.createPendingOrder(cartItems, customer, discount, discountCode, paymentMethod);
  }

  public createPendingOrder(
    cartItems: CartItem[],
    customer: { fullName: string; email: string; phone?: string; company?: string; country: string },
    discount = 0,
    discountCode?: string,
    paymentMethod = 'Credit Card'
  ): Order {
    const orderRandom = Math.floor(1000 + Math.random() * 9000);
    const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const total = Math.max(0, subtotal - discount);

    const items: (OrderItem & { product: Product; quantity?: number })[] = cartItems.map((ci) => {
      return {
        productId: ci.product.id,
        productTitle: ci.product.title,
        productSlug: ci.product.slug,
        productImage: ci.product.image,
        category: ci.product.categoryLabel,
        productType: ci.product.productType,
        price: ci.price,
        quantity: ci.quantity,
        downloadUrl: ci.product.downloadUrl || `/api/downloads/${ci.product.id}`,
        fileSize: ci.product.fileSize || '25.0 MB',
        version: ci.product.version || 'v1.0.0',
        fileFormat: ci.product.fileFormat || 'ZIP',
        downloadStatus: 'UNAVAILABLE' as DownloadStatus,
        product: ci.product,
      };
    });

    const newOrder: Order = {
      id: `ord-${orderRandom}`,
      orderNumber: `FF-2026-${orderRandom}`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      customerEmail: customer.email,
      customerName: customer.fullName,
      status: 'PENDING' as OrderStatus,
      paymentStatus: 'PENDING' as PaymentStatus,
      deliveryStatus: 'PENDING' as DeliveryStatus,
      downloadStatus: 'UNAVAILABLE' as DownloadStatus,
      customer,
      items,
      subtotal,
      discount,
      discountCode,
      tax: 0,
      total,
      paymentMethod,
    };

    this.orders.unshift(newOrder);
    this.saveToStorage();
    return newOrder;
  }

  /**
   * Request a signed, short-lived download token from backend
   */
  public async requestDownloadToken(productId: string): Promise<{ success: boolean; token?: string; downloadUrl?: string; message?: string }> {
    try {
      const res = await fetch(`/api/downloads/${encodeURIComponent(productId)}/token`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          token: data.token,
          downloadUrl: data.downloadUrl,
        };
      }
      return {
        success: false,
        message: data.message || 'Download authorization denied.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error requesting download link.',
      };
    }
  }

  public updateOrderStatus(orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus): Order | null {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    order.status = status;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }
    if (status === 'PAID') {
      order.deliveryStatus = 'DELIVERED';
      order.downloadStatus = 'AVAILABLE';
    } else if (status === 'REFUNDED') {
      order.deliveryStatus = 'REVOKED';
      order.downloadStatus = 'REVOKED';
    }
    this.saveToStorage();
    return order;
  }
}

export const OrderService = new OrderServiceImpl();
