import React from 'react';
import { ShoppingCart, Eye, Sparkles, Check, Download, FileCode, Wrench, Video, FolderArchive, Layers, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Product, ProductType } from '../types';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { WishlistButton } from './WishlistButton';
import { useApp } from '../context/AppContext';

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'list' | 'compact';
}

const getTypeIcon = (type: ProductType) => {
  switch (type) {
    case 'SCRIPT':
      return <FileCode className="w-3 h-3 text-blue-600" />;
    case 'TOOL':
      return <Wrench className="w-3 h-3 text-emerald-600" />;
    case 'DOWNLOAD':
      return <Download className="w-3 h-3 text-indigo-600" />;
    case 'VIDEO':
      return <Video className="w-3 h-3 text-amber-600" />;
    case 'RESOURCE':
      return <FolderArchive className="w-3 h-3 text-sky-600" />;
    default:
      return <Layers className="w-3 h-3 text-slate-600" />;
  }
};

const getTypeBadgeStyle = (type: ProductType) => {
  switch (type) {
    case 'SCRIPT':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'TOOL':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'DOWNLOAD':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'VIDEO':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'RESOURCE':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'grid',
}) => {
  const { navigate, addToCart, cartItems } = useApp();
  const isInCart = cartItems.some((i) => i.product.id === product.id);
  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleCardClick = () => {
    navigate('/product/:slug', { slug: product.slug });
  };

  const isList = variant === 'list';

  return (
    <motion.div
      id={`product-card-${product.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={handleCardClick}
      className={`group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-500/50 shadow-xs hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 flex flex-col justify-between overflow-hidden cursor-pointer ${
        isList ? 'md:flex-row md:items-center' : ''
      }`}
    >
      {/* Product Visual Area */}
      <div className={`relative ${isList ? 'md:w-72 shrink-0' : 'w-full'}`}>
        <div className="p-2 sm:p-3 pb-0">
          <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm relative">
            <ProductImage product={product} className="w-full aspect-[16/9] group-hover:scale-105 transition-transform duration-700 ease-out" />
            
            {/* Floating Discount Badge - TOP-LEFT */}
            {discountPercent > 0 && (
              <div className="absolute top-2 left-2 z-10">
                <span className="text-[9px] font-black px-2 py-0.5 sm:py-1 rounded bg-red-500 text-white shadow-sm tracking-wider uppercase">
                  {discountPercent}% OFF
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Floating Wishlist Button */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <WishlistButton product={product} size="sm" />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base md:text-lg leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1 sm:mb-1.5 tracking-tight">
            {product.title}
          </h3>

          {/* Short Description */}
          <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2 mb-2 sm:mb-4 leading-relaxed font-medium">
            {product.shortDescription}
          </p>

          {/* Tags Chips */}
          <div className="flex flex-wrap gap-1 mb-3 sm:mb-5">
            {product.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="text-[8px] sm:text-[9.5px] px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold uppercase tracking-wider border border-slate-200/40 truncate max-w-[110px] sm:max-w-[150px]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer: Price & Actions */}
        <div className="pt-2 sm:pt-3 border-t border-slate-100 flex flex-col gap-2">
          {/* Price line */}
          <div className="flex items-center justify-between gap-1">
            <Price price={product.price} originalPrice={product.originalPrice} size="sm" showDiscountBadge={false} />
            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">Digital Delivery</span>
          </div>

          {/* Centered Buy Now Button */}
          <button
            id={`buy-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isInCart) {
                addToCart(product, 1);
              }
              navigate('/checkout');
            }}
            className="w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10"
            aria-label={`Buy ${product.title} now`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
