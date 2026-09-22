import React from 'react';
import {
  FileText,
  RefreshCw,
  Download,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Cookie,
  FileCode,
  Award,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Scale,
  Headphones,
  ArrowRight,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LegalPoliciesPage: React.FC = () => {
  const { navigate } = useApp();

  const categories = [
    {
      title: 'Core Shop Transactions & Support',
      description: 'The foundation rules and help desk structures governing your digital file purchases.',
      policies: [
        {
          title: 'Terms & Conditions',
          subtitle: 'The comprehensive legal framework governing buyer access, accounts, and overall store transactions.',
          slug: 'terms',
          icon: FileText,
          iconBg: 'bg-blue-50/80',
          iconColor: 'text-blue-600',
        },
        {
          title: 'Refund & Cancellation',
          subtitle: 'Clear and legally reasonable terms regarding digital file finality, duplicates, and refunds.',
          slug: 'refund',
          icon: RefreshCw,
          iconBg: 'bg-emerald-50/80',
          iconColor: 'text-emerald-600',
        },
        {
          title: 'Digital Product Delivery',
          subtitle: 'How electronic file provisioning, dashboard downloads, and instant delivery logs operate.',
          slug: 'delivery',
          icon: Download,
          iconBg: 'bg-indigo-50/80',
          iconColor: 'text-indigo-600',
        },
        {
          title: 'Contact & Support',
          subtitle: 'Support hours, operational limits of developer assistance, and help desk ticket procedures.',
          slug: 'contact-support',
          icon: Headphones,
          iconBg: 'bg-purple-50/80',
          iconColor: 'text-purple-600',
        },
      ],
    },
    {
      title: 'Payment & Security Safeguards',
      description: 'Procedures built to eliminate checkout abuse, prevent hacking, and enforce transaction honesty.',
      policies: [
        {
          title: 'Chargeback & Payment Disputes',
          subtitle: 'Strict parameters on payment gate claims, license deactivation, and mandatory pre-dispute contact.',
          slug: 'chargebacks',
          icon: AlertTriangle,
          iconBg: 'bg-amber-50/80',
          iconColor: 'text-amber-600',
        },
        {
          title: 'Fraud Prevention & Abuse',
          subtitle: 'Anti-fraud checks, proxy detection, geolocation scanning, and reporting cyber crime portals.',
          slug: 'fraud',
          icon: ShieldAlert,
          iconBg: 'bg-rose-50/80',
          iconColor: 'text-rose-600',
        },
        {
          title: 'Account & Website Security',
          subtitle: 'Password protection duties, anti-credential sharing locks, and private vulnerability reporting.',
          slug: 'security',
          icon: ShieldCheck,
          iconBg: 'bg-teal-50/80',
          iconColor: 'text-teal-600',
        },
        {
          title: 'Acceptable Use Policy',
          subtitle: 'System regulations prohibiting scrapers, server spam, and illegal product configurations.',
          slug: 'acceptable-use',
          icon: CheckCircle2,
          iconBg: 'bg-slate-50/80',
          iconColor: 'text-slate-600',
        },
      ],
    },
    {
      title: 'Data Protection & Privacy',
      description: 'How we respect your computer footprint, retain order profiles, and encrypt your account session.',
      policies: [
        {
          title: 'Privacy Policy',
          subtitle: 'A transparent legal declaration of collected data, secure gateway safety, and IT Act compliance.',
          slug: 'privacy',
          icon: Lock,
          iconBg: 'bg-violet-50/80',
          iconColor: 'text-violet-600',
        },
        {
          title: 'Cookie Policy',
          subtitle: 'Disclosures detailing our essential first-party cookies for cart and login state preservation.',
          slug: 'cookies',
          icon: Cookie,
          iconBg: 'bg-amber-50/80',
          iconColor: 'text-amber-700',
        },
      ],
    },
    {
      title: 'Intellectual Property & Licensing Compliance',
      description: 'The permissions, copyright claims, and legal limits set on using downloaded source templates.',
      policies: [
        {
          title: 'Intellectual Property & Copyright',
          subtitle: 'Declaring sole proprietor ownership of source files, templates, and Indian Copyright Act protection.',
          slug: 'ip-copyright',
          icon: FileCode,
          iconBg: 'bg-indigo-50/80',
          iconColor: 'text-indigo-600',
        },
        {
          title: 'Digital Product License',
          subtitle: 'The limited commercial usage permissions granted to single-users on purchased scripts.',
          slug: 'license',
          icon: Award,
          iconBg: 'bg-sky-50/80',
          iconColor: 'text-sky-600',
        },
        {
          title: 'Website Disclaimer',
          subtitle: 'Warranty exemptions, third-party libraries notices, and development integration risk disclaimers.',
          slug: 'disclaimer',
          icon: AlertCircle,
          iconBg: 'bg-slate-50/80',
          iconColor: 'text-slate-500',
        },
        {
          title: 'Grievance Redressal',
          subtitle: 'Structured complaint mechanisms, timelines, and appointed Grievance Officer details under IT Rules.',
          slug: 'grievance',
          icon: Scale,
          iconBg: 'bg-amber-50/80',
          iconColor: 'text-amber-800',
        },
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Compliance & Legal Portal</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Trust & Transparency at <span className="text-blue-400">FFDigital</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Explore our complete suite of professional, legally cautious policy frameworks. Built strictly to align with modern digital guidelines and Indian Information Technology laws, detailing your rights and responsibilities.
          </p>
        </div>
      </div>

      {/* Single, Unified Card containing all categories and policy items */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden divide-y divide-slate-100">
        {categories.map((cat, idx) => (
          <div key={idx} className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-blue-600 shrink-0" />
                {cat.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed pl-3.5">
                {cat.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.policies.map((policy, pIdx) => {
                const Icon = policy.icon;
                return (
                  <div
                    key={pIdx}
                    id={`policy-item-${policy.slug}`}
                    onClick={() => navigate(policy.slug === 'terms' || policy.slug === 'privacy' || policy.slug === 'refund' ? `/${policy.slug}` : `/policies/${policy.slug}`)}
                    className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-200 cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl ${policy.iconBg} ${policy.iconColor} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base tracking-tight truncate">
                        {policy.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 leading-normal line-clamp-2">
                        {policy.subtitle}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Compliance Advisory Callout */}
      <div className="bg-slate-100/50 border border-slate-200 rounded-3xl p-6 flex flex-col sm:flex-row items-start gap-4 shadow-xxs">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-2 max-w-4xl">
          <h4 className="text-sm font-bold text-slate-900">Need Immediate Assistance or Redressal?</h4>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            All user operations, digital delivery channels, and transactions are strictly monitored to ensure complete compliance with Indian cyber legislation. If you have questions about licensing terms, need to submit DMCA notices, or require formal dispute resolution, please review our <button onClick={() => navigate('/policies/grievance')} className="text-blue-600 font-bold hover:underline">Grievance Redressal Policy</button> or email us at <strong className="text-slate-900">ffdigital.support@gmail.com</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
