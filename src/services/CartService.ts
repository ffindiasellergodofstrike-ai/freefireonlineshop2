import { CartItem, Product, Coupon } from '../types';
import { ProductService } from './ProductService';
import { AuthService } from './AuthService';

const CART_STORAGE_KEY = 'freefireshop_cart_v1';
const COUPON_STORAGE_KEY = 'freefireshop_coupon_v1';

type CartListener = (cart: CartItem[], coupon: Coupon | null) => void;

class CartServiceImpl {
  private items: CartItem[] = [];
  private appliedCoupon: Coupon | null = null;
  private listeners: Set<CartListener> = new Set();
  private isSyncing = false;

  constructor() {
    this.loadFromStorage();
    // Subscribe to auth changes to sync user-specific cart from Firebase RTDB
    AuthService.subscribe((user) => {
      if (user) {
        this.fetchUserCart();
      } else {
        // Clear private cart on logout
        this.items = [];
        this.appliedCoupon = null;
        this.saveToStorage();
      }
    });
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.items = parsed.map((item: any) => {
          const fresh = ProductService.getProductById(item.product?.id || item.productId) || item.product;
          return {
            ...item,
            product: fresh,
            price: item.licenseType === 'Extended' ? (fresh.extendedPrice || fresh.price * 2.5) : fresh.price,
          };
        });
      }
      const storedCoupon = localStorage.getItem(COUPON_STORAGE_KEY);
      if (storedCoupon) {
        this.appliedCoupon = JSON.parse(storedCoupon);
      }
    } catch {
      this.items = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
      if (this.appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(this.appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable
    }
    this.notify();
    this.syncWithBackend();
  }

  public async fetchUserCart(): Promise<void> {
    if (!AuthService.isAuthenticated() || this.isSyncing) return;
    try {
      this.isSyncing = true;
      const res = await fetch('/api/user/cart', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          this.items = data.items.map((item: any) => {
            const fresh = ProductService.getProductById(item.product?.id || item.productId) || item.product;
            return {
              ...item,
              product: fresh,
              price: item.licenseType === 'Extended' ? (fresh?.extendedPrice || fresh?.price * 2.5) : fresh?.price,
            };
          });
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
          this.notify();
        }
      }
    } catch (err) {
      console.warn('Could not sync user cart from backend:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncWithBackend() {
    if (!AuthService.isAuthenticated() || this.isSyncing) return;
    try {
      await fetch('/api/user/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: this.items }),
      });
    } catch {
      // Silently retry on next action
    }
  }

  public subscribe(listener: CartListener): () => void {
    this.listeners.add(listener);
    listener(this.getItems(), this.appliedCoupon);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const current = this.getItems();
    this.listeners.forEach((l) => l(current, this.appliedCoupon));
  }

  public getItems(): CartItem[] {
    return [...this.items];
  }

  public getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  public addItem(product: Product, licenseType: 'Standard' | 'Extended' = 'Standard', quantity = 1): void {
    const existingIndex = this.items.findIndex(
      (item) => item.product.id === product.id && item.licenseType === licenseType
    );
    const unitPrice = licenseType === 'Extended' ? (product.extendedPrice || product.price * 2.5) : product.price;

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        product,
        licenseType,
        price: unitPrice,
        quantity,
        addedAt: new Date().toISOString(),
      });
    }
    this.saveToStorage();
  }

  public removeItem(productId: string, licenseType: 'Standard' | 'Extended'): void {
    this.items = this.items.filter(
      (item) => !(item.product.id === productId && item.licenseType === licenseType)
    );
    this.saveToStorage();
  }

  public updateQuantity(productId: string, licenseType: 'Standard' | 'Extended', quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId, licenseType);
      return;
    }
    const target = this.items.find(
      (item) => item.product.id === productId && item.licenseType === licenseType
    );
    if (target) {
      target.quantity = quantity;
      this.saveToStorage();
    }
  }

  public clearCart(): void {
    this.items = [];
    this.appliedCoupon = null;
    this.saveToStorage();
  }

  public applyCoupon(code: string): { success: boolean; message: string; coupon?: Coupon } {
    const coupon = ProductService.getCoupon(code);
    if (!coupon) {
      return { success: false, message: 'Invalid promotional code' };
    }
    const subtotal = this.getSubtotal();
    if (coupon.minSpend && subtotal < coupon.minSpend) {
      return {
        success: false,
        message: `This coupon requires a minimum subtotal of $${coupon.minSpend}.00`,
      };
    }
    this.appliedCoupon = coupon;
    this.saveToStorage();
    return {
      success: true,
      message: `Coupon "${coupon.code}" applied: ${coupon.discountPercent}% OFF!`,
      coupon,
    };
  }

  public removeCoupon(): void {
    this.appliedCoupon = null;
    this.saveToStorage();
  }

  public getAppliedCoupon(): Coupon | null {
    return this.appliedCoupon;
  }

  public getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  public getDiscount(): number {
    const subtotal = this.getSubtotal();
    if (!this.appliedCoupon) return 0;
    return Math.round((subtotal * (this.appliedCoupon.discountPercent / 100)) * 100) / 100;
  }

  public getTotals(): { subtotal: number; discount: number; tax: number; total: number } {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const tax = 0;
    const total = Math.max(0, subtotal - discount + tax);
    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }

  public hasItem(productId: string): boolean {
    return this.items.some((item) => item.product.id === productId);
  }
}

export const CartService = new CartServiceImpl();
