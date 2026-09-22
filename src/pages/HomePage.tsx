import React from 'react';
import { ShieldCheck, Zap, RefreshCw, Lock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { SearchBar } from '../components/SearchBar';
import { ProductCard } from '../components/ProductCard';
import { useProductCatalog } from '../hooks/useProductCatalog';

export const HomePage: React.FC = () => {
  const products = useProductCatalog();

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-20 bg-gradient-to-b from-blue-50/70 via-slate-50 to-slate-50 border-b border-slate-200/60">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.12),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Value Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-blue-200/80 shadow-xs text-xs sm:text-sm font-semibold text-blue-700"
            >
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Official Digital Products Store</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.05]"
            >
              Build faster with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700">
                premium assets.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-base sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Verified codebases, authorized digital resources, and lifetime maintenance updates for creators and developers.
            </motion.p>

            {/* Hero Search Bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="pt-2 max-w-2xl mx-auto"
            >
              <SearchBar
                variant="hero"
                placeholder="Search products..."
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Products Grid - 2 Products Per Row (1 Left, 1 Right) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Available Products</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Products
            </h2>
          </div>
          {products.length > 0 && (
            <span className="text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {products.length} Products
            </span>
          )}
        </div>

        {products.length > 0 ? (
          /* 2 items per row */
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Products Listed Yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Jab aap products add karenge, toh wo yahan Homepage par 2-column layout mein show honge.
            </p>
          </div>
        )}
      </section>

      {/* Value Propositions - Asymmetrical Modern Layout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-100 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column: Bold statement */}
          <div className="lg:col-span-4 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
              Store Guarantee
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Direct & Authorized <br className="hidden sm:inline" />Digital Distribution
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
              We focus on absolute legal compliance, certified authenticity, and automated delivery frameworks to offer the highest grade customer checkout experience.
            </p>
          </div>

          {/* Right Column: Custom Interactive Badges */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Box 1 */}
            <div className="p-6 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 transition-colors space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center transition-transform group-hover:scale-105 duration-250">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Authorized Goods</h3>
                <p className="text-xxs sm:text-xs text-slate-500 leading-relaxed font-medium">
                  We only distribute digital products that we are fully authorized to sell, ensuring complete licensing confidence and legal peace of mind.
                </p>
              </div>
            </div>

            {/* Box 2 */}
            <div className="p-6 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 transition-colors space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center transition-transform group-hover:scale-105 duration-250">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Instant Delivery</h3>
                <p className="text-xxs sm:text-xs text-slate-500 leading-relaxed font-medium">
                  Receive instant access to downloadable files, secure tokens, and documentation immediately upon payment verification.
                </p>
              </div>
            </div>

            {/* Box 3 */}
            <div className="p-6 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 transition-colors space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center transition-transform group-hover:scale-105 duration-250">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Maintenance & Updates</h3>
                <p className="text-xxs sm:text-xs text-slate-500 leading-relaxed font-medium">
                  Access maintenance releases, security patches, and future product enhancements directly from your account vault.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
