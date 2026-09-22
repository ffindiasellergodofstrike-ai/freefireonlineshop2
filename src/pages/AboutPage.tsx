import React from 'react';
import {
  ShieldCheck,
  Zap,
  Code2,
  Lock,
  RefreshCw,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AboutPage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          Official Digital Products & Resources
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Direct creator distribution of production-ready digital goods.
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          FFDigital is a focused digital products store providing premium website templates, React templates, SaaS scripts, e-commerce templates, admin/dashboard templates, source code, and developer assets designed for fast, reliable implementation.
        </p>
      </div>

      {/* 3 Pillar Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Authorized Code & Tools</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            All scripts, tools, and downloadable packages are developed or officially authorized by our team, ensuring full licensing compliance.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Instant Electronic Delivery</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Upon successful checkout verification, secure download tokens and account records are generated instantly without delays.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Updates & Maintenance</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Purchases include ongoing maintenance releases and bug fixes accessible directly from your personal account vault.
          </p>
        </div>
      </div>

      {/* Quality Commitments */}
      <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
          Our Operational Commitments
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold">Strict Single-Store Direct Sales</strong>
              We do not aggregate random third-party uploads or unverified marketplace submissions.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold">PCI-DSS Tokenized Payments</strong>
              Payment card credentials never touch our web servers; transactions are processed by certified gateways.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold">Expiring Secure Download Links</strong>
              Digital deliveries are protected with cryptographic tokens, download limits, and account-bound access.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold">Transparent Licensing</strong>
              Clear Standard vs. Extended terms with no recurring subscription surprises or hidden royalties.
            </div>
          </div>
        </div>
      </div>

      {/* Verified Business Profile & Legal Coordinates for Merchant Gateways */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Indian Sole Proprietorship
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Business Entity & Ownership Information
            </h2>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 shrink-0">
            Payment Gateway Merchant Compliance
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-slate-500 font-medium block">Brand Name</span>
            <span className="text-slate-900 font-bold text-base block">FFDigital</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-slate-500 font-medium block">Owner / Proprietor</span>
            <span className="text-slate-900 font-bold text-base block">Prankrishna Das</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-slate-500 font-medium block">Customer Support Phone</span>
            <a href="tel:+919793970031" className="text-blue-600 font-bold text-base block hover:underline">
              +91 9793970031
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-slate-500 font-medium block">Official Support Email</span>
            <a href="mailto:ffdigital.support@gmail.com" className="text-blue-600 font-bold text-sm block hover:underline break-all">
              ffdigital.support@gmail.com
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
            <span className="text-slate-500 font-medium block">Customer Support Timing</span>
            <span className="text-slate-900 font-semibold block">
              Monday to Saturday, 10:00 AM to 6:00 PM IST (Closed Sundays & National Holidays)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 sm:col-span-3 lg:col-span-2">
            <span className="text-slate-500 font-medium block">Registered Office Address</span>
            <p className="text-slate-800 leading-relaxed font-medium">
              House no 417, Near Santosh Tea stall, Labour Chauraha, Shantipuram, Prayagraj, Uttar Pradesh - 211013, India
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 sm:col-span-3 lg:col-span-1">
            <span className="text-slate-500 font-medium block">Permanent Address</span>
            <p className="text-slate-800 leading-relaxed font-medium">
              02 No Takimari, Mantadari, PO: Milanpally, Dist: Jalpaiguri, West Bengal - 735133, India
            </p>
          </div>
        </div>
      </div>

      {/* CTA Box */}
      <div className="p-8 rounded-3xl bg-blue-50 border border-blue-200 text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
          Explore Our Digital Catalog
        </h3>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Browse our authorized scripts, developer utilities, downloadable assets, and starter kits.
        </p>
        <button
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95"
        >
          <span>Browse All Products</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
