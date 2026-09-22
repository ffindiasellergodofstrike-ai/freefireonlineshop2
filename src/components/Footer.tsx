import React, { useState } from 'react';
import {
  Flame,
  ShieldCheck,
  Zap,
  RefreshCw,
  Headphones,
  Mail,
  Github,
  Twitter,
  Disc as Discord,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export const Footer: React.FC = () => {
  const { navigate } = useApp();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setSubscribed(true);
      showToast('success', 'Subscribed!', 'You will receive product updates and release notes.');
      setEmail('');
    } else {
      showToast('error', 'Invalid Email', 'Please enter a valid email address.');
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      {/* Top Value Proposition Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-slate-800/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Instant Digital Delivery</h4>
              <p className="text-xs text-slate-400 mt-0.5">Secure file access immediately after payment verification</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Authorized Digital Goods</h4>
              <p className="text-xs text-slate-400 mt-0.5">Direct distribution of authorized digital assets and tools</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Lifetime Updates</h4>
              <p className="text-xs text-slate-400 mt-0.5">Access future version releases and fixes from your account</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Dedicated Support</h4>
              <p className="text-xs text-slate-400 mt-0.5">Prompt technical assistance directly from our support team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation & Brand Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-4 space-y-4">
            <div
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 cursor-pointer group w-fit"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Flame className="w-5 h-5 text-amber-300 fill-amber-400" />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">
                FreeFire<span className="text-blue-400">Shop</span>
              </span>
            </div>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Official digital products store offering authorized scripts, developer utilities, downloadable assets, video walkthroughs, and engineering resources.
            </p>

            {/* Newsletter Subscribe */}
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Get Product Updates
              </p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Thank you for subscribing! Check your inbox for updates.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex items-center gap-2 max-w-md">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email..."
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-sm"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/products')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/search')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Search Store
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/faq')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Help & FAQs
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/account')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  My Account & Orders
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/wishlist')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Saved Wishlist
                </button>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Company & Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/about')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/contact')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/policies/content')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Content Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/refund')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/policies/shipping-delivery')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left"
                >
                  Shipping & Delivery
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Socials */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 FreeFireShop. All rights reserved. Authorized digital products and developer tools.</p>

        <div className="flex items-center gap-4 text-slate-400">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
            aria-label="FreeFireShop GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
            aria-label="FreeFireShop Twitter"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
            aria-label="FreeFireShop Discord"
          >
            <Discord className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
};
