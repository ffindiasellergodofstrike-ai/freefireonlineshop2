import React, { useState } from 'react';
import { HelpCircle, Search, Mail, MessageSquare } from 'lucide-react';
import { FAQAccordion, FAQItem } from '../components/FAQAccordion';
import { useApp } from '../context/AppContext';

export const FAQPage: React.FC = () => {
  const { navigate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    {
      category: 'Licensing',
      question: 'What is the difference between a Standard License and an Extended License?',
      answer:
        'A Standard License allows you or your client to build 1 single end-product or website that is not charged to end users. An Extended License is required if you are creating a SaaS service where end users pay a recurring subscription, or if you plan to resell the bundled application as part of a larger commercial package.',
    },
    {
      category: 'Downloads',
      question: 'How quickly do I get access to my digital files after payment?',
      answer:
        'Instantly. The moment your transaction completes, you are directed to the secure download vault where your digital package is provisioned. A confirmation backup email is also dispatched immediately.',
    },
    {
      category: 'Technical',
      question: 'Is the source code encrypted or hidden?',
      answer:
        'No. 100% of the source code on FreeFireShop is clean, unencrypted, and human-readable. You can modify any part of the template to fit your specific needs.',
    },
    {
      category: 'Technical',
      question: 'Do I get free future updates?',
      answer:
        'Yes! Every digital purchase includes lifetime free updates. Whenever we release an improved version or fix bugs, you can download the latest version from your dashboard at no extra cost.',
    },
    {
      category: 'General',
      question: 'Can I host LinkNest Pro on my own domain?',
      answer:
        'Absolutely! You can host it on any domain or subdomain using services like Vercel, Netlify, or your own hosting provider.',
    },
    {
      category: 'Payments',
      question: 'What payment methods do you accept?',
      answer:
        'We support all major payment methods including UPI, Credit/Debit Cards, Net Banking, and popular digital wallets to ensure a smooth checkout experience for Indian users.',
    },
    {
      category: 'Technical',
      question: 'Do I need a database for LinkNest Pro?',
      answer:
        'No. LinkNest Pro is a pure HTML/CSS/JS template designed for speed and simplicity. It does not require a complex database backend, making it ultra-fast and easy to host.',
    },
    {
      category: 'Security',
      question: 'Is my payment information secure?',
      answer:
        'Yes, all payments are processed through industry-standard secure payment gateways with 256-bit SSL encryption. We do not store your credit card or bank details on our servers.',
    },
    {
      category: 'General',
      question: 'How do I contact support if I have issues?',
      answer:
        'You can reach out to us via our Contact Page or email us directly. We usually respond to technical support queries within 24-48 hours.',
    },
    {
      category: 'Licensing',
      question: 'Is there a commercial license included?',
      answer:
        'Yes, every purchase includes a commercial usage license that allows you to use the template for your personal brand or a single client project.',
    },
    {
      category: 'Technical',
      question: 'Can I change the colors and fonts?',
      answer:
        'Yes, the template is built with Tailwind CSS, making it extremely easy to customize colors, fonts, and layouts to match your brand identity.',
    },
    {
      category: 'Refunds',
      question: 'What is your refund policy?',
      answer:
        'As this is a digital downloadable product, we generally do not offer refunds once the files have been accessed. However, if there is a technical defect we cannot fix, we will evaluate refund requests on a case-by-case basis.',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesQuery =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
          <HelpCircle className="w-3.5 h-3.5" />
          Knowledge Base
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Find answers regarding commercial software licensing, digital delivery, version upgrades, and technical support.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto pt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search FAQs (e.g. license, refund, PHP version)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
        {['all', 'Licensing', 'Downloads', 'Technical', 'General', 'Refunds'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors capitalize ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'all' ? 'All Questions' : cat}
          </button>
        ))}
      </div>

      {/* Accordion Component */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No questions match "{searchQuery}". Try another keyword or submit a ticket to our support team.
          </div>
        ) : (
          <FAQAccordion items={filteredFaqs} allowMultiple />
        )}
      </div>

      {/* Still Have Questions CTA */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-center space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Still have questions?</h3>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Our technical support engineers are on standby to answer any pre-sale architectural or licensing questions.
        </p>
        <button
          onClick={() => navigate('/contact')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          Contact Customer Support Desk
        </button>
      </div>
    </div>
  );
};
