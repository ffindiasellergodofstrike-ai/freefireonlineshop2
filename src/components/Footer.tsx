import React, { useState } from 'react';
import {
  Flame,
  ShieldCheck,
  Zap,
  RefreshCw,
  Mail,
  CheckCircle2,
  Phone,
  Clock,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export const Footer: React.FC = () => {
  const { navigate } = useApp();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address.');
      return;
    }
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not save your subscription.');
      setSubscribed(true);
      showToast('success', 'Subscribed!', 'Your subscription was saved.');
      setEmail('');
    } catch {
      showToast('error', 'Subscription Failed', 'Could not save your subscription. Please retry.');
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      {/* Top Value Proposition Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-800/20 border border-slate-800/60 hover:border-blue-500/30 transition-all duration-300 shadow-inner group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white tracking-tight">Authorized Digital Goods</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                We only distribute digital products that we are fully authorized to sell, ensuring complete licensing confidence and legal peace of mind.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-800/20 border border-slate-800/60 hover:border-emerald-500/30 transition-all duration-300 shadow-inner group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white tracking-tight">Instant Electronic Delivery</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                Receive instant access to downloadable files, secure tokens, and documentation immediately upon payment verification.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-800/20 border border-slate-800/60 hover:border-purple-500/30 transition-all duration-300 shadow-inner group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 group-hover:scale-105 transition-transform">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white tracking-tight">Maintenance & Updates</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                Access maintenance releases, security patches, and future product enhancements directly from your account vault.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation & Brand Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-5 space-y-4">
            <div
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 cursor-pointer group w-fit"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Flame className="w-5 h-5 text-amber-300 fill-amber-400" />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">
                FF<span className="text-blue-400">Digital</span>
              </span>
            </div>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Official digital products store offering premium website templates, React templates, SaaS scripts, e-commerce templates, and developer assets.
            </p>

            {/* Business Entity Block */}
            <div className="p-4 rounded-2xl bg-slate-850/60 border border-slate-800 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-white font-bold">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Proprietorship: Prankrishna Das</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-slate-300">Registered Address:</strong> House no 417, Near Santosh Tea stall, Labour Chauraha, Shantipuram, Prayagraj, Uttar Pradesh - 211013, India
              </p>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-slate-300">Permanent Address:</strong> 02 No Takimari, Mantadari, PO: Milanpally, Dist: Jalpaiguri, West Bengal - 735133, India
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <span className="flex items-center gap-1 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  ffdigital.support@gmail.com
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  +91 9793970031
                </span>
                <span className="flex items-center gap-1 text-slate-300 w-full mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Mon - Sat, 10:00 AM - 6:00 PM IST
                </span>
              </div>
            </div>

            {/* Newsletter Subscribe */}
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Get Product Updates
              </p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Thank you! Your subscription was saved.</span>
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
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-sm cursor-pointer"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/products')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/search')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Search Store
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/faq')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Help & FAQs
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/account')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  My Account & Orders
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/wishlist')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Saved Wishlist
                </button>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Policy & Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/about')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  About Us & Proprietor Details
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/contact')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Contact & Support
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/refund')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Refund & Replacement Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/policies/cancellation')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Cancellation Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/policies/shipping-delivery')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Shipping & Digital Delivery Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/policies/grievance')}
                  className="hover:text-white transition-colors text-slate-400 hover:underline text-left cursor-pointer"
                >
                  Grievance Redressal Mechanism
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-center sm:text-left">
          © 2026 FFDigital. Owned & Operated by Prankrishna Das. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
