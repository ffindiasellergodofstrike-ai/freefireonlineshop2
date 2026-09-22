import { PRODUCTS, CATEGORIES, COUPONS } from '../data/products';
import { Product, Category, Coupon, ProductType } from '../types';

export interface ProductFilters {
  category?: string;
  productType?: ProductType;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'popular' | 'newest' | 'price-low' | 'price-high' | 'rating' | 'featured';
  tag?: string;
}

export class ProductService {
  static getAllProducts(): Product[] {
    return [...PRODUCTS];
  }

  static getProductBySlug(slug: string): Product | undefined {
    return PRODUCTS.find((p) => p.slug.toLowerCase() === slug.toLowerCase());
  }

  static getProductById(id: string): Product | undefined {
    return PRODUCTS.find((p) => p.id === id);
  }

  static getFeaturedProducts(): Product[] {
    return PRODUCTS.filter((p) => p.isFeatured);
  }

  static getRecentProducts(): Product[] {
    return [...PRODUCTS].sort((a, b) => {
      const dateA = a.updatedAt || a.releasedAt ? new Date(a.updatedAt || a.releasedAt!).getTime() : 0;
      const dateB = b.updatedAt || b.releasedAt ? new Date(b.updatedAt || b.releasedAt!).getTime() : 0;
      return dateB - dateA;
    });
  }

  static getProductsByCategory(categorySlug: string): Product[] {
    if (categorySlug === 'all') return this.getAllProducts();
    return PRODUCTS.filter((p) => p.category === categorySlug);
  }

  static getProductsByType(type: ProductType): Product[] {
    return PRODUCTS.filter((p) => p.productType === type);
  }

  static getCategories(): Category[] {
    return [...CATEGORIES];
  }

  static getCategoryBySlug(slug: string): Category | undefined {
    return CATEGORIES.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
  }

  static getRelatedProducts(productId: string, limit = 3): Product[] {
    const current = this.getProductById(productId);
    if (!current) return PRODUCTS.slice(0, limit);
    return PRODUCTS.filter(
      (p) => p.id !== productId && (p.category === current.category || p.productType === current.productType || p.tags.some((t) => current.tags.includes(t)))
    ).slice(0, limit);
  }

  static searchProducts(filters: ProductFilters): { products: Product[]; total: number } {
    let list = [...PRODUCTS];

    // Search query matching title, description, category, tags
    if (filters.query && filters.query.trim() !== '') {
      const q = filters.query.toLowerCase().trim();
      list = list.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const descMatch = p.description.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q);
        const catMatch = p.category.toLowerCase().includes(q) || p.categoryLabel.toLowerCase().includes(q);
        const tagsMatch = p.tags.some((t) => t.toLowerCase().includes(q));
        const typeMatch = p.productType.toLowerCase().includes(q);
        return titleMatch || descMatch || catMatch || tagsMatch || typeMatch;
      });
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      list = list.filter((p) => p.category === filters.category);
    }

    // Product Type filter
    if (filters.productType) {
      list = list.filter((p) => p.productType === filters.productType);
    }

    // Tag filter
    if (filters.tag) {
      list = list.filter((p) => p.tags.includes(filters.tag!));
    }

    // Price range
    if (filters.minPrice !== undefined) {
      list = list.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      list = list.filter((p) => p.price <= filters.maxPrice!);
    }

    // Minimum rating filter
    if (filters.minRating !== undefined && filters.minRating > 0) {
      list = list.filter((p) => (p.rating || 5) >= filters.minRating!);
    }

    // Sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'featured':
        case 'popular':
          list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
          break;
        case 'newest':
          list.sort((a, b) => {
            const dateA = a.updatedAt || a.releasedAt ? new Date(a.updatedAt || a.releasedAt!).getTime() : 0;
            const dateB = b.updatedAt || b.releasedAt ? new Date(b.updatedAt || b.releasedAt!).getTime() : 0;
            return dateB - dateA;
          });
          break;
        case 'price-low':
          list.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          list.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          list.sort((a, b) => (b.rating || 5) - (a.rating || 5));
          break;
        default:
          break;
      }
    }

    return {
      products: list,
      total: list.length,
    };
  }

  static getCoupon(code: string): Coupon | undefined {
    return COUPONS.find((c) => c.code.toUpperCase() === code.toUpperCase().trim());
  }
}
